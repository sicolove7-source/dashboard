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

  // 1. Capture current view
  console.log('Step 1: Capturing initial view...');
  await cdp.captureScreenshot('live_01_initial');

  // 2. Click or switch between key tabs
  const tabNames = ['projects', 'quotations', 'subcontractors', 'finance', 'settings'];

  for (let i = 0; i < tabNames.length; i++) {
    const tab = tabNames[i];
    console.log(`\nNavigating to tab: ${tab}...`);
    
    await cdp.evaluate(`(() => {
      // Find nav item by data-tab or clicking button/link
      const tabKey = '${tab}';
      const items = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      
      const target = items.find(el => {
        const text = (el.innerText || '').trim();
        const href = el.getAttribute('href') || '';
        if (tabKey === 'projects' && (text.includes('المشاريع') || href.includes('projects'))) return true;
        if (tabKey === 'quotations' && (text.includes('عروض الأسعار') || text.includes('التسعير') || href.includes('quotations'))) return true;
        if (tabKey === 'subcontractors' && (text.includes('مقاولو الباطن') || text.includes('المقاولين') || href.includes('subcontractors'))) return true;
        if (tabKey === 'finance' && (text.includes('المالية') || text.includes('الخزينة') || href.includes('finance'))) return true;
        if (tabKey === 'settings' && (text.includes('الإعدادات') || href.includes('settings'))) return true;
        return false;
      });

      if (target) {
        target.click();
        return { success: true, text: target.innerText };
      }
      return { success: false };
    })()`);

    await sleep(2500);
    await cdp.captureScreenshot(`live_02_tab_${tab}`);
  }

  console.log('\nLive test navigation completed successfully!');
  cdp.close();
}

run().catch(err => {
  console.error('Error during live demo:', err);
  process.exit(1);
});
