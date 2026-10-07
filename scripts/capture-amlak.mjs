import fs from 'fs';

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.url && p.url.includes('amlak.tashteebpro.com'));

  if (!page) {
    console.log('amlak page not found in pages:', pages.map(p => p.url));
    process.exit(1);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) => new Promise(resolve => {
    const id = 1111;
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1111) resolve(m.result); };
    ws.send(JSON.stringify({ id, method, params }));
  });

  const snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/0a14f2ac-bfcc-420c-9927-3f421699658c/live_42_amlak_projects.png', Buffer.from(snap.data, 'base64'));

  const info = await send('Runtime.evaluate', {
    expression: `(() => ({
      url: window.location.href,
      title: document.title,
      bodyText: document.body.innerText.slice(0, 400).replace(/\\n/g, ' ')
    }))()`,
    returnByValue: true
  });

  console.log('Page info:', info.value);
  ws.close();
}

run().catch(console.error);
