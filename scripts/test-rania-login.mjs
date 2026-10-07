import fs from 'fs';

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.url && p.url.includes('tashteebpro.com'));

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
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

  console.log('Navigating to tashteebpro.com/login...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
      window.location.href = 'https://tashteebpro.com/login';
    })()`
  });

  await new Promise(r => setTimeout(r, 2500));

  console.log('Filling phone 01018171415 and pass 123456...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      function setVal(el, val) {
        if (!el) return;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const emailInp = document.querySelector('input[type="text"], input[type="email"]');
      const passInp = document.querySelector('input[type="password"]');
      if (emailInp) setVal(emailInp, '01018171415');
      if (passInp) setVal(passInp, '123456');
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('تسجيل الدخول'));
      if (btn) btn.click();
    })()`
  });

  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const info = await send('Runtime.evaluate', {
      expression: `(() => {
        const err = document.querySelector('.error-banner, [style*="color: #ef4444"], [style*="color: rgb(239, 68, 68)"]');
        return {
          url: window.location.href,
          errText: err ? err.innerText : null,
          body: document.body.innerText.slice(0, 150).replace(/\\n/g, ' ')
        };
      })()`,
      returnByValue: true
    });
    console.log(`Step ${i + 1}:`, info.result?.value);
  }

  const snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/0a14f2ac-bfcc-420c-9927-3f421699658c/live_50_rania_test.png', Buffer.from(snap.data, 'base64'));
  console.log('Screenshot saved: live_50_rania_test.png');

  ws.close();
}

run().catch(console.error);
