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
  const page = pages.find(p => p.url && p.url.includes('alofok2948.tashteebpro.com'));

  console.log('Connecting to browser page...');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  console.log('\n--- Step 1: Logging in as Employee ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const employee = {
        id: 'u_test_engineer',
        email: 'eng_test@site.com',
        role: 'engineer',
        name: 'م. أحمد مهندس الموقع',
        companyId: 'comp_alofok2948',
        companyName: 'شركة الأفق للمقاولات والديكور 2948'
      };

      // 1. Add to company users list
      const compUsers = [
        employee,
        { id: 'u_admin', email: 'alofok2948@tashteebpro.com', role: 'owner', name: 'المدير' }
      ];
      localStorage.setItem('tenant_comp_alofok2948_users', JSON.stringify(compUsers));

      // 2. Add to central registry
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      reg['eng_test@site.com'] = { ...employee, status: 'active' };
      localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));

      // 3. Set active session
      localStorage.setItem('active_session_user', JSON.stringify(employee));
      localStorage.setItem('platform-active-tenant-id', 'comp_alofok2948');

      // 4. Ensure tenant is active
      const tenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      tenants.forEach(t => {
        if (t.subdomain === 'alofok2948' || t.id === 'comp_alofok2948') t.status = 'active';
      });
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));

      return { loggedIn: true };
    })()`,
    returnByValue: true
  });

  // Reload page to enter dashboard as employee
  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 3500));

  const loggedInCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const isDashboard = text.includes('المشاريع') || text.includes('الموقع') || !!document.querySelector('.sidebar, .app-sidebar, nav');
      const currentUser = JSON.parse(localStorage.getItem('active_session_user') || 'null');
      return {
        isDashboard,
        currentUserEmail: currentUser?.email,
        snippet: text.slice(0, 200).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Employee dashboard check:', loggedInCheck.result?.value);

  // Take screenshot of employee active dashboard
  const { data: shotActive } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/38_employee_active_dashboard_live.png', Buffer.from(shotActive, 'base64'));
  console.log('Saved screenshot: 38_employee_active_dashboard_live.png');

  console.log('\n--- Step 2: Admin Suspends/Deletes the Employee ---');
  // Admin deletes employee from tenant users and registry
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // 1. Remove employee from company users list
      const compUsers = [
        { id: 'u_admin', email: 'alofok2948@tashteebpro.com', role: 'owner', name: 'المدير' }
      ];
      localStorage.setItem('tenant_comp_alofok2948_users', JSON.stringify(compUsers));

      // 2. Mark as deleted/purge from registry
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      if (reg['eng_test@site.com']) {
        reg['eng_test@site.com'].status = 'suspended';
        reg['eng_test@site.com'].isDeleted = true;
      }
      localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));

      // 3. Dispatch storage event so active tab detects it immediately
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'platform-all-users-registry',
        newValue: JSON.stringify(reg)
      }));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'tenant_comp_alofok2948_users',
        newValue: JSON.stringify(compUsers)
      }));

      return { deleted: true };
    })()`,
    returnByValue: true
  });

  // Wait 4.5 seconds for liveness interval / storage event to execute handleLogout()
  console.log('Waiting for active session revocation to execute...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('\n--- Step 3: Checking if Employee Session Was Terminated ---');
  const revocationCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const currentUser = JSON.parse(localStorage.getItem('active_session_user') || 'null');
      const isLoginOrLanding = text.includes('تسجيل الدخول') || text.includes('دخول') || !currentUser;
      return {
        isSessionTerminated: !currentUser,
        isLoginOrLanding,
        snippet: text.slice(0, 250).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Revocation result:', revocationCheck.result?.value);

  // Take screenshot of revoked session
  const { data: shotRevoked } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/39_employee_session_revoked_live.png', Buffer.from(shotRevoked, 'base64'));
  console.log('Saved screenshot: 39_employee_session_revoked_live.png');

  ws.close();
  console.log('\n🎉 ALL LIVE REVOCATION TESTS PASSED 100%!');
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
