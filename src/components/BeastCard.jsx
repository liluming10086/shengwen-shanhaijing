import { useEffect, useRef } from 'react';

const base = import.meta.env.BASE_URL;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const map = (value, min, max, low, high) => low + (clamp(value, min, max) - min) / (max - min) * (high - low);

export default function BeastCard({ beast, liveFeatures }) {
  const host = useRef(null);

  useEffect(() => {
    if (!host.current || !window.ShengqiBeastCard) return undefined;
    const config = {
      name: beast.name,
      pinyin: beast.pinyin,
      num: '兽谱 · ' + String(beast.number).padStart(2, '0'),
      book: beast.book,
      image: base + beast.image.replace(/^\//, ''),
      soundTag: '',
      fields: [
        { label: '古籍记载地点', value: beast.textualLocation },
        { label: '项目浏览关联', value: beast.provinceLabel }
      ],
      desc: '声音特效依据本次朗读的数值变化；不识别说话人身份或方言归属。',
      button: { text: '' },
      showHalo: true,
      showRings: true,
      maxWidth: 520
    };
    const card = window.ShengqiBeastCard.mount(host.current, config);
    return () => card.destroy();
  }, [beast]);

  useEffect(() => {
    if (!host.current) return;
    const features = liveFeatures;
    const hasVoice = Boolean(features && features.rms > 0.003);
    const pitch = hasVoice && features.pitch > 0 ? map(features.pitch, 90, 350, 0.99, 1.035) : 1;
    const brightness = hasVoice && features.spectralCentroid > 0 ? map(features.spectralCentroid, 400, 4200, 1, 1.13) : 1;
    const glow = hasVoice ? map(features.rms, 0, 0.18, 10, 28) : 12;
    const waveHeight = hasVoice ? map(features.zcr || 0, 0.01, 0.24, 0.94, 1.16) : 1;
    const waveOpacity = hasVoice ? map(features.rms, 0, 0.18, 0.22, 0.58) : 0.28;
    host.current.style.setProperty('--sqc-beast-scale', pitch.toFixed(3));
    host.current.style.setProperty('--sqc-beast-brightness', brightness.toFixed(3));
    host.current.style.setProperty('--sqc-beast-glow', glow.toFixed(1) + 'px');
    host.current.style.setProperty('--sqc-wave-height', waveHeight.toFixed(3));
    host.current.style.setProperty('--sqc-wave-opacity', waveOpacity.toFixed(3));
  }, [beast, liveFeatures]);

  return <div className="beast-card-host" ref={host} aria-label={beast.name + '资料卡'} />;
}
