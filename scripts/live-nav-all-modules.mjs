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

  async function clickNavItem(textKeyword, screenshotName) {
    console.log(`\nNavigating to: ${textKeyword}...`);
    const result = await cdp.evaluate(`(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const item = items.find(el => (el.innerText || '').includes('${textKeyword}'));
      if (item) {
        item.click();
        return { clicked: true, text: item.innerText.trim() };
      }
      return { clicked: false, available: items.map(i => i.innerText.trim()) };
    })()`);
    console.log('Result:', result);
    await sleep(2200);
    await cdp.captureScreenshot(screenshotName);
  }

  // 1. مواقع العمل (المشاريع)
  await clickNavItem('مواقع العمل', 'live_30_projects');

  // Let's open the project detail to show Gantt & details!
  console.log('\nOpening Project Detail...');
  await cdp.evaluate(`(() => {
    const rows = Array.from(document.querySelectorAll('.project-row, .card, table tr, [role="button"], button'));
    const p = rows.find(r => (r.innerText || '').includes('فيلا') || (r.innerText || '').includes('تفاصيل') || (r.innerText || '').includes('عرض'));
    if (p) p.click();
  })()`);
  await sleep(2500);
  await cdp.captureScreenshot('live_31_project_detail');

  // 2. حاسبة المقايسات
  await clickNavItem('حاسبة المقايسات', 'live_32_quotations');

  // 3. مقاولو الباطن والمستخلصات
  await clickNavItem('مقاولو الباطن', 'live_33_subcontractors');

  // 4. الموردون والصنايعية
  await clickNavItem('الموردون والصنايعية', 'live_34_suppliers');

  // 5. المالية الشاملة
  await clickNavItem('المالية الشاملة', 'live_35_finance');

  // 6. العملاء والمبيعات (CRM)
  await clickNavItem('العملاء والمبيعات', 'live_36_crm');

  // 7. أداء المهندسين
  await clickNavItem('أداء المهندسين', 'live_37_engineers');

  // 8. إعدادات الشركة
  await clickNavItem('إعدادات الشركة', 'live_38_settings');

  console.log('\n🎉 Complete live module walkthrough completed!');
  cdp.close();
}

run().catch(console.error);
