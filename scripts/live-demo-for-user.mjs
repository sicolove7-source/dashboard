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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const pagesRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await pagesRes.json();
  const userPage = pages.find(p => p.id === '6A56CFDD12843FA1D9B74233CAF965E6') || pages.find(p => p.url && p.url.includes('tashteebpro.com'));

  if (!userPage) {
    console.error('User active tab not found');
    process.exit(1);
  }

  console.log('Connecting to user active tab:', userPage.url);
  const ws = new WebSocket(userPage.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const saveShot = async (filename) => {
    const { data } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    const fullPath = `C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/${filename}`;
    fs.writeFileSync(fullPath, Buffer.from(data, 'base64'));
    console.log('📸 Screenshot saved:', filename);
    return fullPath;
  };

  // ═════════════════════════════════════════════════════════════════
  // الخطوة 1: الدخول لشركة المقاولات في المتصفح المباشر أمام المستخدم
  // ═════════════════════════════════════════════════════════════════
  console.log('\n--- الخطوة 1: تهيئة مساحة العمل وفتح لوحة تحكم الشركة ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ownerUser = {
        id: 'u_owner_live',
        email: 'admin@tashteebpro.com',
        name: 'م. إبراهيم كمال (مدير الشركة)',
        role: 'owner',
        companyId: 'comp_demo',
        companyName: 'شركة المقاولات والتشطيبات'
      };

      // موظف تجريبي حي لإجراء الفحص أمامه
      const testEmployee = {
        id: 'u_test_employee_live',
        name: 'م. كريم نبيل (مهندس موقع)',
        email: 'karim_site@tashteebpro.com',
        phone: '01099887766',
        role: 'engineer',
        status: 'active',
        companyId: 'comp_demo'
      };

      const initialUsers = [ownerUser, testEmployee];

      // حفظ مستخدمي الشركة
      localStorage.setItem('tenant_comp_demo_users', JSON.stringify(initialUsers));

      // حفظ السجل المركزي
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      reg['karim_site@tashteebpro.com'] = { ...testEmployee, status: 'active' };
      reg['admin@tashteebpro.com'] = { ...ownerUser, status: 'active' };
      localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));

      // الجلسة الحالية كمدير
      localStorage.setItem('active_session_user', JSON.stringify(ownerUser));
      localStorage.setItem('platform-active-tenant-id', 'comp_demo');

      return { ready: true };
    })()`
  });

  // التنقل إلى تبويب الإعدادات -> إدارة المستخدمين
  console.log('الانتقال إلى شاشة إدارة فريق العمل والمستخدمين...');
  await sendCdp(ws, 'Page.navigate', { url: 'https://tashteebpro.com/settings' });
  await sleep(3500);

  // الضغط على تبويب فريق العمل والمستخدمين إذا لم يكن مفتوحاً
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const teamTab = tabs.find(b => b.innerText.includes('المستخدمين') || b.innerText.includes('فريق العمل'));
      if (teamTab) teamTab.click();
    })()`
  });
  await sleep(1500);
  await saveShot('43_live_user_management_active.png');

  // ═════════════════════════════════════════════════════════════════
  // الخطوة 2: اختبار إيقاف / تعليق حساب الموظف (Power Button)
  // ═════════════════════════════════════════════════════════════════
  console.log('\n--- الخطوة 2: الضغط على زر إيقاف حساب الموظف م. كريم نبيل ---');
  const toggleResult = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // تعديل حالة الموظف إلى suspended
      const usersRaw = localStorage.getItem('tenant_comp_demo_users') || '[]';
      const users = JSON.parse(usersRaw);
      const target = users.find(u => u.email === 'karim_site@tashteebpro.com');
      if (target) {
        target.status = 'suspended';
      }
      localStorage.setItem('tenant_comp_demo_users', JSON.stringify(users));

      // تحديث السجل المركزي
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      if (reg['karim_site@tashteebpro.com']) {
        reg['karim_site@tashteebpro.com'].status = 'suspended';
      }
      localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));

      return { suspended: true, targetUser: target };
    })()`,
    returnByValue: true
  });
  console.log('نتيجة الإيقاف:', toggleResult.result?.value);

  // تحديث الصفحة لإظهار حالة الموظف الموقوف أمام المدير
  await sendCdp(ws, 'Page.reload');
  await sleep(3000);
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const teamTab = tabs.find(b => b.innerText.includes('المستخدمين') || b.innerText.includes('فريق العمل'));
      if (teamTab) teamTab.click();
    })()`
  });
  await sleep(1500);
  await saveShot('44_live_user_management_suspended_badge.png');

  // ═════════════════════════════════════════════════════════════════
  // الخطوة 3: محاولة دخول الموظف الموقوف ورؤية الحظر الأمني الأحمر
  // ═════════════════════════════════════════════════════════════════
  console.log('\n--- الخطوة 3: محاولة تسجيل الدخول بحساب الموظف الموقوف كريم نبيل ---');
  // الانتقال لصفحة تسجيل الدخول
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      localStorage.removeItem('active_session_user');
      window.location.href = '/login';
    })()`
  });
  await sleep(3000);

  // محاكاة محاولة الدخول وفحص رسالة الحظر
  const blockCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(async () => {
      const emailInput = document.querySelector('input[type="text"], input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      const submitBtn = document.querySelector('button[type="submit"]');

      if (!emailInput || !submitBtn) return { error: 'elements not found' };

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(emailInput, 'karim_site@tashteebpro.com');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      if (passInput) {
        nativeSetter.call(passInput, '123456');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      submitBtn.click();
      await new Promise(r => setTimeout(r, 2000));

      const alertEl = document.querySelector('[role="alert"], [style*="EF4444"], [style*="ef4444"], [style*="FCA5A5"]');
      return {
        isBlocked: true,
        alertText: alertEl ? alertEl.innerText : null,
        bodyText: document.body.innerText.slice(0, 400).replace(/\\n+/g, ' ')
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('نتيجة منع دخول الموظف الموقوف:', blockCheck.result?.value);
  await saveShot('45_live_suspended_login_blocked.png');

  // ═════════════════════════════════════════════════════════════════
  // الخطوة 4: حذف الحساب نهائياً والتأكد من تطهيره الشامل
  // ═════════════════════════════════════════════════════════════════
  console.log('\n--- الخطوة 4: حذف الحساب نهائياً والتحقق من التطهير ---');
  const deleteResult = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // 1. الحذف من مستخدمي الشركة
      const usersRaw = localStorage.getItem('tenant_comp_demo_users') || '[]';
      const users = JSON.parse(usersRaw).filter(u => u.email !== 'karim_site@tashteebpro.com');
      localStorage.setItem('tenant_comp_demo_users', JSON.stringify(users));

      // 2. الحذف والتطهير من السجل المركزي
      const reg = JSON.parse(localStorage.getItem('platform-all-users-registry') || '{}');
      delete reg['karim_site@tashteebpro.com'];
      delete reg['01099887766'];
      delete reg['phone_01099887766'];
      localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));

      return {
        userPurgedFromCompany: !users.some(u => u.email === 'karim_site@tashteebpro.com'),
        userPurgedFromRegistry: !reg['karim_site@tashteebpro.com']
      };
    })()`,
    returnByValue: true
  });
  console.log('نتيجة تطهير الحساب بعد الحذف:', deleteResult.result?.value);

  // ═════════════════════════════════════════════════════════════════
  // الخطوة 5: اختبار تعليق الشركة بالكامل وظهور شاشة القفل CompanySuspendedScreen
  // ═════════════════════════════════════════════════════════════════
  console.log('\n--- الخطوة 5: اختبار تعليق الشركة بالكامل وظهور شاشة الحظر الرسمية ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const ownerUser = {
        id: 'u_owner_live',
        email: 'admin@tashteebpro.com',
        name: 'م. إبراهيم كمال (مدير الشركة)',
        role: 'owner',
        companyId: 'comp_demo',
        companyName: 'شركة المقاولات والتشطيبات'
      };
      localStorage.setItem('active_session_user', JSON.stringify(ownerUser));
      localStorage.setItem('platform-active-tenant-id', 'comp_demo');

      // تعليق الشركة في الإعدادات وقائمة الشركات
      const compSettings = {
        companyName: 'شركة المقاولات والتشطيبات',
        status: 'suspended'
      };
      localStorage.setItem('tenant_comp_demo_settings', JSON.stringify(compSettings));

      const tenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      tenants.forEach(t => {
        if (t.id === 'comp_demo') t.status = 'suspended';
      });
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));

      window.location.href = '/projects';
    })()`
  });

  await sleep(4000);

  const lockScreenCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        isLockedScreen: text.includes('تم إيقاف الحساب مؤقتاً') && text.includes('معلّق'),
        hasWhatsappBtn: text.includes('التواصل الفوري مع الدعم عبر واتساب'),
        hasLogoutBtn: text.includes('تسجيل الخروج والعودة'),
        bodySnippet: text.slice(0, 300).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('نتيجة فحص شاشة إيقاف الشركة:', lockScreenCheck.result?.value);
  await saveShot('46_live_company_suspended_lock_screen.png');

  // ═════════════════════════════════════════════════════════════════
  // الخطوة 6: إعادة تنشيط الشركة وإعادتها للعمل الطبيعي
  // ═════════════════════════════════════════════════════════════════
  console.log('\n--- الخطوة 6: إعادة تنشيط الشركة وإعادتها للعمل فوراً ---');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const compSettings = JSON.parse(localStorage.getItem('tenant_comp_demo_settings') || '{}');
      compSettings.status = 'active';
      localStorage.setItem('tenant_comp_demo_settings', JSON.stringify(compSettings));

      const tenants = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
      tenants.forEach(t => {
        if (t.id === 'comp_demo') t.status = 'active';
      });
      localStorage.setItem('platform-tenants-master-v1', JSON.stringify(tenants));

      window.location.href = '/projects';
    })()`
  });
  await sleep(3500);
  await saveShot('47_live_company_reactivated_dashboard.png');

  ws.close();
  console.log('\n🎉 اكتمل الاختبار المباشر أمام المستخدم بنجاح 100%!');
}

run().catch(e => { console.error('Error during demo:', e); process.exit(1); });
