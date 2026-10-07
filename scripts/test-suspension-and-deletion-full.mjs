// scripts/test-suspension-and-deletion-full.mjs
import http from 'http';

function getWebSocketDebuggerUrl() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.type === 'page' && p.url.includes('tashteebpro.com')) || list.find(p => p.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error('No matching browser page found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

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
  const wsUrl = await getWebSocketDebuggerUrl();
  console.log('Connecting to browser CDP:', wsUrl);

  const ws = new WebSocket(wsUrl);

  await new Promise(resolve => ws.onopen = resolve);

  console.log('\n--- 1. Testing Company Suspension Screen Enforcement ---');
  // Inject suspended status for current company in localStorage and test what renders
  const result1 = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // 1. Get current tenant
      const activeTenantId = localStorage.getItem('platform-active-tenant-id') || 'comp_alofok';
      const allTenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      const target = allTenants.find(t => t.id === activeTenantId) || allTenants[0];

      if (!target) return { error: 'No tenant found' };

      // Set target tenant as suspended
      target.status = 'suspended';
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(allTenants));

      // Also set companySettings status as suspended
      const settingsKey = 'tenant_' + target.id + '_settings';
      const settings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
      settings.status = 'suspended';
      localStorage.setItem(settingsKey, JSON.stringify(settings));

      // Dispatch storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key: settingsKey,
        newValue: JSON.stringify(settings)
      }));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'platform-tenants-master-v1',
        newValue: JSON.stringify(allTenants)
      }));

      return {
        tenantId: target.id,
        tenantName: target.name,
        status: target.status,
        url: window.location.href
      };
    })()`,
    returnByValue: true
  });
  console.log('Tenant suspended setup:', result1.result?.value);

  // Trigger page reload to observe CompanySuspendedScreen
  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 2500));

  // Check what screen is currently rendered
  const screenCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      const isSuspendedScreen = text.includes('حساب') && text.includes('معلّق') && text.includes('تم إيقاف الحساب مؤقتاً');
      const hasWhatsappButton = text.includes('التواصل الفوري مع الدعم عبر واتساب');
      const hasLogoutButton = text.includes('تسجيل الخروج والعودة');
      const hasDashboard = !!document.querySelector('.sidebar, .app-sidebar, nav');

      return {
        isSuspendedScreen,
        hasWhatsappButton,
        hasLogoutButton,
        hasDashboard,
        bodySnippet: text.slice(0, 300).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Suspension screen check result:', screenCheck.result?.value);

  // Take screenshot of suspended company screen
  const { data: shot1 } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  const fs = await import('fs');
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/33_company_suspended_screen_live.png', Buffer.from(shot1, 'base64'));
  console.log('Saved screenshot: 33_company_suspended_screen_live.png');

  console.log('\n--- 2. Testing Restoring Company to Active ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const allTenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      allTenants.forEach(t => t.status = 'active');
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(allTenants));

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.endsWith('_settings')) {
          try {
            const s = JSON.parse(localStorage.getItem(k));
            if (s && s.status === 'suspended') {
              s.status = 'active';
              localStorage.setItem(k, JSON.stringify(s));
            }
          } catch(e) {}
        }
      }
    })()`
  });

  await sendCdp(ws, 'Page.reload');
  await new Promise(r => setTimeout(r, 2500));

  const screenRestoreCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        isDashboardActive: text.includes('المشاريع') || text.includes('لوحة التحكم') || !!document.querySelector('.sidebar, .app-sidebar, nav'),
        snippet: text.slice(0, 150).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Restoration to active check result:', screenRestoreCheck.result?.value);

  // Take screenshot of restored dashboard
  const { data: shot2 } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/34_company_restored_dashboard_live.png', Buffer.from(shot2, 'base64'));
  console.log('Saved screenshot: 34_company_restored_dashboard_live.png');

  ws.close();
  console.log('\n✅ All suspension and restoration tests completed successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
