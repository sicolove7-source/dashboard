import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3';

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
    console.log(`[Screenshot saved]: ${fullPath}`);
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
  const page = pages.find((p) => p.type === 'page' && !p.url.startsWith('chrome://'));
  console.log(`Connecting to: ${page.title} (${page.url})`);

  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  console.log('Filling password and submitting login form on company portal...');
  const loginAction = await cdp.evaluate(`(() => {
    function setReactValue(input, val) {
      if (!input) return false;
      input.focus();
      const prev = input.value;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      const tracker = input._valueTracker;
      if (tracker) tracker.setValue(prev);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    const emailInp = document.querySelector('input[type="email"], input[type="text"]');
    const passInp = document.querySelector('input[type="password"]');

    if (emailInp && !emailInp.value) {
      setReactValue(emailInp, 'alofok2948@tashteebpro.com');
    }
    if (passInp) {
      setReactValue(passInp, 'TestPass@2026');
    }

    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.innerText.includes('تسجيل الدخول لبوابة الشركة') || b.innerText.includes('تسجيل الدخول'));
    if (btn) {
      btn.click();
      return { clicked: true, text: btn.innerText.trim() };
    }
    return { clicked: false };
  })()`);

  console.log('Login action result:', loginAction);

  // Monitor loading
  console.log('Waiting for authentication and dashboard entry...');
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const state = await cdp.evaluate(`(() => {
      const text = document.body.innerText || '';
      const url = window.location.href;
      return {
        url,
        hasDashboard: text.includes('المشاريع') || text.includes('نظرة عامة') || text.includes('لوحة التحكم') || document.querySelector('nav, aside') !== null,
        buttons: Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(Boolean).slice(0, 8),
        bodySnippet: text.slice(0, 150).replace(/\\s+/g, ' ')
      };
    })()`);

    console.log(`[T+${i + 1}s] URL: ${state.url} | Dashboard: ${state.hasDashboard} | Snippet: ${state.bodySnippet}`);
    if (state.hasDashboard && !state.url.includes('/login')) {
      console.log('Dashboard reached!');
      break;
    }
  }

  await sleep(2000);
  await cdp.captureScreenshot('04_company_dashboard_main');

  // Navigate to sections
  console.log('Exploring "المشاريع" (Projects)...');
  const projectClicked = await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('a, button, [role="button"], nav *'))
      .find(e => e.innerText && e.innerText.trim() === 'المشاريع');
    if (el) { el.click(); return true; }
    return false;
  })()`);
  console.log('Clicked Projects:', projectClicked);
  await sleep(3500);
  await cdp.captureScreenshot('05_projects_section');

  console.log('Exploring "العملاء" (CRM)...');
  const crmClicked = await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('a, button, [role="button"], nav *'))
      .find(e => e.innerText && (e.innerText.trim() === 'العملاء' || e.innerText.includes('CRM')));
    if (el) { el.click(); return true; }
    return false;
  })()`);
  console.log('Clicked CRM:', crmClicked);
  await sleep(3500);
  await cdp.captureScreenshot('06_crm_section');

  console.log('Exploring "إعدادات الشركة" (Settings)...');
  const settingsClicked = await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('a, button, [role="button"], nav *'))
      .find(e => e.innerText && (e.innerText.includes('إعدادات') || e.innerText.includes('Settings')));
    if (el) { el.click(); return true; }
    return false;
  })()`);
  console.log('Clicked Settings:', settingsClicked);
  await sleep(3500);
  await cdp.captureScreenshot('07_settings_section');

  console.log('ALL EXPLORATION STEPS COMPLETED!');
  cdp.close();
}

run().catch(console.error);
