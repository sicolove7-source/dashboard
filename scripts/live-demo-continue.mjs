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

  if (!page) {
    console.error('Tashteeb Pro page not found');
    process.exit(1);
  }

  console.log(`Connecting to: ${page.title} (${page.url})`);
  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  // 1. Click "دخول للحساب" for one of the companies (e.g., شركة أملاك للمقاولات والتشطيبات)
  console.log('\n--- 1. الدخول لمساحة عمل شركة مقاولات حية (Impersonate / Switch Company) ---');
  const enterResult = await cdp.evaluate(`(() => {
    // Look for rows in table
    const buttons = Array.from(document.querySelectorAll('button'));
    const enterBtn = buttons.find(b => b.innerText.includes('دخول للحساب') || b.innerText.includes('دخول'));
    if (enterBtn) {
      enterBtn.click();
      return { success: true, text: enterBtn.innerText };
    }
    return { success: false };
  })()`);
  console.log('Enter company result:', enterResult);
  await sleep(3000);
  await cdp.captureScreenshot('live_07_entered_company_workspace');

  // Helper to click sidebar nav items
  async function clickNavItem(keywords, screenshotName) {
    console.log(`\nNavigating to: ${keywords.join(' / ')}...`);
    const clickRes = await cdp.evaluate(`(() => {
      const keys = ${JSON.stringify(keywords)};
      const items = Array.from(document.querySelectorAll('button, a, nav *, aside *'));
      const target = items.find(el => {
        const text = (el.innerText || '').trim();
        return keys.some(k => text.includes(k));
      });
      if (target) {
        target.click();
        return { success: true, clicked: target.innerText.slice(0, 30) };
      }
      return { success: false };
    })()`);
    console.log('Click result:', clickRes);
    await sleep(2500);
    await cdp.captureScreenshot(screenshotName);
  }

  // 2. Navigate to Projects (مواقع العمل / المشاريع)
  await clickNavItem(['مواقع العمل', 'المشاريع'], 'live_08_projects_tab');

  // 3. Navigate to Quotations (حاسبة المقايسات / عروض الأسعار)
  await clickNavItem(['حاسبة المقايسات', 'عروض الأسعار', 'المقايسات'], 'live_09_quotations_tab');

  // 4. Navigate to Subcontractors (مقاولو الباطن والمستخلصات)
  await clickNavItem(['مقاولو الباطن', 'المستخلصات'], 'live_10_subcontractors_tab');

  // 5. Navigate to Finance (المالية الشاملة)
  await clickNavItem(['المالية الشاملة', 'المالية'], 'live_11_finance_tab');

  // 6. Navigate to Settings (إعدادات الشركة)
  await clickNavItem(['إعدادات الشركة', 'الإعدادات'], 'live_12_settings_tab');

  console.log('\n--- Full live workspace tour completed! ---');
  cdp.close();
}

run().catch(console.error);
