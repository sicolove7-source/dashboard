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
          if (msg.method === 'Runtime.consoleAPICalled') {
            console.log('[Browser Console]:', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
          } else if (msg.method === 'Runtime.exceptionThrown') {
            console.error('[Browser Exception]:', msg.params.exceptionDetails.text);
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

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find((p) => p.type === 'page' && p.url.includes('tashteebpro.com'));
  if (!page) {
    throw new Error('No tashteebpro page found in browser');
  }
  console.log('Connecting to page:', page.url);
  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  // 1. Purge all Service Workers and CacheStorage
  console.log('Purging old Service Worker and CacheStorage in the browser...');
  const purgeResult = await cdp.evaluate(`(async () => {
    let unregCount = 0;
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        await r.unregister();
        unregCount++;
      }
    }
    let delCount = 0;
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        await caches.delete(k);
        delCount++;
      }
    }
    return { unregCount, delCount };
  })()`);
  console.log('Purge result:', purgeResult);

  // 2. Hard reload page to fetch fresh dist from hosting
  console.log('Hard reloading page with ignoreCache: true...');
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(4000);

  // 3. Navigate directly to /projects
  const origin = new URL(page.url).origin;
  console.log(`Navigating to ${origin}/projects ...`);
  await cdp.send('Page.navigate', { url: `${origin}/projects` });
  await sleep(3500);

  // 4. Click project card "تشطيب وتأثيث فيلا الياسمين"
  console.log('Clicking project card...');
  const clickCard = await cdp.evaluate(`(() => {
    const titles = Array.from(document.querySelectorAll('h3, h4, span, div'))
      .filter(el => el.innerText && el.innerText.trim() === 'تشطيب وتأثيث فيلا الياسمين');
    if (titles.length > 0) {
      titles[0].click();
      return { success: true };
    }
    return { success: false };
  })()`);
  console.log('Project card click:', clickCard);
  await sleep(3000);

  // Verify top toolbar report button
  const topReportBtn = await cdp.evaluate(`(() => {
    const btn = document.querySelector('.btn-report-top');
    return btn ? { found: true, text: btn.innerText } : { found: false };
  })()`);
  console.log('Top report button in header:', topReportBtn);

  // 5. Click "العقود والعميل" subtab
  console.log('Clicking "العقود والعميل" subtab...');
  const tabRes = await cdp.evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('.desktop-subtab-card, .mobile-tab-btn, button, .subtab-btn'));
    const tab = btns.find(b => b.innerText && b.innerText.includes('العقود والعميل'));
    if (tab) {
      tab.click();
      return { success: true, text: tab.innerText };
    }
    return { success: false };
  })()`);
  console.log('Contracts tab click:', tabRes);
  await sleep(2500);

  await cdp.captureScreenshot('29_contracts_hub_fresh');

  // 6. Test Button 1: "فتح وتحرير عقد العميل 📜"
  console.log('Testing "فتح وتحرير عقد العميل 📜" (#btn-open-client-contract)...');
  const contractClick = await cdp.evaluate(`(() => {
    const btn = document.querySelector('#btn-open-client-contract') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('فتح وتحرير عقد العميل'));
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
      return { success: true, id: btn.id, text: btn.innerText };
    }
    return { success: false };
  })()`);
  console.log('Contract button click:', contractClick);
  await sleep(3000);

  // Capture screenshot of the opened contract generator modal
  await cdp.captureScreenshot('30_client_contract_modal_open_verified');

  const contractVerification = await cdp.evaluate(`(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('العودة إلى مركز العقود'));
    const wordBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('تصدير Word'));
    const printBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('طباعة PDF'));
    const contractNum = document.querySelector('input[value*="CONT-"]')?.value;
    const clientNameInput = Array.from(document.querySelectorAll('input')).find(i => i.value && i.value.includes('حسام'));
    return {
      isOpen: !!backBtn,
      backBtnText: backBtn?.innerText,
      hasWordExport: !!wordBtn,
      hasPrintPdf: !!printBtn,
      contractNumber: contractNum,
      clientName: clientNameInput?.value
    };
  })()`);
  console.log('Contract Verification Result:', contractVerification);

  // Return to Contracts Hub
  console.log('Returning to Contracts Hub...');
  await cdp.evaluate(`(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('العودة إلى مركز العقود'));
    if (backBtn) backBtn.click();
  })()`);
  await sleep(2500);

  // 7. Test Button 2: "معاينة وإرسال تقرير العميل 📱"
  console.log('Testing "معاينة وإرسال تقرير العميل 📱" (#btn-open-client-report)...');
  const reportClick = await cdp.evaluate(`(() => {
    const btn = document.querySelector('#btn-open-client-report') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('معاينة وإرسال تقرير العميل'));
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
      return { success: true, id: btn.id, text: btn.innerText };
    }
    return { success: false };
  })()`);
  console.log('Report button click:', reportClick);
  await sleep(3000);

  // Capture screenshot of the opened WhatsApp report modal
  await cdp.captureScreenshot('31_client_whatsapp_report_modal_open_verified');

  const reportVerification = await cdp.evaluate(`(() => {
    const overlay = document.querySelector('.modal-overlay');
    const sendBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText && b.innerText.includes('واتساب مباشر') || b.innerText.includes('واتساب'));
    const copyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('نسخ النص'));
    const textarea = document.querySelector('textarea');
    return {
      isOpen: !!overlay,
      hasSendBtn: !!sendBtn,
      sendBtnText: sendBtn?.innerText,
      hasCopyBtn: !!copyBtn,
      reportTextLength: textarea ? textarea.value.length : 0,
      reportSnippet: textarea ? textarea.value.slice(0, 150) : null
    };
  })()`);
  console.log('Report Verification Result:', reportVerification);

  // Close report modal
  console.log('Closing report modal...');
  await cdp.evaluate(`(() => {
    const closeBtn = document.querySelector('.modal-overlay button, .modal-content button');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(1500);

  cdp.close();
  console.log('ALL VERIFICATIONS COMPLETED!');
}

main().catch(console.error);
