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
  console.log('1. Checking HTTP response from live site https://tashteebpro.com ...');
  const res1 = await fetch('https://tashteebpro.com', { cache: 'no-store' });
  const html1 = await res1.text();
  console.log(`tashteebpro.com status: ${res1.status}`);

  // Find asset script tags in html
  const scriptMatch = html1.match(/\/assets\/[a-zA-Z0-9_\-]+\.js/g);
  console.log('Live assets referenced in HTML:', scriptMatch);

  console.log('2. Checking HTTP response from Firebase Hosting default URL https://tashteeb-67d13.web.app ...');
  const res2 = await fetch('https://tashteeb-67d13.web.app', { cache: 'no-store' });
  const html2 = await res2.text();
  console.log(`tashteeb-67d13.web.app status: ${res2.status}`);
  const scriptMatch2 = html2.match(/\/assets\/[a-zA-Z0-9_\-]+\.js/g);
  console.log('Firebase default hosting assets in HTML:', scriptMatch2);

  // Check local dist index.html
  const localHtml = fs.readFileSync('dist/index.html', 'utf8');
  const localScriptMatch = localHtml.match(/\/assets\/[a-zA-Z0-9_\-]+\.js/g);
  console.log('Local dist assets referenced in HTML:', localScriptMatch);

  // Check if they match
  const matches = JSON.stringify(scriptMatch2) === JSON.stringify(localScriptMatch);
  console.log(`Cloud Firebase bundle matches local build exactly: ${matches}`);

  // 3. Open browser tab and hard refresh live site
  console.log('3. Hard reloading browser tab on live site to confirm visual state...');
  const cdpRes = await fetch('http://127.0.0.1:9222/json');
  const pages = await cdpRes.json();
  const page = pages.find((p) => p.type === 'page' && !p.url.startsWith('chrome://'));

  if (page) {
    const cdp = new CDPClient(page.webSocketDebuggerUrl);
    await cdp.connect();
    
    // Navigate to live tashteebpro.com and reload bypassing cache
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(4000);

    const liveState = await cdp.evaluate(`(() => ({
      title: document.title,
      url: window.location.href,
      bodyPreview: document.body.innerText.slice(0, 200).replace(/\\s+/g, ' ')
    }))()`);
    console.log('Browser Live Page State after reload:', liveState);

    await cdp.captureScreenshot('18_live_site_updated_verified');
    cdp.close();
  }

  console.log('=== VERIFICATION COMPLETED ===');
}

main().catch(console.error);
