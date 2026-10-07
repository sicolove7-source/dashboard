import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/Computec/.gemini/antigravity-ide/brain/0a14f2ac-bfcc-420c-9927-3f421699658c';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.url && p.url.includes('amlak.tashteebpro.com'));

  if (!page) {
    console.error('amlak page not found');
    process.exit(1);
  }

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

  console.log('1. Filling phone and password on amlak portal...');
  const fillRes = await send('Runtime.evaluate', {
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

      if (emailInp) setVal(emailInp, '010161616022');
      if (passInp) setVal(passInp, '123456');

      return {
        emailVal: emailInp?.value,
        passLen: passInp?.value?.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Fill result:', fillRes.value);

  await sleep(1000);

  console.log('2. Clicking submit button on company portal...');
  const clickRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('تسجيل الدخول'));
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText };
      }
      return { clicked: false };
    })()`,
    returnByValue: true
  });
  console.log('Click result:', clickRes.value);

  console.log('3. Waiting for login authentication on amlak subdomain...');
  for (let i = 0; i < 7; i++) {
    await sleep(1500);
    const state = await send('Runtime.evaluate', {
      expression: `(() => {
        const errorDiv = document.querySelector('.error-banner, [style*="color: #ef4444"], [style*="color: rgb(239, 68, 68)"]');
        return {
          url: window.location.href,
          hasError: !!errorDiv,
          errorText: errorDiv?.innerText?.trim(),
          body: document.body.innerText.slice(0, 200).replace(/\\n/g, ' ')
        };
      })()`,
      returnByValue: true
    });
    console.log(`Step ${i + 1}:`, state.value);
    if (!state.value.url.includes('login') && !state.value.body.includes('تسجيل الدخول')) {
      console.log('Successfully entered inside company workspace!');
      break;
    }
  }

  await sleep(2000);
  const snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${ARTIFACT_DIR}/live_43_marwa_logged_in.png`, Buffer.from(snap.data, 'base64'));
  console.log('Screenshot saved: live_43_marwa_logged_in.png');

  ws.close();
}

run().catch(console.error);
