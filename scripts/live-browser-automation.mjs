import fs from 'fs';
import path from 'path';

// Artifacts directory for screenshots
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
    const filename = `${name}_${Date.now()}.png`;
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLiveTest() {
  console.log('Connecting to browser at 127.0.0.1:9222...');
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find((p) => p.url.includes('tashteebpro.com') || p.type === 'page');

  if (!page) {
    console.error('No suitable page found on port 9222!');
    process.exit(1);
  }

  console.log(`Found page: "${page.title}" (${page.url})`);
  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  console.log('CDP connected successfully.');

  // 1. Ensure we are on login page
  const currentUrl = await cdp.evaluate('window.location.href');
  console.log(`Current page URL: ${currentUrl}`);

  if (!currentUrl.includes('/login')) {
    console.log('Navigating to https://tashteebpro.com/login...');
    await cdp.evaluate('window.location.href = "https://tashteebpro.com/login"');
    await sleep(3000);
  }

  await sleep(1000);
  await cdp.captureScreenshot('01_live_login_initial');

  // 2. Click on "حساب شركة جديد" tab
  console.log('Switching to "حساب شركة جديد" tab...');
  const tabSwitched = await cdp.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const regTab = buttons.find(b => b.innerText.includes('حساب شركة جديد'));
    if (regTab) {
      regTab.click();
      return true;
    }
    return false;
  })()`);

  console.log(`Tab switched result: ${tabSwitched}`);
  await sleep(1000);
  await cdp.captureScreenshot('02_registration_tab_opened');

  // 3. Inspect form fields in registration tab
  const formFields = await cdp.evaluate(`(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map(i => ({
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      id: i.id,
      value: i.value
    }));
  })()`);

  console.log('Found registration inputs:', JSON.stringify(formFields, null, 2));

  // 4. Fill in the form
  const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
  const companyName = `شركة النخبة للمقاولات الحديثة ${uniqueSuffix}`;
  const subdomain = `elnekba${uniqueSuffix}`;
  const adminName = 'م. طارق المهدي';
  const adminPhone = `010${Math.floor(10000000 + Math.random() * 90000000)}`;
  const adminEmail = `elnekba${uniqueSuffix}@tashteebpro.com`;
  const password = 'LiveTestPass@2026';

  console.log(`Filling form with:
- Company: ${companyName}
- Subdomain: ${subdomain}
- Admin Name: ${adminName}
- Phone: ${adminPhone}
- Email: ${adminEmail}
- Password: ${password}
  `);

  const fillResult = await cdp.evaluate(`(() => {
    const setNativeValue = (element, value) => {
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value') ?
        Object.getOwnPropertyDescriptor(element, 'value').set :
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set;
      valueSetter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const inputs = Array.from(document.querySelectorAll('input'));
    
    // Subdomain field usually has placeholder with subdomain or 'النطاق' or ends with .tashteebpro.com
    // Company name
    // Admin name
    // Phone
    // Email
    // Password
    
    for (const inp of inputs) {
      const ph = (inp.placeholder || '').toLowerCase();
      const nm = (inp.name || '').toLowerCase();
      const tp = (inp.type || '').toLowerCase();

      if (ph.includes('اسم الشركة') || nm.includes('company') || ph.includes('الشركة')) {
        setNativeValue(inp, ${JSON.stringify(companyName)});
      } else if (ph.includes('نطاق') || ph.includes('subdomain') || nm.includes('subdomain') || ph.includes('mycompany')) {
        setNativeValue(inp, ${JSON.stringify(subdomain)});
      } else if (ph.includes('المدير') || ph.includes('اسمك') || nm.includes('adminname') || ph.includes('المسؤول')) {
        setNativeValue(inp, ${JSON.stringify(adminName)});
      } else if (tp === 'tel' || ph.includes('هاتف') || ph.includes('010') || nm.includes('phone')) {
        setNativeValue(inp, ${JSON.stringify(adminPhone)});
      } else if (tp === 'email' || ph.includes('@') || nm.includes('email') || ph.includes('بريد')) {
        setNativeValue(inp, ${JSON.stringify(adminEmail)});
      } else if (tp === 'password' || ph.includes('كلمة المرور') || nm.includes('password')) {
        setNativeValue(inp, ${JSON.stringify(password)});
      }
    }

    return inputs.map(i => ({ placeholder: i.placeholder, val: i.value, type: i.type }));
  })()`);

  console.log('Inputs after filling:', JSON.stringify(fillResult, null, 2));

  await sleep(1000);
  await cdp.captureScreenshot('03_form_filled_ready_to_submit');

  // 5. Submit registration
  console.log('Clicking registration submit button...');
  const submitResult = await cdp.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find(b => 
      b.innerText.includes('إنشاء الحساب') || 
      b.innerText.includes('التجربة المجانية') ||
      b.innerText.includes('تسجيل شركة') ||
      (b.type === 'submit' && !b.innerText.includes('دخول'))
    );
    if (submitBtn) {
      submitBtn.click();
      return { found: true, text: submitBtn.innerText };
    }
    return { found: false };
  })()`);

  console.log('Submit button clicked:', submitResult);

  // 6. Monitor progress for up to 15 seconds
  console.log('Waiting for response (success screen, redirect, or alert)...');
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const status = await cdp.evaluate(`(() => {
      const text = document.body.innerText;
      const isSuccess = text.includes('مبروك') || text.includes('تم إنشاء') || text.includes('تهانينا') || text.includes('جاهزة للعمل') || text.includes('لوحة التحكم');
      const isError = text.includes('خطأ') || text.includes('مستخدم مسبقاً') || text.includes('فشل');
      const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim());
      return {
        url: window.location.href,
        isSuccess,
        isError,
        buttons: buttons.slice(0, 10),
        snippet: text.slice(0, 300).replace(/\\s+/g, ' ')
      };
    })()`);

    console.log(`[T+${i + 1}s] URL: ${status.url}, Success: ${status.isSuccess}, Error: ${status.isError}`);

    if (status.isSuccess || status.isError || !status.url.includes('/login')) {
      console.log('Significant state change detected!');
      break;
    }
  }

  await sleep(2000);
  await cdp.captureScreenshot('04_after_registration_result');

  // 7. Look for navigation button into workspace
  console.log('Attempting to proceed into company workspace...');
  const proceedResult = await cdp.evaluate(`(() => {
    const linksAndBtns = Array.from(document.querySelectorAll('button, a'));
    const goBtn = linksAndBtns.find(b => 
      b.innerText.includes('الانتقال') || 
      b.innerText.includes('لوحة التحكم') || 
      b.innerText.includes('ابدأ العمل') ||
      b.innerText.includes('مساحة العمل') ||
      b.innerText.includes('الدخول')
    );
    if (goBtn) {
      goBtn.click();
      return { clicked: true, text: goBtn.innerText, href: goBtn.href };
    }
    return { clicked: false };
  })()`);

  console.log('Proceed button result:', proceedResult);
  await sleep(4000);

  const afterProceedUrl = await cdp.evaluate('window.location.href');
  console.log(`Current URL after proceed: ${afterProceedUrl}`);
  await cdp.captureScreenshot('05_after_proceed_screen');

  // 8. Test Navigation inside the platform
  console.log('Testing sidebar and navigation tabs...');
  const navTabs = await cdp.evaluate(`(() => {
    const elements = Array.from(document.querySelectorAll('a, button, [role="button"], nav li'));
    return elements
      .map(e => e.innerText.trim())
      .filter(t => t.length > 2 && t.length < 30)
      .filter((v, i, a) => a.indexOf(v) === i);
  })()`);
  console.log('Navigation elements found:', navTabs);

  // Try clicking "المشاريع"
  const clickProjects = await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('a, button, [role="button"]'))
      .find(e => e.innerText.includes('المشاريع'));
    if (el) { el.click(); return true; }
    return false;
  })()`);
  console.log(`Clicked "المشاريع": ${clickProjects}`);
  await sleep(3000);
  await cdp.captureScreenshot('06_projects_section');

  // Try clicking "العملاء" / CRM
  const clickCRM = await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('a, button, [role="button"]'))
      .find(e => e.innerText.includes('العملاء') || e.innerText.includes('CRM'));
    if (el) { el.click(); return true; }
    return false;
  })()`);
  console.log(`Clicked "العملاء": ${clickCRM}`);
  await sleep(3000);
  await cdp.captureScreenshot('07_crm_section');

  // Try clicking "الإعدادات" / Settings
  const clickSettings = await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('a, button, [role="button"]'))
      .find(e => e.innerText.includes('إعدادات') || e.innerText.includes('Settings'));
    if (el) { el.click(); return true; }
    return false;
  })()`);
  console.log(`Clicked "إعدادات": ${clickSettings}`);
  await sleep(3000);
  await cdp.captureScreenshot('08_settings_section');

  console.log('Live browser automation completed successfully!');
  cdp.close();
}

runLiveTest().catch((err) => {
  console.error('Fatal error during live browser test:', err);
  process.exit(1);
});
