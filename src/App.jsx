import { useState } from 'react';
import homeReference from './assets/home-reference.jpg';

const provinces = ['北京市','天津市','河北省','山西省','内蒙古自治区','辽宁省','吉林省','黑龙江省','上海市','江苏省','浙江省','安徽省','福建省','江西省','山东省','河南省','湖北省','湖南省','广东省','广西壮族自治区','海南省','重庆市','四川省','贵州省','云南省','西藏自治区','陕西省','甘肃省','青海省','宁夏回族自治区','新疆维吾尔自治区','香港特别行政区','澳门特别行政区','台湾省'];
const flow = [['province','选择省份'],['beast','浏览异兽'],['reading','方言朗读'],['result','创意结果']];

export default function App() {
  const [page, setPage] = useState('home');
  const [province, setProvince] = useState('');
  const [message, setMessage] = useState('');
  const go = p => { setPage(p); setMessage(''); window.scrollTo({top:0,behavior:'smooth'}); };
  const home = () => { setProvince(''); go('home'); };
  const back = () => { const i=flow.findIndex(x=>x[0]===page); go(i<=0?'home':flow[i-1][0]); };
  return <div className="shell">
    {page !== 'home' && <header className="header">
      <button className="brand" onClick={home}><span className="seal">声</span><span><b>声纹山海图</b><small>方言朗读 · 山海再创作</small></span></button>
      <nav><button onClick={home}>项目首页</button><button onClick={()=>go('province')}>开始体验</button><span className="tag">● 原型框架</span></nav>
      <button className="mobile" onClick={()=>go('province')}>开始体验 ↗</button>
    </header>}
    {page==='home'?<main>
      <section className="home-reference" aria-label="声纹山海图首页参考图">
        <img src={homeReference} alt="声纹山海图蓝金色首页设计" />
        <button className="image-hotspot hotspot-top" aria-label="开始体验" onClick={()=>go('province')} />
        <button className="image-hotspot hotspot-enter" aria-label="进入体验" onClick={()=>go('province')} />
        <button className="image-hotspot hotspot-about" aria-label="了解项目" onClick={()=>document.getElementById('journey').scrollIntoView({behavior:'smooth'})} />
      </section>
      <section className="journey" id="journey"><div className="section-head"><div><p className="eyebrow">从阅读到再创作</p><h2>一段声音旅程</h2></div><p>首版展示体验结构。内容、分类和创作机制均为待完善模块。</p></div><div className="cards">{flow.map(([id,title],i)=><button key={id} onClick={()=>go(id)}><small>0{i+1}</small><b>{['⌖','◈','〰','✳'][i]}</b><strong>{title}</strong><span>{['以省级行政区作为内容索引。','查看异兽介绍、原文与来源。','朗读入口预留，暂不录音。','展示声音与创意表达预留结构。'][i]}</span><i>↗</i></button>)}</div></section>
      <section className="principle"><b>「</b><span><strong>让每一份想象，都能找到它的来处。</strong><small>古籍出处 · 地方文化来源 · 创作过程说明</small></span><button className="quiet" onClick={()=>go('province')}>开始探索 →</button></section>
    </main>:<main className="experience">
      <div className="topline"><button className="quiet" onClick={back}>← {page==='province'?'返回首页':'上一步'}</button><span className="tag">● 交互原型 · 内容待完善</span></div>
      <div className="steps">{flow.map(([id,label],i)=><button className={page===id?'active':''} key={id} onClick={()=>go(id)}><b>0{i+1}</b>{label}<i/></button>)}</div>
      {page==='province'&&<section className="panel"><Heading step="01 / 04" title={<>从哪里开始<br/><em>你的山海旅程？</em></>} text="选择一个省级行政区作为浏览入口。它是现代内容索引，不代表古籍记载地与现代省界完全对应。"/><div className="form"><label htmlFor="province">选择省份或地区</label><select id="province" value={province} onChange={e=>setProvince(e.target.value)}><option value="">请选择一个浏览入口</option>{provinces.map(p=><option key={p}>{p}</option>)}</select><p className="note">ⓘ 当前为原型阶段，省份与异兽的对应资料尚未核验。选择仅用于体验页面流程。</p>{message&&<p className="error">{message}</p>}<button className="primary full" onClick={()=>province?go('beast'):setMessage('请先选择一个浏览入口。')}>浏览内容框架 →</button><button className="link" onClick={()=>go('beast')}>跳过选择，查看异兽资料模板</button></div></section>}
      {page==='beast'&&<section className="panel"><Heading step={'02 / 04 · '+(province||'省份待选择')} title={<>山海异兽<br/><em>资料卡框架</em></>} text="此处预留异兽图片、原文描述和地理关联说明。待团队核验资料后补充具体内容。"/><div className="beast"><div className="image-slot"><b>◈</b><span>异兽图片预留位置</span><small>图片素材及使用来源待补充</small></div><div className="details"><small>● 资料模板 · 待核验</small><h2>异兽名称待补充</h2><p>保留原典特征 · 探索当代表达</p>{[['古籍篇目','待填写出处'],['原文片段','待补充并核验原文'],['记载地点','待填写；存疑处注明待考'],['省份关联','待说明依据，不作默认对应'],['地方文化','待补来源与核验记录']].map(([a,b])=><div className="row" key={a}><span>{a}</span><b>{b}</b></div>)}<button className="primary full" onClick={()=>go('reading')}>前往朗读体验 →</button></div></div></section>}
      {page==='reading'&&<section className="panel"><Heading step="03 / 04" title={<>读出你的<br/><em>山海回响。</em></>} text="朗读文本、录音说明和声纹识别插件的接入位置。当前版本不会请求麦克风，也不会采集或上传录音。"/><div className="reading"><div className="topline"><span>朗读文本</span><small>待补充</small></div><blockquote>此处放入经过核验的《山海经》原文节选。</blockquote><hr/><p className="caption">篇目、版本与文字校勘说明待补充</p><div className="plugin"><b>〰</b><span><strong>声纹识别插件预留</strong><small>尚未接入 · 本页不会使用麦克风</small></span></div><div className="actions"><button className="outline" onClick={()=>setMessage('朗读播放功能待接入；当前没有音频文件。')}>播放示例音频 ▷</button><button className="primary" onClick={()=>go('result')}>查看结果页样例 →</button></div>{message&&<p className="inline">{message}</p>}<p className="privacy">◇ 未来接入录音时，需说明用途，并由用户选择是否公开播放。</p></div></section>}
      {page==='result'&&<section className="panel"><Heading step="04 / 04" title={<>声音的形状，<br/><em>仍待共同创作。</em></>} text="这里预留分类依据和异兽创意表达。下方为静态界面样例，不是录音识别或生成结果。"/><div className="results"><div className="result"><div className="result-title">声音特征 <small>界面示例</small></div>{[['音高','42%'],['响度','65%'],['节奏','54%'],['音色','32%']].map(([a,b])=><div className="trait" key={a}><span>{a}</span><i><b style={{width:b}}/></i><small>待接入</small></div>)}<p className="caption">图形仅示意布局；无录音数据、分类名称或判断结论。</p></div><div className="result"><div className="result-title">异兽创意表达 <small>图片预留</small></div><div className="creation"><b>山<br/>海</b><strong>创意图像预留位置</strong><span>声音特征 × 地方文化元素<br/>待形成可解释的创作规则</span></div><div className="row"><span>古籍出处 / 地方文化来源</span><b>待补充</b></div></div></div><div className="result-actions"><button className="outline" onClick={()=>go('reading')}>返回朗读页面</button><button className="primary" onClick={()=>{setProvince('');go('province')}}>重新开始 ↻</button></div></section>}
    </main>}
    {page !== 'home' && <footer><button onClick={home}><b>声</b>声纹山海图</button><span>策划构想阶段 · 原型框架</span><span>内容与来源待团队核验</span></footer>}
  </div>;
}
function Heading({step,title,text}){return <div className="heading"><p className="eyebrow">体验 · {step}</p><h1>{title}</h1><p>{text}</p></div>}
