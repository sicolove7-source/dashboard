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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('Fetching CDP targets...');
  const res = await fetch('http://127.0.0.1:9222/json');
  const pages = await res.json();
  const page = pages.find((p) => p.type === 'page' && !p.url.startsWith('chrome://'));

  if (!page) {
    console.error('No tab found!');
    process.exit(1);
  }

  console.log(`Target tab: "${page.title}" (${page.url})`);
  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  // 1. Navigate to login
  console.log('Navigating to https://tashteebpro.com/login ...');
  await cdp.evaluate('window.location.href = "https://tashteebpro.com/login"');
  await sleep(3500);

  // 2. Click registration tab
  console.log('Clicking "حساب شركة جديد" tab...');
  const clickedTab = await cdp.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
    const regTab = buttons.find(b => b.innerText.includes('حساب شركة جديد'));
    if (regTab) {
      regTab.click();
      return true;
    }
    return false;
  })()`);
  console.log('Registration tab clicked:', clickedTab);
  await sleep(1500);

  // 3. Fill registration fields
  const uniqueId = Math.floor(1000 + Math.random() * 9000);
  const formData = {
    company: `شركة الأفق للمقاولات والديكور ${uniqueId}`,
    subdomain: `alofok${uniqueId}`,
    adminName: 'م. إبراهيم كمال',
    phone: `010${Math.floor(10000000 + Math.random() * 90000000)}`,
    email: `alofok${uniqueId}@tashteebpro.com`,
    password: 'TestPass@2026'
  };

  console.log('Form data to fill:', formData);

  const fillStatus = await cdp.evaluate(`(() => {
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
    const companyInp = inputs.find(i => (i.placeholder || '').includes('النيل') || (i.placeholder || '').includes('شركة'));
    const subInp = inputs.find(i => (i.placeholder || '').includes('company-name'));
    const nameInp = inputs.find(i => (i.placeholder || '').includes('أحمد حسن') || (i.placeholder || '').includes('المسؤول'));
    const phoneInp = inputs.find(i => i.type === 'tel' || (i.placeholder || '').includes('010'));
    const emailInp = inputs.find(i => i.type === 'email' || (i.placeholder || '').includes('ceo@'));
    const passInp = inputs.find(i => i.type === 'password' || (i.placeholder || '').includes('مرور'));

    const rCompany = setReactValue(companyInp, ${JSON.stringify(formData.company)});
    const rSub = setReactValue(subInp, ${JSON.stringify(formData.subdomain)});
    const rName = setReactValue(nameInp, ${JSON.stringify(formData.adminName)});
    const rPhone = setReactValue(phoneInp, ${JSON.stringify(formData.phone)});
    const rEmail = setReactValue(emailInp, ${JSON.stringify(formData.email)});
    const rPass = setReactValue(passInp, ${JSON.stringify(formData.password)});

    return {
      inputsFound: inputs.length,
      company: companyInp ? companyInp.value : null,
      subdomain: subInp ? subInp.value : null,
      adminName: nameInp ? nameInp.value : null,
      phone: phoneInp ? phoneInp.value : null,
      email: emailInp ? emailInp.value : null,
      passwordLength: passInp ? passInp.value.length : 0,
      rCompany, rSub, rName, rPhone, rEmail, rPass
    };
  })()`);

  console.log('Fill status:', fillStatus);
  await sleep(1000);
  await cdp.captureScreenshot('01_registration_form_filled');

  // 4. Click the exact submit button in the registration form
  console.log('Clicking the green submit button...');
  const submitInfo = await cdp.evaluate(`(() => {
    // Find button inside form with type submit or containing 'إنشاء الحساب'
    const buttons = Array.from(document.querySelectorAll('form button, button'));
    const btn = buttons.find(b => 
      b.innerText.includes('إنشاء الحساب وبدء التجربة المجانية') || 
      b.innerText.includes('إنشاء الحساب')
    );
    if (btn) {
      btn.click();
      return { success: true, text: btn.innerText.trim() };
    }
    return { success: false };
  })()`);

  console.log('Submit button click result:', submitInfo);

  // 5. Poll for registration completion
  console.log('Monitoring post-submission state...');
  let reachedSuccessOrWorkspace = false;

  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const state = await cdp.evaluate(`(() => {
      const text = document.body.innerText || '';
      const url = window.location.href;
      const errorDiv = document.querySelector('[class*="error"], [style*="color: rgb(239, 68, 68)"], [style*="#EF4444"]');
      const errorText = errorDiv ? errorDiv.innerText.trim() : null;
      const isSuccess = text.includes('مبروك') || text.includes('تم إنشاء مساحة') || text.includes('تهانينا') || text.includes('جاهزة للعمل') || text.includes('مساحة العمل المخصصة');
      const isWorkspace = url.includes('subdomain=') || (!url.includes('/login') && !url.includes('/landing'));
      
      const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(Boolean);
      return {
        url,
        isSuccess,
        isWorkspace,
        errorText,
        buttons: buttons.slice(0, 10),
        bodySnippet: text.slice(0, 200).replace(/\\s+/g, ' ')
      };
    })()`);

    console.log(`[T+${i + 1}s] URL: ${state.url} | Success: ${state.isSuccess} | Workspace: ${state.isWorkspace} | Error: ${state.errorText || 'none'}`);

    if (state.errorText) {
      console.log('Registration error detected on page:', state.errorText);
      await cdp.captureScreenshot('02_registration_error');
      break;
    }

    if (state.isSuccess || state.isWorkspace) {
      reachedSuccessOrWorkspace = true;
      console.log('Registration succeeded!');
      await cdp.captureScreenshot('02_registration_success_screen');
      break;
    }
  }

  // 6. If on success screen, click the workspace link or wait for redirect
  if (reachedSuccessOrWorkspace) {
    await sleep(2000);
    const clickedWorkspace = await cdp.evaluate(`(() => {
      const linksAndBtns = Array.from(document.querySelectorAll('a, button'));
      const wsBtn = linksAndBtns.find(b => 
        b.innerText.includes('الانتقال إلى مساحة عمل') ||
        b.innerText.includes('لوحة التحكم') ||
        b.innerText.includes('مساحة العمل') ||
        b.innerText.includes('ابدأ العمل')
      );
      if (wsBtn) {
        wsBtn.click();
        return { clicked: true, text: wsBtn.innerText, href: wsBtn.href };
      }
      return { clicked: false };
    })()`);
    console.log('Workspace transition button:', clickedWorkspace);
    await sleep(5000);
    await cdp.captureScreenshot('03_workspace_loaded');

    // 7. Test workspace sections: Projects, CRM, Settings
    console.log('Testing workspace sections...');
    
    // Test Projects
    const clickProjects = await cdp.evaluate(`(() => {
      const el = Array.from(document.querySelectorAll('a, button, [role="button"], nav div'))
        .find(e => e.innerText.trim() === 'المشاريع' || e.innerText.includes('المشاريع'));
      if (el) { el.click(); return true; }
      return false;
    })()`);
    console.log('Clicked Projects:', clickProjects);
    await sleep(3000);
    await cdp.captureScreenshot('04_projects_page');

    // Test CRM
    const clickCRM = await cdp.evaluate(`(() => {
      const el = Array.from(document.querySelectorAll('a, button, [role="button"], nav div'))
        .find(e => e.innerText.includes('العملاء') || e.innerText.includes('CRM'));
      if (el) { el.click(); return true; }
      return false;
    })()`);
    console.log('Clicked CRM:', clickCRM);
    await sleep(3000);
    await cdp.captureScreenshot('05_crm_page');

    // Test Settings
    const clickSettings = await cdp.evaluate(`(() => {
      const el = Array.from(document.querySelectorAll('a, button, [role="button"], nav div'))
        .find(e => e.innerText.includes('إعدادات') || e.innerText.includes('Settings'));
      if (el) { el.click(); return true; }
      return false;
    })()`);
    console.log('Clicked Settings:', clickSettings);
    await sleep(3000);
    await cdp.captureScreenshot('06_settings_page');
  }

  console.log('=== TEST WORKFLOW COMPLETED ===');
  cdp.close();
}

main().catch(err => {
  console.error('Fatal in test script:', err);
  process.exit(1);
});
