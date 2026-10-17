# 声纹山海图 · 网站原型

React + Vite 前端框架，用于展示体验流程并标出后续待补充内容。

## 启动

需要 Node.js 20.19+ 或 22.12+。

```powershell
npm install
npm run dev
```

生产预览：

```powershell
npm run build
npm run preview
```

## GitHub Pages 公共发布

仓库设为 Public 后，GitHub Actions 会在每次向 `main` 推送时自动构建并发布网站。发布地址为：

`https://<GitHub用户名>.github.io/shengwen-shanhaijing/`

首次发布时，在 GitHub 仓库 Settings → Pages 中将 Build and deployment 的 Source 设为 GitHub Actions。源码仓库公开后，仓库中的源代码和提交记录也都可被任何人查看。

页面流程：项目首页 → 省份选择 → 异兽资料卡 → 朗读预留 → 结果样例。

## 临时公开预览（备用）

需要重新分享时，先在项目目录运行 `npm run build` 和 `npm run preview`，再在另一个 PowerShell 窗口运行：

```powershell
& 'D:\Tools\cloudflared\cloudflared.exe' tunnel --url 'http://127.0.0.1:4173'
```

Quick Tunnel 会生成新的临时网址；保持预览和隧道两个窗口运行。关机或退出隧道后，临时网址停止访问。

## 当前边界

- 不请求麦克风，不采集或上传录音。
- 声音特征条仅作布局示例，不是识别结果。
- 没有真实异兽、省份对应、古籍原文或地方文化资料，相关位置均待补充/核验。
- 音频、声纹插件和 AI 生成均未接入。
- 主要交互在 `src/App.jsx`，样式在 `src/styles.css`。
