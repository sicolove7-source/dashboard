import fs from 'fs';

async function run() {
  const pagesRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await pagesRes.json();
  const page = pages.find(x => x.id === '6A56CFDD12843FA1D9B74233CAF965E6');

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

  await sendCdp('Runtime.evaluate', {
    expression: `(() => {
      const t = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      t.forEach(x => x.status = 'active');
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(t));

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.endsWith('_settings')) {
          try {
            const s = JSON.parse(localStorage.getItem(k));
            if (s && s.status === 'suspended') {
              s.status = 'active';
              localStorage.setItem(k, JSON.stringify(s));
            }
          } catch(e) {}
        }
      }
      return true;
    })()`
  });

  await sendCdp('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4000));

  const { data } = await sendCdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/48_dashboard_reactivated_clean.png', Buffer.from(data, 'base64'));
  console.log('Saved: 48_dashboard_reactivated_clean.png');

  ws.close();
}

run().catch(console.error);
