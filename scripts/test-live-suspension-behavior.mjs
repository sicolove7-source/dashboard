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
  const page = pages.find((p) => p.type === 'page' && p.url.includes('tashteebpro.com'));
  if (!page) {
    throw new Error('No tashteebpro page found in browser');
  }
  console.log('Connecting to page:', page.url);
  const cdp = new CDPClient(page.webSocketDebuggerUrl);
  await cdp.connect();

  // Test 1: Check how the platform stores and resolves suspended company
  const suspensionCheck = await cdp.evaluate(`(() => {
    // Check localStorage tenants
    const rawTenants = localStorage.getItem('platform-tenants-master-v1');
    const tenants = rawTenants ? JSON.parse(rawTenants) : [];
    
    // Check current tenant
    const currentTenantId = localStorage.getItem('tashteeb_active_tenant_id') || 'comp_alofok2948';
    const tenant = tenants.find(t => t.id === currentTenantId);

    // Check registry
    const rawReg = localStorage.getItem('platform-all-users-registry');
    const reg = rawReg ? JSON.parse(rawReg) : {};

    // Check company users
    const rawUsers = localStorage.getItem(\`tenant_\${currentTenantId}_users\`);
    const users = rawUsers ? JSON.parse(rawUsers) : [];

    return {
      currentTenantId,
      tenantStatus: tenant?.status || 'active',
      totalTenants: tenants.length,
      usersCount: users.length,
      sampleUsers: users.map(u => ({ id: u.id, email: u.email, role: u.role, status: u.status })),
      registryKeysCount: Object.keys(reg).length
    };
  })()`);

  console.log('=== CURRENT SYSTEM STATE ===');
  console.log(JSON.stringify(suspensionCheck, null, 2));

  // Test 2: If we mark the tenant as suspended in localStorage/tenants, does App.jsx block it?
  console.log('\n--- SIMULATING SUSPENSION: Setting tenant status = "suspended" ---');
  const simulateSuspend = await cdp.evaluate(`(() => {
    const rawTenants = localStorage.getItem('platform-tenants-master-v1');
    const tenants = rawTenants ? JSON.parse(rawTenants) : [];
    const currentTenantId = localStorage.getItem('tashteeb_active_tenant_id') || 'comp_alofok2948';
    
    // Mark as suspended
    const updated = tenants.map(t => t.id === currentTenantId ? { ...t, status: 'suspended' } : t);
    localStorage.setItem('platform-tenants-master-v1', JSON.stringify(updated));
    return { currentTenantId, suspendedSet: true };
  })()`);
  console.log('Suspended flag set:', simulateSuspend);

  // Reload page to see if system blocks suspended company or lets them in
  console.log('Reloading page with suspended status...');
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(4000);

  // Check if page blocked access or still shows dashboard
  const postReloadCheck = await cdp.evaluate(`(() => {
    const bodyText = document.body.innerText;
    const isBlocked = bodyText.includes('تم تعليق الحساب') || 
                      bodyText.includes('الحساب موقوف') || 
                      bodyText.includes('يرجى التواصل مع الإدارة') ||
                      bodyText.includes('Suspended');
    const isDashboardVisible = !!document.querySelector('.projects-grid, .project-detail-header, nav, .panel, h1, h2');
    const titleText = document.querySelector('h1, h2')?.innerText;
    return {
      isBlocked,
      isDashboardVisible,
      titleText,
      url: window.location.href,
      bodySnippet: bodyText.slice(0, 150).replace(/\\s+/g, ' ')
    };
  })()`);

  console.log('\n=== RESULT AFTER SUSPENDING COMPANY ===');
  console.log(JSON.stringify(postReloadCheck, null, 2));
  await cdp.captureScreenshot('32_test_suspended_company_behavior');

  // Test 3: What about deleted user?
  // Let's check if deleted user still remains in platform-all-users-registry
  console.log('\n--- TESTING DELETED USER BEHAVIOR ---');
  const deleteTest = await cdp.evaluate(`(() => {
    const currentTenantId = localStorage.getItem('tashteeb_active_tenant_id') || 'comp_alofok2948';
    const rawUsers = localStorage.getItem(\`tenant_\${currentTenantId}_users\`);
    let users = rawUsers ? JSON.parse(rawUsers) : [];
    
    // Pick an employee
    const employee = users.find(u => u.role !== 'owner');
    if (!employee) return { error: 'No employee found' };

    // Simulate delete as done by handleDelete:
    const remainingUsers = users.filter(u => u.id !== employee.id);
    localStorage.setItem(\`tenant_\${currentTenantId}_users\`, JSON.stringify(remainingUsers));

    // Check registry
    const rawReg = localStorage.getItem('platform-all-users-registry');
    const reg = rawReg ? JSON.parse(rawReg) : {};

    const stillInRegistry = !!reg[employee.email];
    return {
      deletedEmployee: employee.email,
      remainingCount: remainingUsers.length,
      stillInRegistry,
      registryEntry: reg[employee.email]
    };
  })()`);

  console.log('Delete test result:', JSON.stringify(deleteTest, null, 2));

  // RESTORE TENANT STATUS TO ACTIVE SO WE DON'T LEAVE IT BROKEN
  await cdp.evaluate(`(() => {
    const rawTenants = localStorage.getItem('platform-tenants-master-v1');
    const tenants = rawTenants ? JSON.parse(rawTenants) : [];
    const currentTenantId = localStorage.getItem('tashteeb_active_tenant_id') || 'comp_alofok2948';
    const updated = tenants.map(t => t.id === currentTenantId ? { ...t, status: 'active' } : t);
    localStorage.setItem('platform-tenants-master-v1', JSON.stringify(updated));
  })()`);

  cdp.close();
  console.log('Testing finished!');
}

main().catch(console.error);
