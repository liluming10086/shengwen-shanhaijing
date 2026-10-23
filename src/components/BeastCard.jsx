import { useEffect, useRef } from 'react';
import beastVariants from '../data/beastVariants.json';
import { loadPublicScript } from '../utils/loadPublicScript.js';

const base = import.meta.env.BASE_URL;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const map = (value, min, max, low, high) => low + (clamp(value, min, max) - min) / (max - min) * (high - low);

export default function BeastCard({ beast, liveFeatures, voiceStyle }) {
  const host = useRef(null);
  const variantImage = voiceStyle ? beastVariants[beast.id]?.[voiceStyle] : null;
  const imagePath = variantImage || beast.image;
  const imageUrl = base + imagePath.replace(/^\//, '');

  useEffect(() => {
    let cancelled = false;
    let card;
    loadPublicScript('shengqi-beast-card.js').then(() => {
      if (!cancelled && host.current && window.ShengqiBeastCard) {
        const config = {
          name: beast.name,
          pinyin: beast.pinyin,
          num: '兽谱 · ' + String(beast.number).padStart(2, '0'),
          book: beast.book,
          image: imageUrl,
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
        card = window.ShengqiBeastCard.mount(host.current, config);
      }
    }).catch((error) => console.error(error));
    return () => {
      cancelled = true;
      card?.destroy();
    };
  }, [beast]);

  useEffect(() => {
    const image = host.current?.shadowRoot?.querySelector('img.beast');
    if (image && image.src !== new URL(imageUrl, window.location.href).href) {
      image.decoding = 'async';
      image.src = imageUrl;
    }
  }, [beast, imageUrl]);

  useEffect(() => {
    if (!host.current) return;
    const features = liveFeatures;
    const hasVoice = Boolean(features && features.rms > 0.003);
    const brightness = hasVoice && features.spectralCentroid > 0 ? map(features.spectralCentroid, 400, 4200, 1, 1.13) : 1;
    const glow = hasVoice ? map(features.rms, 0, 0.18, 10, 28) : 12;
    const waveHeight = hasVoice ? map(features.zcr || 0, 0.01, 0.24, 0.94, 1.16) : 1;
    const waveOpacity = hasVoice ? map(features.rms, 0, 0.18, 0.22, 0.58) : 0.28;
    host.current.style.setProperty('--sqc-beast-scale', '1');
    host.current.style.setProperty('--sqc-beast-brightness', brightness.toFixed(3));
    host.current.style.setProperty('--sqc-beast-glow', glow.toFixed(1) + 'px');
    host.current.style.setProperty('--sqc-wave-height', waveHeight.toFixed(3));
    host.current.style.setProperty('--sqc-wave-opacity', waveOpacity.toFixed(3));
  }, [beast, liveFeatures]);

  return <div className="beast-card-host" ref={host} aria-label={beast.name + '资料卡'} />;
}
