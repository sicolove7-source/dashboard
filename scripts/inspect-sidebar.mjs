import fs from 'fs';

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page' && p.url.includes('tashteebpro.com'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) => new Promise(resolve => {
    const id = 999;
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 999) resolve(m.result); };
    ws.send(JSON.stringify({ id, method, params }));
  });

  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all
        .filter(el => ['مواقع العمل', 'حاسبة المقايسات', 'مقاولو الباطن والمستخلصات', 'المالية الشاملة', 'إعدادات الشركة'].some(k => el.innerText && el.innerText.trim() === k))
        .map(el => ({ tag: el.tagName, class: el.className, text: el.innerText.trim(), parentTag: el.parentElement?.tagName, parentClass: el.parentElement?.className }));
    })()`,
    returnByValue: true
  });

  console.log('Found elements:', JSON.stringify(r.value, null, 2));
  ws.close();
}

run().catch(console.error);
