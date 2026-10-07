import fs from 'fs';

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page' && p.url.includes('tashteebpro.com'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  const send = (method, params = {}) => new Promise(resolve => {
    const id = 777;
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 777) resolve(m.result); };
    ws.send(JSON.stringify({ id, method, params }));
  });

  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const keys = Object.keys(localStorage);
      const res = {};
      for (const k of keys) {
        if (k.includes('users') || k.includes('auth') || k.includes('tenant') || k.includes('registry')) {
          res[k] = localStorage.getItem(k);
        }
      }
      return res;
    })()`,
    returnByValue: true
  });

  console.log('LocalStorage content:');
  for (const [k, v] of Object.entries(r.value || {})) {
    console.log(`\n--- Key: ${k} ---`);
    console.log(v.slice(0, 300));
  }
  ws.close();
}

run().catch(console.error);
