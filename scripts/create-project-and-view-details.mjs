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
  console.log(`Connecting to: ${page.title} (${page.url})`);

  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  console.log('Filling required fields for the new project site...');
  const fillResult = await cdp.evaluate(`(() => {
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

    const inputs = Array.from(document.querySelectorAll('input'));
    const nameInp = inputs.find(i => (i.placeholder || '').includes('الياسمين'));
    const clientInp = inputs.find(i => (i.placeholder || '').includes('خالد'));
    const areaInp = inputs.find(i => (i.placeholder || '').includes('التجمع') || (i.placeholder || '').includes('زايد'));

    const rName = setReactValue(nameInp, 'تشطيب وتأثيث فيلا الياسمين');
    const rClient = setReactValue(clientInp, 'د. حسام عبد العزيز');
    const rArea = setReactValue(areaInp, 'التجمع الخامس - القاهرة الجديدة');

    return {
      rName, rClient, rArea,
      nameVal: nameInp ? nameInp.value : null,
      clientVal: clientInp ? clientInp.value : null,
      areaVal: areaInp ? areaInp.value : null
    };
  })()`);

  console.log('Fill result:', fillResult);
  await sleep(1000);
  await cdp.captureScreenshot('10_form_fully_completed');

  console.log('Clicking "تسجيل الموقع"...');
  const submitClicked = await cdp.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('تسجيل الموقع'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  })()`);

  console.log('Submit clicked:', submitClicked);
  await sleep(4000);

  // Capture projects list with the new project
  await cdp.captureScreenshot('11_project_created_successfully');

  // Now click on the newly created project to view its details
  console.log('Clicking on the project card to view project details...');
  const projectOpened = await cdp.evaluate(`(() => {
    const cards = Array.from(document.querySelectorAll('div, tr, h3, h4, a'));
    const projectCard = cards.find(c => c.innerText && c.innerText.includes('تشطيب وتأثيث فيلا الياسمين'));
    if (projectCard) {
      projectCard.click();
      return true;
    }
    return false;
  })()`);

  console.log('Project card clicked:', projectOpened);
  await sleep(3500);

  await cdp.captureScreenshot('12_project_details_phases_and_logs');

  cdp.close();
}

main().catch(console.error);
