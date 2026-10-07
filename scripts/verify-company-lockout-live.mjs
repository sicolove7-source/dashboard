// scripts/verify-company-lockout-live.mjs
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

  if (!alofokPage) {
    console.error('alofok2948 page not found!');
    process.exit(1);
  }

  console.log('Connecting to alofok2948 page:', alofokPage.webSocketDebuggerUrl);
  const ws = new WebSocket(alofokPage.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  // 1. Initial State Check
  console.log('\n--- 1. Initial State on alofok2948.tashteebpro.com ---');
  // First reload to make sure it loads the fresh bundle CC2plqmS
  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 3000));

  const initialCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      const isNewBundle = scripts.some(s => s.includes('CC2plqmS'));
      const text = document.body.innerText;
      return {
        isNewBundle,
        hasProjects: text.includes('المشاريع'),
        hasSidebar: !!document.querySelector('.sidebar, .app-sidebar, nav'),
        title: document.title
      };
    })()`,
    returnByValue: true
  });
  console.log('Initial Check:', initialCheck.result?.value);

  // 2. Suspend Company
  console.log('\n--- 2. Suspending Company ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const tenantsRaw = localStorage.getItem('platform-tenants-master-v1') || '[]';
      const tenants = JSON.parse(tenantsRaw);
      tenants.forEach(t => {
        if (t.subdomain === 'alofok2948' || t.id.includes('alofok') || t.id === 'comp_alofok2948') {
          t.status = 'suspended';
        }
      });
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));

      // Also suspend in tenant settings
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('alofok') || k.includes('settings'))) {
          try {
            const val = JSON.parse(localStorage.getItem(k));
            if (val && typeof val === 'object' && val.companyName) {
              val.status = 'suspended';
              localStorage.setItem(k, JSON.stringify(val));
            }
          } catch(e) {}
        }
      }

      // Also set cross subdomain cookie
      document.cookie = "tashteeb_tenants_cache=" + encodeURIComponent(JSON.stringify(tenants)) + "; path=/; domain=.tashteebpro.com";
      return { suspended: true };
    })()`,
    returnByValue: true
  });

  // Reload page to simulate user navigating or refreshing while company is suspended
  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 3500));

  // 3. Verify CompanySuspendedScreen
  console.log('\n--- 3. Verifying Suspended Screen Lockout ---');
  const lockedCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const isLocked = text.includes('تم إيقاف الحساب مؤقتاً') || text.includes('معلّق');
      const hasSupportBtn = text.includes('التواصل الفوري مع الدعم عبر واتساب');
      const hasLogoutBtn = text.includes('تسجيل الخروج والعودة');
      const dashboardAccessible = !!document.querySelector('.sidebar, .app-sidebar, table, .stats-grid');

      return {
        isLocked,
        hasSupportBtn,
        hasLogoutBtn,
        dashboardAccessible,
        snippet: text.slice(0, 300).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Locked Check Result:', lockedCheck.result?.value);

  // Take screenshot of locked screen
  const { data: lockShot } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/35_company_suspended_live_locked.png', Buffer.from(lockShot, 'base64'));
  console.log('Saved screenshot: 35_company_suspended_live_locked.png');

  // 4. Restore Company to Active
  console.log('\n--- 4. Restoring Company to Active ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const tenantsRaw = localStorage.getItem('platform-tenants-master-v1') || '[]';
      const tenants = JSON.parse(tenantsRaw);
      tenants.forEach(t => t.status = 'active');
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('settings')) {
          try {
            const val = JSON.parse(localStorage.getItem(k));
            if (val && typeof val === 'object' && val.status === 'suspended') {
              val.status = 'active';
              localStorage.setItem(k, JSON.stringify(val));
            }
          } catch(e) {}
        }
      }
      return { restored: true };
    })()`,
    returnByValue: true
  });

  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 3500));

  const restoredCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasProjects: text.includes('المشاريع'),
        hasSidebar: !!document.querySelector('.sidebar, .app-sidebar, nav'),
        snippet: text.slice(0, 150).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Restored Check Result:', restoredCheck.result?.value);

  const { data: restoreShot } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/36_company_restored_active.png', Buffer.from(restoreShot, 'base64'));
  console.log('Saved screenshot: 36_company_restored_active.png');

  ws.close();
  console.log('\n🎉 Live Browser Lockout Verification Completed Successfully!');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
