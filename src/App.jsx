import { useEffect, useMemo, useRef, useState } from 'react';
import homeReference from './assets/home-reference.jpg';
import journeyBackground from './assets/backgrounds/journey.jpg';
import provinceBackground from './assets/backgrounds/province.jpg';
import beastBackground from './assets/backgrounds/beast.jpg';
import readingBackground from './assets/backgrounds/reading.jpg';
import resultBackground from './assets/backgrounds/result.jpg';
import beasts from './data/beasts.json';
import BeastCard from './components/BeastCard.jsx';
import RecordingPanel from './components/RecordingPanel.jsx';

const flow = [['province', '选择省份'], ['beast', '浏览异兽'], ['reading', '方言朗读'], ['result', '声音结果']];
const pageBackgrounds = { province: provinceBackground, beast: beastBackground, reading: readingBackground, result: resultBackground };
const base = import.meta.env.BASE_URL;

export default function App() {
  const [page, setPage] = useState('home');
  const [province, setProvince] = useState('');
  const [selectedId, setSelectedId] = useState(beasts[0].id);
  const [recording, setRecording] = useState(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState('');
  const audioRef = useRef(null);
  const resumeMusic = useRef(false);
  const selectedBeast = useMemo(() => beasts.find((item) => item.id === selectedId) || beasts[0], [selectedId]);

  useEffect(() => () => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
  }, [recording?.url]);

  const go = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const home = () => { setProvince(''); go('home'); };
  const back = () => {
    const index = flow.findIndex(([id]) => id === page);
    go(index <= 0 ? 'home' : flow[index - 1][0]);
  };
  const chooseProvince = (value) => {
    setProvince(value);
    const match = beasts.find((item) => item.province === value);
    if (match) setSelectedId(match.id);
  };
  const selectBeast = (item) => {
    setSelectedId(item.id);
    setProvince(item.province);
  };
  const pauseMusicForRecording = () => {
    const audio = audioRef.current;
    resumeMusic.current = Boolean(audio && !audio.paused);
    audio?.pause();
    setMusicPlaying(false);
  };
  const resumeMusicAfterRecording = () => {
    if (resumeMusic.current && audioRef.current) {
      audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => setMusicError('录音结束；如需继续播放，请手动开启背景音乐。'));
    }
    resumeMusic.current = false;
  };
  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setMusicError('');
    if (audio.paused) {
      try { await audio.play(); setMusicPlaying(true); }
      catch { setMusicPlaying(false); setMusicError('浏览器暂时无法播放，请再点一次播放按钮。'); }
    } else {
      audio.pause();
      setMusicPlaying(false);
    }
  };
  const saveRecording = (result) => {
    // The effect above releases the previous object URL when recording.url changes.
    setRecording({ ...result, url: URL.createObjectURL(result.blob) });
  };

  return <div className={'shell ' + (page === 'home' ? '' : 'page-shell')} style={page === 'home' ? undefined : { '--page-background': 'url("' + pageBackgrounds[page] + '")' }}>
    {page !== 'home' && <header className="header">
      <button className="brand" onClick={home}><span className="seal">纹</span><span><b>声纹山海图</b><small>方言朗读 · 山海再创作</small></span></button>
      <nav><button onClick={home}>项目首页</button><button onClick={() => go('province')}>开始体验</button><span className="tag">● 体验原型</span></nav>
      <button className="mobile" onClick={() => go('province')}>开始体验 ↗</button>
    </header>}

    {page === 'home' ? <main>
      <section className="home-reference" aria-label="声纹山海图首页">
        <img src={homeReference} alt="声纹山海图蓝金色山海主题首页" />
        <span className="image-copy-fix brand-seal-fix">纹</span>
        <span className="image-copy-fix brand-title-fix">声纹山海图</span>
        <span className="image-copy-fix project-kicker-fix">PROJECT · 声纹的想象</span>
        <span className="image-copy-fix project-title-fix">声纹的想象</span>
        <button className="image-hotspot hotspot-top" aria-label="开始体验" onClick={() => go('province')} />
        <button className="image-hotspot hotspot-enter" aria-label="进入体验" onClick={() => go('province')} />
        <button className="image-hotspot hotspot-about" aria-label="了解项目" onClick={() => document.getElementById('journey')?.scrollIntoView({ behavior: 'smooth' })} />
      </section>
      <section className="journey" id="journey" style={{ backgroundImage: 'url("' + journeyBackground + '")' }}>
        <div className="journey-content">
          <div className="section-head"><div><p className="eyebrow">从阅读到再创作</p><h2>一段声音旅程</h2></div><p>从选择省份、浏览古籍异兽，到朗读与声音表达。</p></div>
          <div className="cards">{flow.map(([id, title], index) => <button key={id} onClick={() => go(id)}>
            <small>0{index + 1}</small><b>{['⌖', '◈', '〰', '✳'][index]}</b><strong>{title}</strong>
            <span>{['以省级行政区作为浏览入口。', '查看异兽图像、原文和出处。', '本地录音，实时查看声音特征。', '按本次朗读呈现可解释的视觉变化。'][index]}</span><i>↗</i>
          </button>)}</div>
          <p className="journey-note">声音分析在本设备内完成；录音不会上传。省份与异兽为项目浏览关联，待进一步核验。</p>
        </div>
      </section>
      <section className="principle"><b>「</b><span><strong>让每一份想象，都能找到它的来处。</strong><small>古籍出处 · 地方文化来源 · 声音表达依据</small></span><button className="quiet" onClick={() => go('province')}>开始探索 →</button></section>
    </main> : <main className="experience">
      <div className="topline"><button className="quiet" onClick={back}>← {page === 'province' ? '返回首页' : '上一步'}</button><span className="tag">● 声音只在本设备分析</span></div>
      <div className="steps">{flow.map(([id, label], index) => <button className={page === id ? 'active' : ''} key={id} onClick={() => id === 'beast' && !province ? go('province') : go(id)}><b>0{index + 1}</b>{label}<i /></button>)}</div>

      {page === 'province' && <section className="panel">
        <Heading step="01 / 04" title={<>从哪里开始<br /><em>你的山海旅程？</em></>} text="选择一个省级行政区作为浏览入口。这里的省份与异兽是项目内容索引关系，不代表古籍记载地。" />
        <div className="form"><label htmlFor="province">选择省份或地区</label>
          <select id="province" value={province} onChange={(event) => chooseProvince(event.target.value)}><option value="">请选择一个浏览入口</option>{beasts.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}</select>
          <p className="note">所选省份用于浏览关联，古籍记载地点会单独列出。省份关联依据尚待团队核验。</p>
          <button className="primary full" onClick={() => province ? go('beast') : setPage('province')}>{province ? '浏览对应异兽 →' : '请先选择省份'}</button>
          {!province && <p className="form-hint">请选择上方列表中的省份后继续。</p>}
        </div>
      </section>}

      {page === 'beast' && <section className="panel">
        <Heading step={'02 / 04 · ' + (province || selectedBeast.province)} title={<>山海异兽<br /><em>与古籍原文</em></>} text="图集按你提供的原书顺序对应资料条目。省份仅作项目浏览关联，古籍地点和来源状态分别说明。" />
        <div className="beast-browser">
          <div className="beast-grid" aria-label="34 条异兽资料">
            {beasts.map((item) => <button className={item.id === selectedId ? 'selected' : ''} key={item.id} onClick={() => selectBeast(item)} aria-pressed={item.id === selectedId}>
              <img src={base + item.image.replace(/^\//, '')} alt="" loading="lazy" />
              <span className="beast-grid-copy"><small>{item.number.toString().padStart(2, '0')} · {item.provinceLabel}</small><strong>{item.name}</strong><i>待核验</i></span>
            </button>)}
          </div>
          <section className="beast-detail" aria-live="polite">
            <BeastCard beast={selectedBeast} />
            <div className="detail-meta">
              <span><small>项目浏览关联</small><b>{selectedBeast.province} · 待核验</b></span>
              <span><small>古籍记载地点</small><b>{selectedBeast.textualLocation}</b></span>
            </div>
            <details className="source-text"><summary>展开查看原文节选与来源说明</summary><p className="source-citation">{selectedBeast.sourceReference}</p><blockquote>{selectedBeast.excerpt}</blockquote>
              {selectedBeast.sourceNote && <p className="source-note">{selectedBeast.sourceNote}</p>}
              <p className="source-note">资料来自团队提供的《山海经资料》，本条古籍版本、文字校勘和地理对应仍需核验。页面不将待核验内容表述为已证实结论。</p>
            </details>
            <div className="beast-actions"><button className="outline" onClick={() => go('province')}>更换省份入口</button><button className="primary" onClick={() => go('reading')}>朗读这段原文 →</button></div>
          </section>
        </div>
      </section>}

      {page === 'reading' && <section className="panel">
        <Heading step="03 / 04" title={<>读出你的<br /><em>山海回响。</em></>} text="点击授权后开始本地录音与声音特征分析，最长 30 秒。朗读时异兽周边的声波与鎏金光效会随声音轻微变化。" />
        <div className="reading-layout">
          <aside className="reading-art"><BeastCard beast={selectedBeast} liveFeatures={recording?.features} /><p>视觉变化仅表现本次录音特征，不判断说话人身份或方言归属。</p></aside>
          <div className="reading-column">
            <section className="reading-text-card">
              <div className="reading-card-head"><span>朗读文本</span><small>{selectedBeast.name} · {selectedBeast.sourceReference}</small></div>
              <blockquote>{selectedBeast.excerpt}</blockquote>
              <p className="caption">项目浏览关联：{province || selectedBeast.province} · 待核验</p>
            </section>
            <RecordingPanel beast={selectedBeast} province={province || selectedBeast.province} recording={recording} onRecorded={saveRecording} onComplete={() => go('result')} onMusicPause={pauseMusicForRecording} onMusicResume={resumeMusicAfterRecording} />
          </div>
        </div>
      </section>}

      {page === 'result' && <section className="panel">
        <Heading step="04 / 04" title={<>声音留下的<br /><em>本次印记。</em></>} text="以下数值只描述这次录音，并受设备、距离和环境影响；不是个人标签、方言识别或说话人识别。" />
        {recording ? <div className="result-view">
          <BeastCard beast={selectedBeast} liveFeatures={recording.features} />
          <div className="result-metrics"><div className="result-title">本次录音的声音特征 <small>本设备即时分析</small></div>
            <Metric label="音高估计" value={recording.features?.pitch ? Math.round(recording.features.pitch) + ' Hz' : '未检测到稳定音高'} help="依据波形周期估算；停顿和环境声会影响数值。" />
            <Metric label="响度（RMS）" value={recording.features?.rms != null ? recording.features.rms.toFixed(3) : '—'} help="录音波形的平均能量，不表示说话力度或情绪。" />
            <Metric label="频谱重心" value={recording.features?.spectralCentroid ? Math.round(recording.features.spectralCentroid) + ' Hz' : '—'} help="描述频谱能量集中位置，不等同于方言或身份。" />
            <Metric label="过零率" value={recording.features?.zcr != null ? recording.features.zcr.toFixed(3) : '—'} help="波形正负变化比例，作为声音纹理参考。" />
            <p className="caption">视觉规则：音高控制异兽图像的轻微缩放，响度控制流金光晕，频谱重心影响亮度，过零率影响声波纹理。原图轮廓保持不变。</p>
          </div>
          <div className="recorded-audio"><div><strong>本地录音</strong><small>录音未上传，只有你点击下载后才保存到设备。</small></div><audio controls src={recording.url} /><a className="primary" href={recording.url} download={recording.filename}>下载录音</a></div>
          <div className="result-actions"><button className="outline" onClick={() => go('reading')}>返回朗读</button><button className="primary" onClick={() => { setRecording(null); go('province'); }}>重新开始 ↻</button></div>
        </div> : <div className="form"><p className="note">还没有本次录音结果。请先完成朗读和声音分析。</p><button className="primary full" onClick={() => go('reading')}>返回朗读页面 →</button></div>}
      </section>}
    </main>}

    {page !== 'home' && <footer><button onClick={home}><b>纹</b>声纹山海图</button><span>内容按团队资料录入 · 核验状态如实标注</span><a href="https://pixabay.com/music/china-chinese-295886/" target="_blank" rel="noreferrer">配乐：Chinese · Kulakovka / Pixabay</a></footer>}
    <div className="music-player">
      <button type="button" onClick={toggleMusic} aria-pressed={musicPlaying} aria-label={musicPlaying ? '暂停背景音乐' : '播放背景音乐'}><span>{musicPlaying ? 'Ⅱ' : '▶'}</span><span>{musicPlaying ? '暂停音乐' : '播放音乐'}</span></button>
      <audio ref={audioRef} src={base + 'audio/kulakovka-chinese-295886.mp3'} loop preload="none" onError={() => setMusicError('背景音乐暂时无法加载。')} />
      {musicError && <small role="status">{musicError}</small>}
    </div>
  </div>;
}

function Heading({ step, title, text }) {
  return <div className="heading"><p className="eyebrow">体验 · {step}</p><h1>{title}</h1><p>{text}</p></div>;
}

function Metric({ label, value, help }) {
  return <div className="metric"><div><strong>{label}</strong><b>{value}</b></div><small>{help}</small></div>;
}
