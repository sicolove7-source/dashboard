import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Computec/.gemini/antigravity-ide/brain/0a14f2ac-bfcc-420c-9927-3f421699658c';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
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

  console.log('Submitting login with React native value setters...');
  const result = await cdp.evaluate(`(() => {
    const form = document.querySelector('form');
    const inputs = form ? form.querySelectorAll('input') : document.querySelectorAll('input');
    const emailInp = Array.from(inputs).find(i => i.type === 'text' || i.type === 'email' || i.placeholder.includes('@'));
    const passInp = Array.from(inputs).find(i => i.type === 'password');

    function setVal(el, val) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (emailInp) setVal(emailInp, 'sicolove7@gmail.com');
    if (passInp) setVal(passInp, '123456');

    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
      submitBtn.click();
      return { success: true, email: emailInp?.value, passLength: passInp?.value?.length };
    }
    return { success: false, reason: 'no submit button' };
  })()`);

  console.log('Login trigger result:', result);

  for (let i = 0; i < 5; i++) {
    await sleep(1500);
    const state = await cdp.evaluate(`(() => ({
      url: window.location.href,
      bodySnippet: document.body.innerText.slice(0, 100).replace(/\\n/g, ' ')
    }))()`);
    console.log('Check ' + (i + 1) + ':', state);
    if (!state.url.includes('login') && !state.bodySnippet.includes('تسجيل الدخول')) {
      console.log('Successfully transitioned away from login page!');
      break;
    }
  }

  await sleep(2000);
  await cdp.captureScreenshot('live_06_dashboard_active');
  cdp.close();
}

run().catch(console.error);
