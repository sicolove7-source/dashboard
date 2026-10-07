import fs from 'fs';

async function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  const pagesRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await pagesRes.json();
  const alofokPage = pages.find(p => p.url && p.url.includes('alofok2948.tashteebpro.com'));

  console.log('Connecting to alofok page...');
  const ws = new WebSocket(alofokPage.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  // 1. Get stored user or tenant info
  const info = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const regRaw = localStorage.getItem('platform-all-users-registry') || '{}';
      const reg = JSON.parse(regRaw);
      const tenantsRaw = localStorage.getItem('platform-tenants-master-v1') || '[]';
      const tenants = JSON.parse(tenantsRaw);
      const alofokTenant = tenants.find(t => t.subdomain === 'alofok2948') || tenants[0];

      return {
        tenant: alofokTenant,
        regKeys: Object.keys(reg),
        users: alofokTenant?.users
      };
    })()`,
    returnByValue: true
  });
  console.log('Tenant info:', info.result?.value);

  const testEmail = info.result?.value?.tenant?.adminEmail || 'alofok2948@company.com';

  // 2. Set tenant to suspended
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const tenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      tenants.forEach(t => {
        if (t.subdomain === 'alofok2948' || t.id.includes('alofok')) {
          t.status = 'suspended';
        }
      });
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));

      // Also mark in registry
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      for (const k in reg) {
        if (reg[k].companyId && reg[k].companyId.includes('alofok')) {
          // company is suspended
        }
      }
      return { ok: true };
    })()`
  });

  // 3. Try to log in as user while company is suspended
  const loginAttempt = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      // Find input fields
      const emailInput = document.querySelector('input[type="text"], input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      const submitBtn = document.querySelector('button[type="submit"]');

      if (!emailInput || !passInput || !submitBtn) {
        return { error: 'Login elements not found' };
      }

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

      // Fill in credentials
      nativeSetter.call(emailInput, '${testEmail}');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));

      nativeSetter.call(passInput, 'Tashteeb@2026');
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Click submit
      submitBtn.click();

      // Wait 3s for async login check
      await new Promise(r => setTimeout(r, 3000));

      const alertEl = document.querySelector('[role="alert"], [style*="EF4444"], [style*="ef4444"], [style*="FCA5A5"]');
      return {
        alertText: alertEl ? alertEl.innerText : null,
        bodyText: document.body.innerText.slice(0, 450).replace(/\\n+/g, ' ')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Login attempt result:', loginAttempt.result?.value);

  // Take screenshot of the blocked login
  const { data: shot } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/37_suspended_company_login_blocked_live.png', Buffer.from(shot, 'base64'));
  console.log('Saved screenshot: 37_suspended_company_login_blocked_live.png');

  // 4. Restore company to active
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const tenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      tenants.forEach(t => t.status = 'active');
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));
    })()`
  });

  ws.close();
  console.log('✅ Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
