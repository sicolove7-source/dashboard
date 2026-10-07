import fs from 'fs';

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.url && p.url.includes('tashteebpro.com'));
  if (!page) {
    console.error('No tashteeb page found in Edge');
    return;
  }
  console.log('Connecting to Edge tab:', page.url);

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

  // Enable console tracking
  await send('Console.enable');
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Console.messageAdded') {
      const t = msg.params.message.text;
      if (t.includes('Security') || t.includes('Logout') || t.includes('resolve') || t.includes('Login')) {
        console.log('[Browser Console]', t);
      }
    }
  });

  console.log('1. Navigating to https://tashteebpro.com/login...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
      window.location.href = 'https://tashteebpro.com/login';
    })()`
  });

  await new Promise(r => setTimeout(r, 3000));

  console.log('2. Entering phone 01018171415 and password 123456...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      function setVal(el, val) {
        if (!el) return;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const inputs = Array.from(document.querySelectorAll('input'));
      const textInp = inputs.find(i => i.type === 'text' || i.type === 'email');
      const passInp = inputs.find(i => i.type === 'password');
      if (textInp) setVal(textInp, '01018171415');
      if (passInp) setVal(passInp, '123456');

      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('تسجيل الدخول'));
      if (btn) btn.click();
    })()`
  });

  console.log('3. Monitoring login and session stability over 20 seconds...');
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await send('Runtime.evaluate', {
      expression: `(() => {
        const err = document.querySelector('.error-banner, [style*="color: #ef4444"], [style*="color: rgb(239, 68, 68)"]');
        return {
          url: window.location.href,
          errText: err ? err.innerText : null,
          hasLogoutBtn: !!document.querySelector('button[onClick*="handleLogout"], button:not([type="submit"])'),
          activeUser: localStorage.getItem('active_session_user'),
          bodySnippet: document.body.innerText.slice(0, 100).replace(/\\n/g, ' ')
        };
      })()`,
      returnByValue: true
    });
    const val = status?.result?.value;
    console.log(`[Second ${(i + 1) * 2}] URL: ${val?.url} | Error: ${val?.errText || 'None'} | Body: ${val?.bodySnippet?.slice(0, 60)}`);
  }

  const snap = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = 'C:/Users/Computec/.gemini/antigravity-ide/brain/0a14f2ac-bfcc-420c-9927-3f421699658c/live_51_rania_success.png';
  fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
  console.log('Screenshot saved to:', outPath);

  ws.close();
}

run().catch(console.error);
