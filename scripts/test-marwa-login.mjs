import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Computec/.gemini/antigravity-ide/brain/0a14f2ac-bfcc-420c-9927-3f421699658c';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            const args = (msg.params.args || []).map(a => a.value || a.description || JSON.stringify(a)).join(' ');
            this.consoleLogs.push(`[${msg.params.type}] ${args}`);
          }
          if (msg.id && this.callbacks.has(msg.id)) {
            const { resolve, reject } = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) {
              reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              resolve(msg.result);
            }
          }
        } catch (e) {
          console.error('Error handling message:', e);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  async captureScreenshot(name) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filename = `${name}.png`;
    const fullPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(fullPath, buffer);
    console.log(`[Screenshot saved]: ${filename}`);
    return fullPath;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find((p) => p.type === 'page' && p.url && p.url.includes('tashteebpro.com'));

  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');

  console.log('1. Clearing storage and navigating to login page...');
  await cdp.evaluate(`(() => {
    try {
      localStorage.removeItem('tashteeb_auth_user');
      sessionStorage.clear();
    } catch(e) {}
    window.location.href = 'https://tashteebpro.com/login';
  })()`);

  await sleep(3000);

  console.log('2. Entering phone 010161616022 and password 123456...');
  const fillResult = await cdp.evaluate(`(() => {
    const form = document.querySelector('form');
    const inputs = form ? form.querySelectorAll('input') : document.querySelectorAll('input');
    const emailInp = Array.from(inputs).find(i => i.type === 'text' || i.type === 'email' || (i.placeholder && i.placeholder.includes('@')));
    const passInp = Array.from(inputs).find(i => i.type === 'password');

    function setVal(el, val) {
      if (!el) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (emailInp) setVal(emailInp, '010161616022');
    if (passInp) setVal(passInp, '123456');

    return {
      emailSet: emailInp?.value,
      passSetLength: passInp?.value?.length
    };
  })()`);
  console.log('Fill result:', fillResult);

  await sleep(1000);
  await cdp.captureScreenshot('live_40_marwa_filled');

  console.log('3. Submitting login form...');
  const submitRes = await cdp.evaluate(`(() => {
    const form = document.querySelector('form');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
      submitBtn.click();
      return { clicked: true, text: submitBtn.innerText };
    }
    return { clicked: false };
  })()`);
  console.log('Submit trigger:', submitRes);

  console.log('4. Waiting to observe response, errors, or redirects...');
  for (let i = 0; i < 8; i++) {
    await sleep(1500);
    const pageState = await cdp.evaluate(`(() => {
      const errorDiv = document.querySelector('.error-banner, [style*="color: #ef4444"], [style*="color: rgb(239, 68, 68)"], [style*="background: rgba(239, 68, 68"], [style*="background: rgb(254, 242, 242)"]');
      const allText = document.body.innerText || '';
      const visibleErrors = Array.from(document.querySelectorAll('div, p, span'))
        .filter(el => {
          const t = (el.innerText || '').trim();
          return t.includes('خطأ') || t.includes('غير صحيح') || t.includes('تعليق') || t.includes('تطابق') || t.includes('مسجل') || t.includes('فشل');
        })
        .map(el => el.innerText.trim());

      return {
        url: window.location.href,
        hasErrorBanner: !!errorDiv,
        errorBannerText: errorDiv?.innerText?.trim(),
        visibleErrors: visibleErrors.slice(0, 5),
        bodySnippet: allText.slice(0, 150).replace(/\\n/g, ' ')
      };
    })()`);

    console.log(`Second ${(i + 1) * 1.5}:`, pageState);
    if (pageState.hasErrorBanner || pageState.visibleErrors.length > 0) {
      console.log('Found error on screen!');
      break;
    }
  }

  await sleep(1000);
  await cdp.captureScreenshot('live_41_marwa_result');

  console.log('\n--- Captured Console Logs during login ---');
  cdp.consoleLogs.forEach(l => console.log(l));

  cdp.close();
}

run().catch(console.error);
