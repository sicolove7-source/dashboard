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
  const page = pages.find((p) => p.type === 'page' && !p.url.startsWith('chrome://'));

  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  console.log('Navigating back to "مواقع العمل"...');
  await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('a, button, [role="button"], nav div, nav span'))
      .find(e => e.innerText && e.innerText.trim() === 'مواقع العمل');
    if (el) el.click();
  })()`);
  await sleep(2500);

  console.log('Clicking "+ إضافة مشروع جديد"...');
  const openModal = await cdp.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('إضافة مشروع جديد') || b.innerText.includes('مشروع جديد'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  })()`);
  console.log('Open modal result:', openModal);
  await sleep(2000);

  await cdp.captureScreenshot('10_add_project_modal');

  // Fill project form:
  console.log('Filling new project form...');
  const filledProject = await cdp.evaluate(`(() => {
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

    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    
    // Project Name
    const nameInp = inputs.find(i => (i.placeholder || '').includes('فيلا') || (i.placeholder || '').includes('شقة') || (i.placeholder || '').includes('مشروع') || (i.name || '').includes('name') || (i.name || '').includes('title'));
    if (nameInp) setReactValue(nameInp, 'تشطيب فيلا التجمع الخامس - النرجس');

    // Client Name
    const clientInp = inputs.find(i => (i.placeholder || '').includes('العميل') || (i.name || '').includes('client'));
    if (clientInp) setReactValue(clientInp, 'د. حسام عبد العزيز');

    // Client Phone
    const phoneInp = inputs.find(i => i.type === 'tel' || (i.placeholder || '').includes('هاتف') || (i.placeholder || '').includes('010'));
    if (phoneInp) setReactValue(phoneInp, '01012345678');

    // Contract Value
    const contractInp = inputs.find(i => (i.placeholder || '').includes('قيمة') || (i.placeholder || '').includes('مبلغ') || (i.name || '').includes('contract') || (i.name || '').includes('value') || (i.name || '').includes('budget'));
    if (contractInp) setReactValue(contractInp, '850000');

    return {
      inputsCount: inputs.length,
      nameVal: nameInp ? nameInp.value : null,
      clientVal: clientInp ? clientInp.value : null
    };
  })()`);

  console.log('Project fill status:', filledProject);
  await sleep(1500);
  await cdp.captureScreenshot('11_project_modal_filled');

  // Submit project
  console.log('Saving new project...');
  const saveBtnResult = await cdp.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const saveBtn = buttons.find(b => b.innerText.includes('حفظ المشروع') || b.innerText.includes('إنشاء المشروع') || b.innerText.includes('حفظ وبدء العمل') || b.innerText.includes('إضافة الموقع'));
    if (saveBtn) {
      saveBtn.click();
      return { clicked: true, text: saveBtn.innerText };
    }
    return { clicked: false };
  })()`);
  console.log('Save button result:', saveBtnResult);
  await sleep(3500);

  await cdp.captureScreenshot('12_project_created_in_sites_list');

  cdp.close();
}

main().catch(console.error);
