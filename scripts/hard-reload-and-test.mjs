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
            console.error('[Browser Exception]:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception);
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

  console.log('Performing HARD RELOAD with cache disabled...');
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(4000);

  // Check if we are in project detail or projects list
  let inDetail = await cdp.evaluate(`(() => {
    return !!document.querySelector('.project-detail-header');
  })()`);

  console.log('Is in detail view initially?', inDetail);

  if (!inDetail) {
    console.log('Clicking project card...');
    await cdp.evaluate(`(() => {
      const titles = Array.from(document.querySelectorAll('h3, h4, span, div'))
        .filter(el => el.innerText && el.innerText.trim() === 'تشطيب وتأثيث فيلا الياسمين');
      if (titles.length > 0) titles[0].click();
    })()`);
    await sleep(3000);
  }

  // Check if the top toolbar has "تقرير واتساب"
  const topReportBtn = await cdp.evaluate(`(() => {
    const btn = document.querySelector('.btn-report-top');
    return btn ? { found: true, text: btn.innerText } : { found: false };
  })()`);
  console.log('Top report button status:', topReportBtn);

  // Switch to "العقود والعميل"
  console.log('Switching to "العقود والعميل" subtab...');
  const subtabRes = await cdp.evaluate(`(() => {
    const allBtns = Array.from(document.querySelectorAll('.desktop-subtab-card, .mobile-tab-btn, button, .subtab-btn'));
    const contractsTab = allBtns.find(b => b.innerText && b.innerText.includes('العقود والعميل'));
    if (contractsTab) {
      contractsTab.click();
      return { success: true, text: contractsTab.innerText };
    }
    return { success: false };
  })()`);
  console.log('Subtab click:', subtabRes);
  await sleep(2500);

  // Check the two buttons IDs
  const buttonsInfo = await cdp.evaluate(`(() => {
    const b1 = document.querySelector('#btn-open-client-contract');
    const b2 = document.querySelector('#btn-open-client-report');
    return {
      b1Found: !!b1,
      b1Text: b1?.innerText,
      b2Found: !!b2,
      b2Text: b2?.innerText
    };
  })()`);
  console.log('Buttons with ID found?:', buttonsInfo);

  // Click #btn-open-client-contract
  console.log('Clicking #btn-open-client-contract...');
  await cdp.evaluate(`(() => {
    const btn = document.querySelector('#btn-open-client-contract') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('فتح وتحرير عقد العميل'));
    if (btn) btn.click();
  })()`);
  await sleep(3000);

  await cdp.captureScreenshot('27_client_contract_modal_live');

  // Verify contract modal opened
  const contractStatus = await cdp.evaluate(`(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('العودة إلى مركز العقود'));
    const title = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div')).find(el => el.innerText && el.innerText.includes('عقد مقاولة'));
    return {
      isOpen: !!backBtn,
      titleText: title ? title.innerText.slice(0, 50) : null
    };
  })()`);
  console.log('Contract Modal Result:', contractStatus);

  // Click back to contracts
  console.log('Clicking back to contracts...');
  await cdp.evaluate(`(() => {
    const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('العودة إلى مركز العقود'));
    if (backBtn) backBtn.click();
  })()`);
  await sleep(2000);

  // Click #btn-open-client-report
  console.log('Clicking #btn-open-client-report...');
  await cdp.evaluate(`(() => {
    const btn = document.querySelector('#btn-open-client-report') ||
      Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('معاينة وإرسال تقرير العميل'));
    if (btn) btn.click();
  })()`);
  await sleep(3000);

  await cdp.captureScreenshot('28_client_report_modal_live');

  const reportStatus = await cdp.evaluate(`(() => {
    const modal = document.querySelector('.modal-overlay');
    const sendBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText && b.innerText.includes('واتساب'));
    return {
      isOpen: !!modal,
      hasSendBtn: !!sendBtn,
      sendText: sendBtn ? sendBtn.innerText : null
    };
  })()`);
  console.log('Report Modal Result:', reportStatus);

  cdp.close();
  console.log('TEST FINISHED');
}

main().catch(console.error);
