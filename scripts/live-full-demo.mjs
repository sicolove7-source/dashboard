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
  console.log('Connecting to browser on port 9222...');
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find((p) => p.type === 'page' && p.url && p.url.includes('tashteebpro.com'));

  if (!page) {
    console.error('Tashteeb Pro page not found in browser');
    process.exit(1);
  }

  console.log(`Connected to: ${page.title} (${page.url})`);
  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  // 1. Scroll to values / features
  console.log('\n--- 1. استعراض مميزات المنصة ---');
  await cdp.evaluate(`(() => {
    const el = document.getElementById('values') || document.querySelector('section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  })()`);
  await sleep(1500);
  await cdp.captureScreenshot('live_01_features');

  // 2. Interactive Live Preview
  console.log('\n--- 2. تجربة المعاينة الحية التفاعلية ---');
  await cdp.evaluate(`(() => {
    const el = document.getElementById('preview');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  })()`);
  await sleep(1200);

  // Click each preview tab
  const previewTabs = [
    { name: 'contracts', label: 'عقود الصنايعية والورش' },
    { name: 'portal', label: 'بوابة العميل والواتساب' },
    { name: 'boq', label: 'مقايسة وسعر المتر' },
    { name: 'sites', label: 'إشراف ومراحل المواقع' }
  ];

  for (const pt of previewTabs) {
    console.log(`Clicking preview tab: ${pt.label}...`);
    await cdp.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('.preview-tab-btn-light'));
      const b = btns.find(btn => btn.innerText.includes('${pt.label}'));
      if (b) b.click();
    })()`);
    await sleep(1200);
    await cdp.captureScreenshot(`live_02_preview_${pt.name}`);
  }

  // 3. Scroll to Pricing
  console.log('\n--- 3. استعراض باقات الأسعار والتسعير السنوي ---');
  await cdp.evaluate(`(() => {
    const el = document.getElementById('pricing');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  })()`);
  await sleep(1500);
  await cdp.captureScreenshot('live_03_pricing');

  // 4. Click Login button to go to login page
  console.log('\n--- 4. الانتقال إلى شاشة الدخول ---');
  await cdp.evaluate(`(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const loginBtn = document.querySelector('.ws-nav-login-btn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('دخول'));
    if (loginBtn) loginBtn.click();
  })()`);
  await sleep(2000);
  await cdp.captureScreenshot('live_04_login_page');

  // 5. Check if we can log in with test/admin credentials
  console.log('\n--- 5. تسجيل الدخول لبوابة الشركة ---');
  await cdp.evaluate(`(() => {
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

    if (emailInp) setReactValue(emailInp, 'sicolove7@gmail.com');
    if (passInp) setReactValue(passInp, '123456');

    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => 
      b.innerText.includes('تسجيل الدخول') || b.innerText.includes('دخول')
    );
    if (submitBtn) submitBtn.click();
  })()`);

  console.log('Waiting for login to authenticate...');
  await sleep(4000);
  await cdp.captureScreenshot('live_05_logged_in_dashboard');

  console.log('\nDemo finished successfully!');
  cdp.close();
}

run().catch(err => {
  console.error('Error during full demo:', err);
  process.exit(1);
});
