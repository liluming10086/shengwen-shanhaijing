const base = import.meta.env.BASE_URL;
const pendingScripts = new Map();

export function loadPublicScript(path) {
  const src = base + path.replace(/^\//, '');
  if (pendingScripts.has(src)) return pendingScripts.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="' + src + '"]');
    if (existing?.dataset.loaded === 'true') return resolve();

    const script = existing || document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      pendingScripts.delete(src);
      script.remove();
      reject(new Error('无法加载页面组件：' + path));
    };
    if (!existing) document.head.appendChild(script);
  });

  pendingScripts.set(src, promise);
  return promise;
}
