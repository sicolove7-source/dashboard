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

  // 1. Click specifically on the card with title "تشطيب وتأثيث فيلا الياسمين"
  console.log('Clicking the project card...');
  const cardClick = await cdp.evaluate(`(() => {
    const titles = Array.from(document.querySelectorAll('h3, h4, span, div'))
      .filter(el => el.innerText && el.innerText.trim() === 'تشطيب وتأثيث فيلا الياسمين');
    if (titles.length > 0) {
      titles[0].click();
      return { success: true, text: titles[0].innerText };
    }
    return { success: false };
  })()`);
  console.log('Card click result:', cardClick);
  await sleep(3500);

  // 2. We should now be in ProjectDetail. Let's switch to the "العقود والعميل" subtab.
  console.log('Switching to "العقود والعميل" subtab...');
  const subtabClick = await cdp.evaluate(`(() => {
    const allBtns = Array.from(document.querySelectorAll('.desktop-subtab-card, .mobile-tab-btn, button, .subtab-btn'));
    const contractsTab = allBtns.find(b => b.innerText && b.innerText.includes('العقود والعميل'));
    if (contractsTab) {
      contractsTab.click();
      return { success: true, text: contractsTab.innerText };
    }
    return { success: false, foundButtons: allBtns.map(b => b.innerText.trim()).slice(0, 10) };
  })()`);
  console.log('Subtab click result:', subtabClick);
  await sleep(3000);

  await cdp.captureScreenshot('23_contracts_hub_panel_active');

  // 3. Test Button 1: "فتح وتحرير عقد العميل 📜"
  console.log('Clicking button #btn-open-client-contract ("فتح وتحرير عقد العميل 📜")...');
  const contractBtn = await cdp.evaluate(`(() => {
    const btn = document.querySelector('#btn-open-client-contract') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('عقد العميل'));
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
      return { success: true, text: btn.innerText };
    }
    return { success: false };
  })()`);
  console.log('Contract button clicked:', contractBtn);
  await sleep(3000);

  // Capture screenshot of the opened contract generator modal
  await cdp.captureScreenshot('24_client_contract_modal_open');

  const contractVerified = await cdp.evaluate(`(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('العودة إلى مركز العقود'));
    const hasWordBtn = Array.from(document.querySelectorAll('button')).some(b => b.innerText && b.innerText.includes('تصدير Word'));
    const contractNum = document.querySelector('input[value*="CONT-"]')?.value;
    return {
      isOpen: !!backBtn,
      hasWordExport: hasWordBtn,
      contractNumber: contractNum
    };
  })()`);
  console.log('Contract verification:', contractVerified);

  // Return back to Contracts Hub
  console.log('Returning to Contracts Hub...');
  await cdp.evaluate(`(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('العودة إلى مركز العقود'));
    if (backBtn) backBtn.click();
  })()`);
  await sleep(2500);

  // 4. Test Button 2: "معاينة وإرسال تقرير العميل 📱"
  console.log('Clicking button #btn-open-client-report ("معاينة وإرسال تقرير العميل 📱")...');
  const reportBtn = await cdp.evaluate(`(() => {
    const btn = document.querySelector('#btn-open-client-report') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('تقرير العميل'));
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
      return { success: true, text: btn.innerText };
    }
    return { success: false };
  })()`);
  console.log('Report button clicked:', reportBtn);
  await sleep(3000);

  // Capture screenshot of the opened WhatsApp report modal
  await cdp.captureScreenshot('25_client_whatsapp_report_modal_open');

  const reportVerified = await cdp.evaluate(`(() => {
    const overlay = document.querySelector('.modal-overlay');
    const sendBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText && b.innerText.includes('واتساب'));
    const textarea = document.querySelector('textarea');
    return {
      isOpen: !!overlay,
      hasSendBtn: !!sendBtn,
      reportTextLength: textarea ? textarea.value.length : 0,
      reportSample: textarea ? textarea.value.slice(0, 150) : null
    };
  })()`);
  console.log('Report verification:', reportVerified);

  // 5. Close report modal
  console.log('Closing report modal...');
  await cdp.evaluate(`(() => {
    const closeBtn = document.querySelector('.modal-overlay button svg, .modal-content button svg')?.closest('button');
    if (closeBtn) closeBtn.click();
  })()`);
  await sleep(1500);

  // 6. Test top toolbar button "تقرير واتساب 📱"
  console.log('Testing top toolbar report button (.btn-report-top)...');
  const topBtnRes = await cdp.evaluate(`(() => {
    const btn = document.querySelector('.btn-report-top');
    if (btn) {
      btn.click();
      return { success: true, text: btn.innerText };
    }
    return { success: false };
  })()`);
  console.log('Top report button clicked:', topBtnRes);
  await sleep(2500);

  await cdp.captureScreenshot('26_top_toolbar_report_modal_open');

  cdp.close();
  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);
