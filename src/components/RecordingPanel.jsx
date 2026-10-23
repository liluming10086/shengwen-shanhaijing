import { useEffect, useRef, useState } from 'react';
import { matchDialect } from '../data/dialectEngine.js';
import { classifyVoiceStyle, voiceStyleLabel } from '../data/voiceStyle.js';

const LIMIT_SECONDS = 30;
const defaultFeatures = { pitch: 0, rms: 0, spectralCentroid: 0, zcr: 0 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function RecordingPanel({ beast, province, recording, onRecorded, onComplete, onMusicPause, onMusicResume, onVoiceStyleChange }) {
  const [consent, setConsent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [features, setFeatures] = useState(null);
  const [dialectPreview, setDialectPreview] = useState(null);
  const [voiceStylePreview, setVoiceStylePreview] = useState(null);
  const [error, setError] = useState('');
  const recorder = useRef(null);
  const streamRef = useRef(null);
  const timeoutRef = useRef(null);
  const timerRef = useRef(null);
  const startedAt = useRef(0);
  const lastPaint = useRef(0);
  const lastDialectPaint = useRef(0);
  const styleCandidate = useRef(null);
  const styleCandidateCount = useRef(0);
  const aggregate = useRef({ pitch: 0, rms: 0, spectralCentroid: 0, zcr: 0, count: 0 });
  const pitchSamples = useRef([]);
  const mfccSum = useRef(Array(13).fill(0));
  const recorderFailed = useRef(false);

  const stop = () => {
    window.clearTimeout(timeoutRef.current);
    window.clearInterval(timerRef.current);
    if (window.Voiceprint?.isRunning()) window.Voiceprint.stop();
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
  };

  useEffect(() => () => {
    window.clearTimeout(timeoutRef.current);
    window.clearInterval(timerRef.current);
    if (window.Voiceprint?.isRunning()) window.Voiceprint.stop();
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const start = async () => {
    setError('');
    if (!consent) {
      setError('请先阅读并勾选本地录音说明。');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('当前浏览器不支持麦克风录音，请使用较新的 Chrome、Edge 或 Safari。');
      return;
    }
    if (!window.Voiceprint || !window.Meyda) {
      setError('声音分析组件没有加载成功，请刷新页面后重试。');
      return;
    }
    setBusy(true);
    setVoiceStylePreview(null);
    styleCandidate.current = null;
    styleCandidateCount.current = 0;
    onVoiceStyleChange(null);
    onMusicPause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      aggregate.current = { pitch: 0, rms: 0, spectralCentroid: 0, zcr: 0, count: 0, mfccCount: 0 };
      pitchSamples.current = [];
      mfccSum.current = Array(13).fill(0);
      setFeatures(null);
      setDialectPreview(null);
      setVoiceStylePreview(null);
      lastDialectPaint.current = 0;
      const mimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
        : '';
      const nextRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.current = nextRecorder;
      recorderFailed.current = false;
      const chunks = [];
      nextRecorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      nextRecorder.onerror = () => {
        recorderFailed.current = true;
        setError('录音发生错误。请检查麦克风连接后重试。');
        stop();
      };
      nextRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: nextRecorder.mimeType || 'audio/webm' });
        const duration = Math.min(LIMIT_SECONDS, Math.max(1, (Date.now() - startedAt.current) / 1000));
        const total = aggregate.current;
        const resultFeatures = total.count ? {
          pitch: total.pitch / total.count,
          rms: total.rms / total.count,
          spectralCentroid: total.spectralCentroid / total.count,
          zcr: total.zcr / total.count
        } : features || defaultFeatures;
        const stablePitches = pitchSamples.current;
        const pitchMean = stablePitches.length
          ? stablePitches.reduce((sum, pitch) => sum + pitch, 0) / stablePitches.length
          : resultFeatures.pitch;
        const pitchStd = stablePitches.length
          ? Math.sqrt(stablePitches.reduce((sum, pitch) => sum + (pitch - pitchMean) ** 2, 0) / stablePitches.length)
          : 0;
        const dialectSample = total.count && total.mfccCount && stablePitches.length >= 5 ? {
          pitch: pitchMean,
          pitchStd,
          zcr: resultFeatures.zcr,
          mfcc: mfccSum.current.map((value) => value / total.mfccCount)
        } : null;
        const dialectMatch = matchDialect(dialectSample);
        const voiceStyle = total.count && stablePitches.length >= 5
          ? classifyVoiceStyle({
            pitch: pitchMean,
            pitchStd,
            rms: resultFeatures.rms,
            zcr: resultFeatures.zcr,
            spectralCentroid: resultFeatures.spectralCentroid
          })
          : null;
        window.Voiceprint?.stop();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
        setBusy(false);
        setElapsed(Math.round(duration));
        setFeatures(resultFeatures);
        setVoiceStylePreview(voiceStyle);
        onVoiceStyleChange(voiceStyle?.style || null);
        if (!recorderFailed.current && blob.size) {
          const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
          const safeProvince = province.replace(/[\\/:*?"<>|]/g, '');
          const safeName = beast.name.replace(/[\\/:*?"<>|]/g, '');
          onRecorded({ blob, features: resultFeatures, dialectMatch, voiceStyle, duration, filename: '声纹山海图_' + safeProvince + '_' + safeName + '_朗读.' + ext });
        } else if (!recorderFailed.current) {
          setError('没有录到音频数据，请再试一次。');
        }
        onMusicResume();
      };

      const started = await window.Voiceprint.start({
        stream,
        onFeatures: (next) => {
          const f = next || {};
          if (Number.isFinite(f.rms) && f.rms > 0.003) {
            aggregate.current.pitch += Number.isFinite(f.pitch) && f.pitch > 0 ? f.pitch : 0;
            aggregate.current.rms += f.rms;
            aggregate.current.spectralCentroid += Number.isFinite(f.spectralCentroid) ? f.spectralCentroid : 0;
            aggregate.current.zcr += Number.isFinite(f.zcr) ? f.zcr : 0;
            aggregate.current.count += 1;
            if (Number.isFinite(f.pitch) && f.pitch > 0) pitchSamples.current.push(f.pitch);
            if (Array.isArray(f.mfcc) && f.mfcc.length === 13) {
              aggregate.current.mfccCount += 1;
              f.mfcc.forEach((value, index) => { if (Number.isFinite(value)) mfccSum.current[index] += value; });
            }
          }
          const now = Date.now();
          if (now - lastPaint.current > 200) {
            lastPaint.current = now;
            setFeatures({ pitch: f.pitch || 0, rms: f.rms || 0, spectralCentroid: f.spectralCentroid || 0, zcr: f.zcr || 0 });
          }
          if (now - lastDialectPaint.current > 700) {
            lastDialectPaint.current = now;
            const total = aggregate.current;
            if (total.count >= 20 && pitchSamples.current.length >= 5) {
              const pitchMean = pitchSamples.current.reduce((sum, pitch) => sum + pitch, 0) / pitchSamples.current.length;
              const pitchStd = Math.sqrt(pitchSamples.current.reduce((sum, pitch) => sum + (pitch - pitchMean) ** 2, 0) / pitchSamples.current.length);
              const preview = classifyVoiceStyle({
                pitch: pitchMean,
                pitchStd,
                rms: total.rms / total.count,
                zcr: total.zcr / total.count,
                spectralCentroid: total.spectralCentroid / total.count
              });
              if (preview) {
                if (styleCandidate.current === preview.style) styleCandidateCount.current += 1;
                else {
                  styleCandidate.current = preview.style;
                  styleCandidateCount.current = 1;
                }
                if (styleCandidateCount.current >= 2) {
                  setVoiceStylePreview(preview);
                  onVoiceStyleChange(preview.style);
                }
              }
            }
            if (total.count >= 20 && total.mfccCount >= 20 && pitchSamples.current.length >= 5) {
              const pitchMean = pitchSamples.current.reduce((sum, pitch) => sum + pitch, 0) / pitchSamples.current.length;
              const pitchStd = Math.sqrt(pitchSamples.current.reduce((sum, pitch) => sum + (pitch - pitchMean) ** 2, 0) / pitchSamples.current.length);
              const sample = {
                pitch: pitchMean,
                pitchStd,
                zcr: total.zcr / total.count,
                mfcc: mfccSum.current.map((value) => value / total.mfccCount)
              };
              setDialectPreview(matchDialect(sample));
            }
          }
        },
        onError: (cause) => setError(cause?.message || '声音分析启动失败。')
      });
      if (!started) throw new Error('声音分析启动失败，请检查浏览器权限后重试。');
      startedAt.current = Date.now();
      nextRecorder.start(250);
      setIsRecording(true);
      setBusy(false);
      timerRef.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 200);
      timeoutRef.current = window.setTimeout(stop, LIMIT_SECONDS * 1000);
    } catch (cause) {
      if (window.Voiceprint?.isRunning()) window.Voiceprint.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorder.current = null;
      setIsRecording(false);
      setBusy(false);
      setError(cause?.name === 'NotAllowedError' ? '麦克风权限未获准。你可以允许访问后重试。' : (cause?.message || '无法启动录音，请检查麦克风后重试。'));
      onMusicResume();
    }
  };

  const download = (event) => {
    if (!recording) event.preventDefault();
  };
  const pitch = features?.pitch > 0 ? Math.round(features.pitch) + ' Hz' : '等待朗读';
  const rms = features ? features.rms.toFixed(3) : '—';
  const centroid = features?.spectralCentroid > 0 ? Math.round(features.spectralCentroid) + ' Hz' : '—';
  const zcr = features ? features.zcr.toFixed(3) : '—';
  const level = features ? clamp(features.rms * 480, 4, 100) : 0;

  return <section className="recording-panel">
    <div className="recording-head"><span>本地录音与声音分析</span><small>最长 00:30</small></div>
    <div className={'sound-meter ' + (isRecording ? 'active' : '')} aria-label={isRecording ? '正在分析本次朗读' : '声音分析待开始'} style={{ '--meter-level': level + '%' }}>
      <span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
    </div>
    <div className="live-metrics" aria-live="polite">
      <span><small>音高估计</small><b>{pitch}</b></span><span><small>响度 RMS</small><b>{rms}</b></span><span><small>频谱重心</small><b>{centroid}</b></span><span><small>过零率</small><b>{zcr}</b></span>
    </div>
    <div className="dialect-live" aria-live="polite">
      <small>实时方言模板比较</small>
      <b>{isRecording
        ? (dialectPreview ? (dialectPreview.isUnknown ? '当前片段尚未贴近参考模板' : '当前片段更接近「' + dialectPreview.dialect + '」') : '正在积累朗读样本…')
        : '录音期间滚动比较；停止后生成本次结果'}</b>
    </div>
    <div className="dialect-live voice-style-live" aria-live="polite">
      <small>异兽图像风格 · 实验性判断</small>
      <b>{voiceStyleLabel(voiceStylePreview?.style)}</b>
      <span>{voiceStylePreview
        ? '柔缓线索命中 ' + voiceStylePreview.gentleVotes + '/3：音高偏高、RMS 偏低、过零率较低（纹理代理）。'
        : '需要积累一段清晰朗读后显示；判断不代表方言或说话人身份。'}</span>
    </div>
    <p className="analysis-note">声音特征描述本次录音，不用于识别说话人身份；方言输出只表示它与内置参考模板的近似程度。</p>
    <p className="analysis-note dialect-model-note">方言体验使用原型提供的四组参考数值进行相似度比较，不是经过训练或验证的专业识别模型；朗读内容、口音混合和设备差异都可能影响结果。</p>
    <label className="consent-row"><input type="checkbox" checked={consent} disabled={isRecording || busy} onChange={(event) => setConsent(event.target.checked)} /><span>我同意启用麦克风进行本地分析。录音只保存在当前页面内存中；我可试听，并在点击“下载录音”后保存到设备。网站不会上传或公开录音。</span></label>
    <div className="record-controls">
      {!isRecording
        ? <button className="primary" type="button" disabled={busy} onClick={start}>{busy ? '正在连接麦克风…' : recording ? '重新录音' : '开始朗读并录音'}</button>
        : <button className="stop-record" type="button" onClick={stop}>停止录音</button>}
      <span className="record-time" aria-live="polite">{'00:' + String(Math.min(LIMIT_SECONDS, elapsed)).padStart(2, '0')} / 00:30</span>
      {recording && <a className="download-link" href={recording.url} download={recording.filename} onClick={download}>下载录音</a>}
      {recording && <button className="link" type="button" onClick={onComplete}>查看结果 →</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    {recording && <div className="recording-playback"><label htmlFor="local-recording">试听本地录音</label><audio id="local-recording" controls src={recording.url} /><small>试听不会上传音频；只有点击“下载录音”才会保存文件。</small></div>}
    <p className="privacy">录音最长 30 秒，可提前停止。请在安静环境下朗读；背景音乐会在录音期间暂停。</p>
  </section>;
}
