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

  console.log('1. Closing or completing the onboarding modal...');
  await cdp.evaluate(`(() => {
    // Click close button or "تخطي"
    const buttons = Array.from(document.querySelectorAll('button, a, span'));
    const skipBtn = buttons.find(b => (b.innerText || '').includes('تخطي') || (b.innerText || '').includes('سأستكشف'));
    if (skipBtn) {
      skipBtn.click();
      return { action: 'clicked skip' };
    }
    const closeBtn = document.querySelector('button[aria-label="Close"]') || buttons.find(b => b.innerText === '×' || b.innerText === '✕');
    if (closeBtn) {
      closeBtn.click();
      return { action: 'clicked close' };
    }
    return { action: 'no button' };
  })()`);

  await sleep(1500);
  await cdp.captureScreenshot('live_13_overview_dashboard');

  // Helper to click sidebar nav items with exact text match
  async function navigateTo(targetText, screenshotName) {
    console.log(`\nNavigating to: ${targetText}...`);
    const clickRes = await cdp.evaluate(`(() => {
      const target = '${targetText}';
      const sidebarLinks = Array.from(document.querySelectorAll('nav a, nav button, aside a, aside button, .sidebar-nav a, .sidebar-nav button, a, button'));
      const found = sidebarLinks.find(el => {
        const t = (el.innerText || '').trim();
        return t.includes(target);
      });
      if (found) {
        found.click();
        return { success: true, text: found.innerText };
      }
      return { success: false, available: sidebarLinks.map(l => l.innerText.trim()).filter(Boolean) };
    })()`);
    console.log('Nav result:', clickRes);
    await sleep(2000);
    await cdp.captureScreenshot(screenshotName);
  }

  // 2. Sites & Projects
  await navigateTo('مواقع العمل', 'live_14_sites_projects');

  // 3. Quotation Builder
  await navigateTo('حاسبة المقايسات', 'live_15_quotation_builder');

  // 4. Subcontractors & Contracts
  await navigateTo('مقاولو الباطن', 'live_16_subcontractors');

  // 5. Finance
  await navigateTo('المالية الشاملة', 'live_17_finance');

  // 6. CRM
  await navigateTo('العملاء والمبيعات', 'live_18_crm_pipeline');

  // 7. Company Settings
  await navigateTo('إعدادات الشركة', 'live_19_company_settings');

  console.log('\nAll core modules navigated and recorded!');
  cdp.close();
}

run().catch(console.error);
