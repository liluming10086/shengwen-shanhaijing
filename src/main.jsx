import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './theme.css';
import './features.css';

const base = import.meta.env.BASE_URL;
const scripts = ['vendor/tone.js', 'vendor/meyda.min.js', 'shengqi-beast-card.js', 'voiceprint.js'];
await Promise.all(scripts.map((path) => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = base + path;
  script.onload = resolve;
  script.onerror = () => reject(new Error('无法加载页面组件：' + path));
  document.head.appendChild(script);
})));

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
