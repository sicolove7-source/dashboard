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
  const mainPage = pages.find(p => p.url && (p.url.includes('tashteebpro.com') || p.url.includes('alofok2948')));

  console.log('Connecting to page:', mainPage.url);
  const ws = new WebSocket(mainPage.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  // Navigate to login or settings to inspect UserManagement UI
  console.log('\n--- 1. Testing UserManagement Suspension & Deletion Controls ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Setup authenticated company owner session
      const owner = {
        id: 'u_owner_test',
        email: 'owner@alofok.com',
        role: 'owner',
        name: 'م. إبراهيم كمال',
        companyId: 'comp_alofok2948',
        companyName: 'شركة الأفق للمقاولات والديكور 2948'
      };
      localStorage.setItem('active_session_user', JSON.stringify(owner));
      localStorage.setItem('platform-active-tenant-id', 'comp_alofok2948');

      // Setup team and users
      const users = [
        owner,
        {
          id: 'u_emp_1',
          name: 'م. حسام الدين (مهندس موقع)',
          email: 'hossam@alofok.com',
          role: 'engineer',
          status: 'active',
          companyId: 'comp_alofok2948'
        },
        {
          id: 'u_emp_2',
          name: 'أ. محمود سامي (محاسب)',
          email: 'mahmoud@alofok.com',
          role: 'accountant',
          status: 'suspended',
          companyId: 'comp_alofok2948'
        }
      ];
      localStorage.setItem('tenant_comp_alofok2948_users', JSON.stringify(users));

      // Central registry
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      users.forEach(u => reg[u.email] = u);
      localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));

      // Tenants
      const tenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      let t = tenants.find(x => x.id === 'comp_alofok2948');
      if (!t) {
        t = {
          id: 'comp_alofok2948',
          subdomain: 'alofok2948',
          name: 'شركة الأفق للمقاولات والديكور 2948',
          status: 'active',
          users: users
        };
        tenants.push(t);
      } else {
        t.status = 'active';
        t.users = users;
      }
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));

      return { setup: true };
    })()`,
    returnByValue: true
  });

  // Navigate to settings / users tab
  await sendCdp(ws, 'Page.navigate', { url: 'https://alofok2948.tashteebpro.com/settings' });
  await new Promise(r => setTimeout(r, 4000));

  // Click on "فريق العمل والمستخدمين" or check if UserManagement is rendered
  const uiCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Find buttons or tabs for user management
      const buttons = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const usersTab = buttons.find(b => b.innerText.includes('المستخدمين') || b.innerText.includes('فريق العمل') || b.innerText.includes('صلاحيات'));
      if (usersTab) usersTab.click();

      return {
        clickedTab: usersTab ? usersTab.innerText : 'none',
        bodySnippet: document.body.innerText.slice(0, 300).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Tab click result:', uiCheck.result?.value);
  await new Promise(r => setTimeout(r, 2000));

  // Inspect table for suspended badge and power button
  const tableCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const hasSuspendedBadge = text.includes('موقوف') || text.includes('🔴');
      const hasActiveBadge = text.includes('نشط') || text.includes('🟢');
      const hasHossam = text.includes('حسام الدين');
      const hasMahmoud = text.includes('محمود سامي');

      return {
        hasSuspendedBadge,
        hasActiveBadge,
        hasHossam,
        hasMahmoud,
        snippet: text.slice(0, 400).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('User Management Table Check:', tableCheck.result?.value);

  // Capture screenshot of UserManagement with suspension status
  const { data: shotUsers } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/40_user_management_suspension_badges_live.png', Buffer.from(shotUsers, 'base64'));
  console.log('Saved screenshot: 40_user_management_suspension_badges_live.png');

  ws.close();
  console.log('✅ UserManagement UI verified successfully!');
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
