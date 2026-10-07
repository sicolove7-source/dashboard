async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.url && p.url.includes('tashteebpro.com'));
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

  await send('Console.enable');
  await send('Log.enable');

  const logs = [];
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === 'Console.messageAdded') {
      logs.push('[Console] ' + msg.params.message.text);
    }
    if (msg.method === 'Log.entryAdded') {
      logs.push('[Log] ' + msg.params.entry.text);
    }
  });

  console.log('Logging in directly on amlak.tashteebpro.com/login...');
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

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const state = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          url: window.location.href,
          activeUser: localStorage.getItem('active_session_user'),
          tenantUsers: localStorage.getItem('tenant_comp_c_mtyw7mqk_users')?.slice(0, 100),
          isAuth: !!window.__isAuth,
          body: document.body.innerText.slice(0, 120).replace(/\\n/g, ' ')
        };
      })()`,
      returnByValue: true
    });
    console.log(`t=${i + 1}s:`, state?.result?.value);
  }

  console.log('=== Collected Browser Logs ===');
  logs.forEach(l => console.log(l));

  ws.close();
}

run().catch(console.error);
