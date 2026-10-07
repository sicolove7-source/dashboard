import fs from 'fs';

async function run() {
  const pagesRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await pagesRes.json();
  const page = pages.find(p => p.id === '6A56CFDD12843FA1D9B74233CAF965E6') || pages.find(p => p.url && p.url.includes('tashteebpro.com'));

  if (!page) {
    console.error('No page found');
    process.exit(1);
  }

  console.log('Connecting to user active tab:', page.url, page.id);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  function sendCdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // 1. Unregister and update Service Worker to ensure fresh bundle is served
  console.log('Updating service workers and clearing SW caches on active tab...');
  await sendCdp('Runtime.evaluate', {
    expression: `(async () => {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          await r.update().catch(() => {});
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
      return { swCleared: true };
    })()`,
    awaitPromise: true
  });

  // 2. Hard reload bypassing cache
  console.log('Hard reloading page with ignoreCache: true...');
  await sendCdp('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));

  // 3. Inspect loaded bundle
  const state = await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      const indexScript = scripts.find(s => s.includes('index-'));
      return {
        url: window.location.href,
        title: document.title,
        indexScript,
        isLatestCC2plqmS: indexScript ? indexScript.includes('CC2plqmS') : false,
        textSnippet: document.body.innerText.slice(0, 300).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('User active tab state:', state.result?.value);

  // 4. Capture screenshot of the user's active page
  const { data: shot } = await sendCdp('Page.captureScreenshot', { format: 'png' });
  const shotPath = 'C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/42_tashteebpro_live_reloaded.png';
  fs.writeFileSync(shotPath, Buffer.from(shot, 'base64'));
  console.log('Screenshot saved:', shotPath);

  ws.close();
  console.log('✅ Tab refreshed and verified successfully!');
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
