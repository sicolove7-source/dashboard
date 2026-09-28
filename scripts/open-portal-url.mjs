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

  console.log('Finding portal URL or clicking preview...');
  const portalInfo = await cdp.evaluate(`(() => {
    // Check localStorage for active projects or company
    let token = null;
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.includes('projects') || k.includes('comp_')) {
          const val = JSON.parse(localStorage.getItem(k));
          if (Array.isArray(val) && val[0]?.clientPortalToken) {
            token = val[0].clientPortalToken;
            break;
          }
        }
      }
    } catch (e) {}

    return { token, origin: window.location.origin };
  })()`);

  console.log('Found portal info:', portalInfo);

  if (portalInfo.token) {
    const target = `${portalInfo.origin}/portal/${portalInfo.token}`;
    console.log(`Navigating directly to portal: ${target}`);
    await cdp.evaluate('window.location.href = "' + target + '"');
    await sleep(4000);
    await cdp.captureScreenshot('16_public_client_portal_page');
  }

  cdp.close();
}

main().catch(console.error);
