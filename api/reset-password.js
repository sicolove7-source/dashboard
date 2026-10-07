let adminApp = null;
let adminAuth = null;

const FALLBACK_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "tashteeb-67d13",
  private_key_id: "c255ecbefdcde59012a888b97ba3649fc3fa032c",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDMU/2fJKFjP+l2\nucaAql17t1vYnNGJloBWvuqP9cMlJiP5igrA0ThBgHJnCgQB4/57lhe+alJ5OfV2\n75T2mauRzPqfrYYQvHlqD9vvlQDUCXoSjRpZ7blyt6tJtgnWmD57Oo9CtKsB7PYl\npqsofSa5H6dJbAWNFI7j9cp1oWLBaH4TMqc07Y78axZ2x/vu8EIYVbjQK4/0qeeC\nGRtxB/naBu7+QpdV7SCXLeBEHAZTT/aXLmYZLCvIYA7GDOGeMgqpAPQ3oifCmVph\n2Mu+lqMQcTKjJfA9PKLNYVg8x6xQN2VoJWM05AHm1WQ1kzgQPhkxYMMXG+3nhIE5\nRij3VCl1AgMBAAECggEAIuw3FLh0ygseKs/pRMv5gt/tt4nkCWVbBZiHbDgH1MVe\nUDP/DwIjYJSk2QYd9bnDYNmgMMgo1PXqRZwAxJ4ytA6KBnkoyRsBkHZp85quw87j\n2aBa0OR/9gK86LIPn+kxAqxZWIAbG07mKjzAk8DCOdFWbQbksv6AxqcXpb/B6obU\nHM1wXRBYpI/cl02qi+YlKGPtvvPyTyn7+1f2UmH1pPU4v4fCiqEP7A6Zr0tRpQDe\nwZE7Nh8O7kTH0IJE+GLXP5x7OVOKHtZeQi44doz7lnwU2lDudilNPZdQkS7XOrCM\npi/8uM6KoqUDSXoILbOIBY5uYVAxduJYYGTKm5W/kQKBgQD/rWB7RsyL00siU9mY\nNgfC7suW3qBt+wnnRZKjQ2BSIe5osycDdREsfflwiejVjDWWq/UQJXSkVvQ7BBUw\nBUWczQeKuKN7TJ0kk087rjTrsHtfTFiRPE95zyvjlYXfqE93rtZDrEEc5ssi9a5N\nMcKosFKTWmejtyuQ0cd61VVxZQKBgQDMlgUoCgSoEHhnNJ7Y+e5LduCmuFEgorU/\nJFRJ1TCVBS6C/x8qB6Qc5CREWgt+Vr/gQShTWCDLz5Dcc/ULB4+tKXC75aD3ITBv\nuwr5PYbHDz7SNFNGiSDHiyEDq/YittLaygS0eeIj5b+Iify6eBmplNqyT64yy6A4\n6SUltfne0QKBgHtroitgHdVRhe9oMp27VzvOMhD+Hst4Z2twtjyBhbmgD4oTET4m\nAMhNd1/P8slDCYtWLtJAgnHiV7s1WVT49oWeo4lfX+thLGo/gfv5OCqd4rA6Fnbl\neif+zdzqjNlOUi4gA+Ze/H+LGXwixKUW5DSyCOqAtY7eGPWrjnPJD5nRAoGAB3uR\nMrazFuaLUNMG4E673Xy6mL5zESuCT43nm0+12C15Vwc3v5TJ9tiNTwawFu3bVLtt\nWycFBA9ScA25r66WHbI/UlACxCctm1iO/TC35j3zgUKyrQjE7ydyjKzUcs6XBbOP\n2n3+vGthxv+tA7Dy11X/bbgmWetCr/IvDqMKQZECgYEAjNEy1/Pkb+sD5KpiHxF3\nDrKufwyVIxvsrurXDEH/2849KsP/wuSLNxxRwsQMWlqZQtujIVGRKBnNy7gae1yE\nHrZiaOdXBCTyLvJgV3rhTFxE/nRmnvqBR7ibtrDgyfXRJ5sm7a9o+onwDIRXPFPk\nUoG/oR1udKyrO/PfxBRfvxo=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@tashteeb-67d13.iam.gserviceaccount.com",
  client_id: "111930470391050217915",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40tashteeb-67d13.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

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

  // 3. استخدام المفتاح السحابي الاحتياطي المضمّن لبيئة السيرفر
  if (!serviceAccount) {
    serviceAccount = FALLBACK_SERVICE_ACCOUNT;
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
      return res.status(500).json({ success: false, error: 'تعذر تهيئة صلاحيات الخادم.' });
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
