let adminApp = null;
let adminAuth = null;

async function getAdminAuth() {
  if (adminAuth) return adminAuth;

  let serviceAccount = null;

  // 1. فحص متغير البيئة المخصص لـ Vercel
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
    } catch (e) {
      console.warn('[api/reset-password] Error parsing FIREBASE_SERVICE_ACCOUNT env:', e.message);
    }
  }

  // 2. فحص ملف serviceAccountKey.json المحلي إذا وُجد
  if (!serviceAccount) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const candidatePaths = [
        path.join(process.cwd(), 'serviceAccountKey.json'),
        path.join(process.cwd(), 'dashboard', 'serviceAccountKey.json'),
        path.resolve('serviceAccountKey.json')
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        }
      }
    } catch (e) {}
  }

  if (!serviceAccount) {
    throw new Error('Firebase Service Account Key not found in environment.');
  }

  if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  const apps = getApps();
  adminApp = apps.length > 0 ? apps[0] : initializeApp({
    credential: cert(serviceAccount)
  }, 'tashteeb-admin-vercel');

  adminAuth = getAuth(adminApp);
  return adminAuth;
}

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return phone.toString().replace(/[^0-9]/g, '');
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'غير مصرح: يجب توفير رمز الدخول (Authorization Bearer).' });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let auth;
    try {
      auth = await getAdminAuth();
    } catch (keyErr) {
      console.error('[api/reset-password] Admin auth init failed:', keyErr);
      return res.status(500).json({ success: false, error: 'لم يتم العثور على مفتاح الخدمة FIREBASE_SERVICE_ACCOUNT على السيرفر.' });
    }

    // التحقق من هوية المسؤول الطالب للعملية
    let callerUser;
    try {
      callerUser = await auth.verifyIdToken(idToken);
    } catch (authErr) {
      return res.status(401).json({ success: false, error: 'جلسة تسجيل الدخول منتهية أو غير صالحة. يرجى إعادة تسجيل الدخول.' });
    }

    const { phone, email, newPassword, targetUid, name } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.' });
    }

    // تحديد البريد الإلكتروني المستهدف
    let targetEmail = (email || '').trim().toLowerCase();
    const cPhone = cleanPhoneNumber(phone);

    if (!targetEmail && cPhone) {
      targetEmail = `phone_${cPhone}@tashteeb.app`;
    }

    if (!targetEmail && !targetUid) {
      return res.status(400).json({ success: false, error: 'رقم الهاتف أو البريد الإلكتروني مطلوب.' });
    }

    let userRecord = null;
    try {
      if (targetUid) {
        userRecord = await auth.getUser(targetUid);
      } else if (targetEmail) {
        userRecord = await auth.getUserByEmail(targetEmail);
      }
    } catch (findErr) {
      if (findErr.code === 'auth/user-not-found') {
        userRecord = null;
      } else {
        throw findErr;
      }
    }

    // إذا لم يكن المستخدم موجوداً في Firebase Auth وكان رقم هاتف — ننشئه فوراً بكلمة المرور الجديدة
    if (!userRecord && targetEmail) {
      userRecord = await auth.createUser({
        email: targetEmail,
        password: newPassword,
        displayName: name || (cPhone ? `موظف (${cPhone})` : targetEmail.split('@')[0]),
        emailVerified: true
      });
      console.log('[api/reset-password] Created new user in Auth:', userRecord.uid, targetEmail);
      return res.status(200).json({
        success: true,
        isNew: true,
        uid: userRecord.uid,
        email: targetEmail,
        message: 'تم إنشاء حساب الموظف وتفعيل كلمة المرور بنجاح.'
      });
    }

    if (!userRecord) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود في النظام.' });
    }

    // تحديث كلمة المرور للمستخدم الموجود
    await auth.updateUser(userRecord.uid, {
      password: newPassword
    });

    console.log('[api/reset-password] Updated password for user:', userRecord.uid, userRecord.email);
    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: 'تم تحديث كلمة المرور للموظف بنجاح.'
    });

  } catch (err) {
    console.error('[api/reset-password] Server error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'حدث خطأ غير متوقع أثناء تحديث كلمة المرور.'
    });
  }
}
