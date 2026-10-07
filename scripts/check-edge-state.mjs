import fs from 'fs';

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.url && p.url.includes('tashteebpro.com'));
  if (!page) { console.log('No tashteeb page found'); return; }
  console.log('Found page:', page.url);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let nextId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const resVal = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        url: window.location.href,
        keys: Object.keys(localStorage),
        activeUser: localStorage.getItem('active_session_user'),
        tenantUsers: localStorage.getItem('tenant_comp_c_mtyw7mqk_users')
      };
    })()`,
    returnByValue: true
  });
  console.log('Browser State:');
  console.log(JSON.stringify(resVal?.result?.value, null, 2));

  ws.close();
}
run().catch(console.error);
