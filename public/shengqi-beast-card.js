/*!
 * ShengqiBeastCard v1.0 — 声纹山海图 · 异兽资料卡插件
 * ----------------------------------------------------------
 * 零依赖，可直接嵌入任何网页（纯 HTML / React / Vue 均可）。
 * 卡片渲染在 Shadow DOM 中，样式与宿主页面完全隔离，不会互相污染。
 *
 * 用法一（声明式，最简单）：
 *   <div class="shengqi-beast-card">
 *     <script type="application/json">
 *       { "name":"駮", "pinyin":"bó", "image":"beast.png", ... }
 *     </script>
 *   </div>
 *   <script src="shengqi-beast-card.js"></script>
 *
 * 用法二（编程式）：
 *   ShengqiBeastCard.mount('#box', { name:'駮', ... })
 *   → 返回 { el, update(cfg), destroy() }
 *
 * 设计规范：深邃蓝 + 流金 · 毛玻璃 · 卷云角饰 · 声波环
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';

  /* ---------- 默认主题（对齐声纹山海图首页 #2a56af） ---------- */
  var DEFAULT_THEME = {
    deep:    '#0f1c48',   // 页面深蓝（卡片阴影环境色）
    cardTop: 'rgba(38,64,128,.62)',   // 卡片渐变上
    cardBot: 'rgba(17,30,76,.85)',    // 卡片渐变下
    gold:    '#e8c476',
    goldBright: '#f6dd9e',
    goldDim: '#a98a4e',
    ivory:   '#f3efe3',
    soft:    'rgba(240,236,224,.78)'
  };

  var DEFAULTS = {
    image: null,            // 鎏金神兽图（纯黑底最佳，插件会做滤色融合）；null 则显示"图片预留"占位
    imagePlaceholder: '图片预留',
    name: '异兽名称待补充',
    pinyin: '',
    soundTag: '',           // 例："其音如鼓"
    book: '古籍篇目 · 待填写出处',
    num: '',                // 例："兽谱 № 017"，可为空
    fields: [],             // [{label:'记载地点', value:'中曲之山', tone:'gold|lapis|green'}]
    desc: '',
    button: { text: '以方言唤醒', href: '' },   // href 为空则渲染 button，否则渲染 a
    showRings: true,
    showHalo: true,
    maxWidth: 420
  };

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function merge(base, ext) {
    var o = Object.assign({}, base);
    Object.keys(ext || {}).forEach(function (k) {
      if (k === 'theme' && ext.theme) { o.theme = Object.assign({}, base.theme, ext.theme); }
      else if (k === 'button' && ext.button) { o.button = Object.assign({}, base.button, ext.button); }
      else { o[k] = ext[k]; }
    });
    return o;
  }

  var CORNER_SVG =
    '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M6 58 C6 28 28 6 58 6" stroke="var(--sqc-gold)" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M14 58 C14 34 34 14 58 14" stroke="var(--sqc-goldDim)" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M26 40 C26 32 32 27 39 29 C45 31 46 38 41 41 C37 43 33 41 34 37" stroke="var(--sqc-gold)" stroke-width="1.4" stroke-linecap="round"/>' +
    '<circle cx="10" cy="50" r="1.6" fill="var(--sqc-gold)"/></svg>';

  var GHOST_SVG =
    '<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M20 170 C20 100 70 40 150 30 C120 55 105 80 102 112 C99 140 80 158 56 156 C36 154 28 138 38 126" ' +
    'stroke="#2a4a9e" stroke-width="14" stroke-linecap="round"/></svg>';

  /* ---------- 样式 ---------- */
  function buildCSS() {
    return [
      ':host{all:initial;display:block;font-family:"Noto Serif SC","Songti SC","STSong","SimSun",serif;}',
      '*{margin:0;padding:0;box-sizing:border-box;}',
      ':host{--sqc-gold:#e8c476;--sqc-goldBright:#f6dd9e;--sqc-goldDim:#a98a4e;--sqc-ivory:#f3efe3;}',

      '.shell{position:relative;border-radius:22px;padding:1px;max-width:var(--sqc-maxw,420px);margin:0 auto;',
      '  background:linear-gradient(135deg,rgba(232,196,118,.95),rgba(169,138,78,.25) 30%,rgba(246,221,158,.9) 55%,rgba(169,138,78,.3) 80%,rgba(232,196,118,.9));',
      '  background-size:220% 220%;animation:sqc-shimmer 7s ease-in-out infinite;',
      '  box-shadow:0 22px 60px rgba(4,10,32,.55);}',

      '.card{position:relative;border-radius:21px;overflow:hidden;',
      '  background:linear-gradient(160deg,var(--sqc-c1),var(--sqc-c2));',
      '  -webkit-backdrop-filter:blur(20px) saturate(1.25);backdrop-filter:blur(20px) saturate(1.25);}',
      '.ghost{position:absolute;right:-70px;bottom:-70px;width:280px;height:280px;opacity:.09;filter:blur(2px);pointer-events:none;}',
      '.ghost svg{width:100%;height:100%;}',
      '.grain{position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:overlay;',
      '  background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27140%27 height=%27140%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27140%27 height=%27140%27 filter=%27url(%23n)%27/%3E%3C/svg%3E");}',

      '.corner{position:absolute;width:44px;height:44px;z-index:5;pointer-events:none;opacity:.95;}',
      '.corner svg{width:100%;height:100%;display:block;}',
      '.tl{top:8px;left:8px;}.tr{top:8px;right:8px;transform:scaleX(-1);}',
      '.bl{bottom:8px;left:8px;transform:scaleY(-1);}.br{bottom:8px;right:8px;transform:scale(-1,-1);}',

      '.inner{position:relative;padding:30px 24px 26px;}',
      '.tags{display:flex;align-items:center;justify-content:space-between;}',
      '.tag-book{font-size:11px;letter-spacing:.22em;color:var(--sqc-gold);border:1px solid rgba(232,196,118,.55);border-radius:3px;padding:4px 10px 3px;background:rgba(232,196,118,.07);}',
      '.tag-num{font-size:10px;color:var(--sqc-ivory);letter-spacing:.3em;opacity:.6;}',

      '.stage{position:relative;margin:6px -8px 0;display:flex;align-items:center;justify-content:center;min-height:300px;overflow:hidden;}',
      '.stage:before{content:"";position:absolute;width:220px;height:220px;border:1px solid rgba(246,221,158,.22);border-radius:50%;transform:scaleY(var(--sqc-wave-height,1));opacity:var(--sqc-wave-opacity,.35);transition:transform .25s ease,opacity .25s ease;}',
      '.halo{position:absolute;width:250px;height:250px;border-radius:50%;',
      '  background:radial-gradient(circle,rgba(246,221,158,.32) 0%,rgba(232,196,118,.13) 42%,rgba(232,196,118,0) 70%);',
      '  animation:sqc-halo 5s ease-in-out infinite;}',
      '.ring{position:absolute;width:250px;height:250px;border-radius:50%;border:1px solid rgba(232,196,118,.5);animation:sqc-ring 3.6s ease-out infinite;}',
      '.r2{animation-delay:1.2s;}.r3{animation-delay:2.4s;}',

      '.beast{position:relative;width:auto;height:300px;max-width:100%;object-fit:contain;mix-blend-mode:screen;',
      '  transform:scale(var(--sqc-beast-scale,1));transition:transform .3s ease,filter .3s ease;',
      '  filter:brightness(var(--sqc-beast-brightness,1)) drop-shadow(0 4px var(--sqc-beast-glow,12px) rgba(232,196,118,.35));}',
      '.ph{position:relative;width:190px;height:190px;border-radius:50%;display:flex;align-items:center;justify-content:center;',
      '  border:1.5px dashed rgba(232,196,118,.55);color:rgba(232,196,118,.85);font-size:13px;letter-spacing:.3em;',
      '  background:radial-gradient(circle,rgba(232,196,118,.1) 0%,transparent 70%);}',

      '.name-row{display:flex;align-items:baseline;gap:14px;margin-top:2px;}',
      '.name{font-size:52px;font-weight:600;letter-spacing:.08em;line-height:1;color:var(--sqc-ivory);text-shadow:0 0 24px rgba(232,196,118,.35);}',
      '.pinyin{font-size:13px;color:var(--sqc-gold);letter-spacing:.2em;}',
      '.sound-tag{margin-left:auto;font-size:11px;color:var(--sqc-goldBright);border:1px solid rgba(232,196,118,.4);border-radius:999px;padding:4px 12px;letter-spacing:.14em;background:rgba(232,196,118,.06);}',

      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 18px;margin-top:22px;padding-top:20px;',
      '  border-top:1px solid transparent;border-image:linear-gradient(90deg,rgba(232,196,118,.75),rgba(232,196,118,.12)) 1;}',
      '.lb{font-size:10.5px;letter-spacing:.26em;color:var(--sqc-gold);margin-bottom:5px;}',
      '.vl{font-size:13.5px;color:var(--sqc-ivory);letter-spacing:.05em;line-height:1.5;word-break:break-all;}',
      '.vl .tone-lapis{color:#7fa4f0;}.vl .tone-green{color:#2fae8f;}.vl .tone-gold{color:var(--sqc-goldBright);}',

      '.desc{margin-top:20px;font-size:13px;line-height:2;color:var(--sqc-soft);letter-spacing:.06em;text-align:justify;}',
      '.desc em{font-style:normal;color:var(--sqc-goldBright);}',

      '.act{margin-top:24px;display:flex;align-items:center;gap:14px;}',
      '.btn{flex:none;display:inline-flex;align-items:center;gap:8px;font-family:inherit;font-size:13px;letter-spacing:.18em;',
      '  color:#221806;font-weight:600;text-decoration:none;cursor:pointer;',
      '  background:linear-gradient(135deg,var(--sqc-goldBright),var(--sqc-gold) 60%,var(--sqc-goldDim));',
      '  border:none;border-radius:999px;padding:11px 22px 10px;box-shadow:0 4px 18px rgba(232,196,118,.3);}',
      '.bars{display:flex;align-items:flex-end;gap:3px;height:22px;}',
      '.bars i{width:3px;border-radius:2px;background:linear-gradient(to top,var(--sqc-goldDim),var(--sqc-goldBright));animation:sqc-bar 1.1s ease-in-out infinite;}',
      '.bars i:nth-child(1){height:40%;animation-delay:0s;}.bars i:nth-child(2){height:90%;animation-delay:.15s;}',
      '.bars i:nth-child(3){height:60%;animation-delay:.3s;}.bars i:nth-child(4){height:100%;animation-delay:.45s;}',
      '.bars i:nth-child(5){height:50%;animation-delay:.6s;}',
      '.hint{font-size:11px;color:var(--sqc-soft);letter-spacing:.1em;}',

      '@keyframes sqc-shimmer{0%,100%{background-position:0% 0%;}50%{background-position:100% 100%;}}',
      '@keyframes sqc-halo{0%,100%{transform:scale(1);opacity:.9;}50%{transform:scale(1.07);opacity:1;}}',
      '@keyframes sqc-ring{0%{transform:scale(.62);opacity:0;}18%{opacity:.75;}100%{transform:scale(1.18);opacity:0;}}',
      '@keyframes sqc-float{0%,100%{transform:translateY(0);}50%{transform:translateY(-9px);}}',
      '@keyframes sqc-bar{0%,100%{transform:scaleY(.4);}50%{transform:scaleY(1);}}'
    ].join('');
  }

  /* ---------- HTML ---------- */
  function buildHTML(cfg) {
    var h = [];
    h.push('<div class="shell" style="--sqc-maxw:' + (+cfg.maxWidth || 420) + 'px;--sqc-c1:' + cfg.theme.cardTop + ';--sqc-c2:' + cfg.theme.cardBot + '">');
    h.push('<div class="card">');
    h.push('<div class="grain"></div>');
    h.push('<div class="ghost">' + GHOST_SVG + '</div>');
    ['tl', 'tr', 'bl', 'br'].forEach(function (p) {
      h.push('<div class="corner ' + p + '">' + CORNER_SVG + '</div>');
    });
    h.push('<div class="inner">');

    h.push('<div class="tags"><span class="tag-book">' + esc(cfg.book) + '</span>' +
      (cfg.num ? '<span class="tag-num">' + esc(cfg.num) + '</span>' : '') + '</div>');

    // 展台
    h.push('<div class="stage">');
    if (cfg.showHalo) h.push('<div class="halo"></div>');
    if (cfg.showRings) h.push('<div class="ring"></div><div class="ring r2"></div><div class="ring r3"></div>');
    if (cfg.image) h.push('<img class="beast" src="' + esc(cfg.image) + '" alt="' + esc(cfg.name) + '" decoding="async">');
    else h.push('<div class="ph">' + esc(cfg.imagePlaceholder) + '</div>');
    h.push('</div>');

    // 名号
    h.push('<div class="name-row"><span class="name">' + esc(cfg.name) + '</span>' +
      (cfg.pinyin ? '<span class="pinyin">' + esc(cfg.pinyin) + '</span>' : '') +
      (cfg.soundTag ? '<span class="sound-tag">' + esc(cfg.soundTag) + '</span>' : '') +
      '</div>');

    // 信息栏
    if (cfg.fields && cfg.fields.length) {
      h.push('<div class="grid">');
      cfg.fields.forEach(function (f) {
        var tone = f.tone ? '<span class="tone-' + esc(f.tone) + '">' + esc(f.value) + '</span>' : esc(f.value);
        h.push('<div><div class="lb">' + esc(f.label) + '</div><div class="vl">' + tone + '</div></div>');
      });
      h.push('</div>');
    }

    if (cfg.desc) h.push('<p class="desc">' + esc(cfg.desc) + '</p>');

    // 交互条
    if (cfg.button && cfg.button.text) {
      h.push('<div class="act">');
      h.push(cfg.button.href
        ? '<a class="btn" href="' + esc(cfg.button.href) + '"><span style="font-size:10px">▶</span>' + esc(cfg.button.text) + '</a>'
        : '<button class="btn" type="button"><span style="font-size:10px">▶</span>' + esc(cfg.button.text) + '</button>');
      h.push('<div class="bars"><i></i><i></i><i></i><i></i><i></i></div>');
      h.push('<span class="hint">朗读中 · 声纹正在成形</span>');
      h.push('</div>');
    }

    h.push('</div></div></div>');
    return h.join('');
  }

  /* ---------- 挂载 ---------- */
  function mount(target, config) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) throw new Error('[ShengqiBeastCard] 未找到挂载目标: ' + target);

    var cfg = merge(DEFAULTS, config || {});
    cfg.theme = merge(DEFAULT_THEME, (config || {}).theme || {});
    // 简化：theme 直接合并进 DEFAULT_THEME
    Object.keys(DEFAULT_THEME).forEach(function (k) { if (!cfg.theme[k]) cfg.theme[k] = DEFAULT_THEME[k]; });

    var root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + buildCSS() + '</style>' + buildHTML(cfg);

    // 主题色以 CSS 变量注入，便于二次定制
    var t = cfg.theme;
    root.host.style.cssText += ';--sqc-gold:' + t.gold + ';--sqc-goldBright:' + t.goldBright +
      ';--sqc-goldDim:' + t.goldDim + ';--sqc-ivory:' + t.ivory + ';';

    // 图片体检：滤色融合要求"纯黑底 + 亮色线稿"。
    // 若四角平均亮度过高（白底/浅底图），screen 混合会整块泛白，提前告警。
    var img = root.querySelector('img.beast');
    if (img) {
      img.addEventListener('load', function () {
        try {
          var cv = document.createElement('canvas');
          var s = 24; cv.width = s; cv.height = s;
          var cx = cv.getContext('2d');
          cx.drawImage(img, 0, 0, s, s);
          var d = cx.getImageData(0, 0, s, s).data;
          var sum = 0, n = 0;
          for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
            var edge = (x < 2 || y < 2 || x >= s - 2 || y >= s - 2);
            if (!edge) continue;
            var i = (y * s + x) * 4;
            sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++;
          }
          var lum = sum / n;
          if (lum > 60) {
            console.warn('[ShengqiBeastCard] 神兽图背景亮度偏高（均值 ' + lum.toFixed(0) +
              '/255）。滤色混合需要"纯黑底+流金线稿"，否则会泛白。请重新生成或预处理图片。');
          }
        } catch (e) { /* 跨域图片无法读像素时静默跳过 */ }
      });
    }

    var api = {
      el: host,
      update: function (next) {
        var c2 = merge(cfg, next || {});
        c2.theme = merge(cfg.theme, (next || {}).theme || {});
        cfg = c2;
        root.innerHTML = '<style>' + buildCSS() + '</style>' + buildHTML(cfg);
        return api;
      },
      destroy: function () { root.innerHTML = ''; return api; }
    };
    return api;
  }

  /* ---------- 声明式自动挂载 ---------- */
  function autoMount() {
    var nodes = document.querySelectorAll('.shengqi-beast-card');
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__sqcMounted) return;
      el.__sqcMounted = true;
      var cfg = {};
      var json = el.querySelector('script[type="application/json"]');
      if (json) {
        try { cfg = JSON.parse(json.textContent); } catch (e) {
          console.error('[ShengqiBeastCard] JSON 配置解析失败', e);
        }
      } else if (el.dataset.config) {
        try { cfg = JSON.parse(el.dataset.config); } catch (e) {
          console.error('[ShengqiBeastCard] data-config 解析失败', e);
        }
      }
      mount(el, cfg);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }

  global.ShengqiBeastCard = { mount: mount, autoMount: autoMount, version: VERSION };
})(window);
