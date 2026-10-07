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

  console.log('1. Dismissing modal via close button or backdrop...');
  await cdp.evaluate(`(() => {
    // Look for all buttons inside modal backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      const btns = Array.from(backdrop.querySelectorAll('button'));
      const skip = btns.find(b => b.innerText.includes('تخطي'));
      if (skip) {
        skip.click();
      } else if (btns.length > 0) {
        btns[0].click(); // close X
      } else {
        backdrop.click();
      }
    }
  })()`);

  await sleep(1500);

  // If still there, force remove backdrop
  await cdp.evaluate(`(() => {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(b => b.remove());
  })()`);

  await sleep(1000);
  console.log('2. Capturing Overview / Dashboard...');
  await cdp.captureScreenshot('live_20_company_overview');

  // List of tabs to navigate and capture
  const tabs = [
    { name: 'projects', label: 'مواقع العمل', file: 'live_21_projects_sites' },
    { name: 'quotations', label: 'حاسبة المقايسات', file: 'live_22_quotation_builder' },
    { name: 'subcontractors', label: 'مقاولو الباطن', file: 'live_23_subcontractors' },
    { name: 'suppliers', label: 'الموردون', file: 'live_24_suppliers' },
    { name: 'finance', label: 'المالية الشاملة', file: 'live_25_finance' },
    { name: 'crm', label: 'العملاء والمبيعات', file: 'live_26_crm' },
    { name: 'settings', label: 'إعدادات الشركة', file: 'live_27_company_settings' }
  ];

  for (const t of tabs) {
    console.log(`Navigating to tab: ${t.label}...`);
    const clickSuccess = await cdp.evaluate(`(() => {
      const sidebarLinks = Array.from(document.querySelectorAll('nav a, nav button, aside a, aside button, .sidebar-nav button, .sidebar-nav a, [role="tab"], button, a'));
      const match = sidebarLinks.find(el => {
        const text = (el.innerText || '').trim();
        return text.includes('${t.label}');
      });
      if (match) {
        match.click();
        return true;
      }
      return false;
    })()`);
    console.log(`Tab ${t.label} click result:`, clickSuccess);
    await sleep(2500);
    await cdp.captureScreenshot(t.file);
  }

  console.log('\nAll tabs captured successfully!');
  cdp.close();
}

run().catch(console.error);
