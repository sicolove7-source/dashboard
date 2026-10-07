import crypto from 'crypto';

const FALLBACK_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "tashteeb-67d13",
  private_key_id: "c255ecbefdcde59012a888b97ba3649fc3fa032c",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDMU/2fJKFjP+l2\nucaAql17t1vYnNGJloBWvuqP9cMlJiP5igrA0ThBgHJnCgQB4/57lhe+alJ5OfV2\n75T2mauRzPqfrYYQvHlqD9vvlQDUCXoSjRpZ7blyt6tJtgnWmD57Oo9CtKsB7PYl\npqsofSa5H6dJbAWNFI7j9cp1oWLBaH4TMqc07Y78axZ2x/vu8EIYVbjQK4/0qeeC\nGRtxB/naBu7+QpdV7SCXLeBEHAZTT/aXLmYZLCvIYA7GDOGeMgqpAPQ3oifCmVph\n2Mu+lqMQcTKjJfA9PKLNYVg8x6xQN2VoJWM05AHm1WQ1kzgQPhkxYMMXG+3nhIE5\nRij3VCl1AgMBAAECggEAIuw3FLh0ygseKs/pRMv5gt/tt4nkCWVbBZiHbDgH1MVe\nUDP/DwIjYJSk2QYd9bnDYNmgMMgo1PXqRZwAxJ4ytA6KBnkoyRsBkHZp85quw87j\n2aBa0OR/9gK86LIPn+kxAqxZWIAbG07mKjzAk8DCOdFWbQbksv6AxqcXpb/B6obU\nHM1wXRBYpI/cl02qi+YlKGPtvvPyTyn7+1f2UmH1pPU4v4fCiqEP7A6Zr0tRpQDe\nwZE7Nh8O7kTH0IJE+GLXP5x7OVOKHtZeQi44doz7lnwU2lDudilNPZdQkS7XOrCM\npi/8uM6KoqUDSXoILbOIBY5uYVAxduJYYGTKm5W/kQKBgQD/rWB7RsyL00siU9mY\nNgfC7suW3qBt+wnnRZKjQ2BSIe5osycDdREsfflwiejVjDWWq/UQJXSkVvQ7BBUw\nBUWczQeKuKN7TJ0kk087rjTrsHtfTFiRPE95zyvjlYXfqE93rtZDrEEc5ssi9a5N\nMcKosFKTWmejtyuQ0cd61VVxZQKBgQDMlgUoCgSoEHhnNJ7Y+e5LduCmuFEgorU/\nJFRJ1TCVBS6C/x8qB6Qc5CREWgt+Vr/gQShTWCDLz5Dcc/ULB4+tKXC75aD3ITBv\nuwr5PYbHDz7SNFNGiSDHiyEDq/YittLaygS0eeIj5b+Iify6eBmplNqyT64yy6A4\n6SUltfne0QKBgHtroitgHdVRhe9oMp27VzvOMhD+Hst4Z2twtjyBhbmgD4oTET4m\nAMhNd1/P8slDCYtWLtJAgnHiV7s1WVT49oWeo4lfX+thLGo/gfv5OCqd4rA6Fnbl\neif+zdzqjNlOUi4gA+Ze/H+LGXwixKUW5DSyCOqAtY7eGPWrjnPJD5nRAoGAB3uR\nMrazFuaLUNMG4E673Xy6mL5zESuCT43nm0+12C15Vwc3v5TJ9tiNTwawFu3bVLtt\nWycFBA9ScA25r66WHbI/UlACxCctm1iO/TC35j3zgUKyrQjE7ydyjKzUcs6XBbOP\n2n3+vGthxv+tA7Dy11X/bbgmWetCr/IvDqMKQZECgYEAjNEy1/Pkb+sD5KpiHxF3\nDrKufwyVIxvsrurXDEH/2849KsP/wuSLNxxRwsQMWlqZQtujIVGRKBnNy7gae1yE\nHrZiaOdXBCTyLvJgV3rhTFxE/nRmnvqBR7ibtrDgyfXRJ5sm7a9o+onwDIRXPFPk\nUoG/oR1udKyrO/PfxBRfvxo=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@tashteeb-67d13.iam.gserviceaccount.com"
};

const FIREBASE_API_KEY = "AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM";

let cachedToken = null;
let tokenExpiresAt = 0;

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const parsed = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
      if (parsed?.client_email && typeof parsed?.private_key === 'string' && parsed.private_key.includes('BEGIN PRIVATE KEY')) {
        return {
          ...parsed,
          private_key: parsed.private_key.replace(/\\n/g, '\n')
        };
      }
    } catch (e) {}
  }
  return FALLBACK_SERVICE_ACCOUNT;
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 120) {
    return cachedToken;
  }

  const sa = getServiceAccount();
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600);
  return cachedToken;
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

    // التحقق من هوية المسؤول الطالب للعملية عبر Google Identity Toolkit
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.users || verifyData.users.length === 0) {
      return res.status(401).json({ success: false, error: 'جلسة تسجيل الدخول منتهية أو غير صالحة. يرجى إعادة تسجيل الدخول.' });
    }
    const callerUser = verifyData.users[0];

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

    // الحصول على رمز الدخول الإداري للخدمة السحابية
    const adminToken = await getGoogleAccessToken();
    const projectId = getServiceAccount().project_id || "tashteeb-67d13";

    // البحث عن المستخدم المستهدف
    const lookupBody = targetUid ? { localId: [targetUid] } : { email: [targetEmail] };
    const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(lookupBody)
    });
    const lookupData = await lookupRes.json();
    let targetUser = lookupData.users && lookupData.users.length > 0 ? lookupData.users[0] : null;

    // إذا لم يكن المستخدم موجوداً في Firebase Auth وكان حساب هاتف — ننشئه فوراً
    if (!targetUser && targetEmail) {
      const createRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:signUp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: targetEmail,
          password: newPassword,
          displayName: name || (cPhone ? `موظف (${cPhone})` : targetEmail.split('@')[0]),
          emailVerified: true
        })
      });
      const createData = await createRes.json();
      if (createData.error) {
        return res.status(400).json({ success: false, error: createData.error.message || 'فشل إنشاء الحساب.' });
      }

      console.log('[api/reset-password] Created new user in Auth via REST:', createData.localId, targetEmail);
      return res.status(200).json({
        success: true,
        isNew: true,
        uid: createData.localId,
        email: targetEmail,
        message: 'تم إنشاء حساب الموظف وتفعيل كلمة المرور بنجاح.'
      });
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود في النظام.' });
    }

    // تحديث كلمة المرور للمستخدم الموجود
    const updateRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        localId: targetUser.localId,
        password: newPassword
      })
    });
    const updateData = await updateRes.json();
    if (updateData.error) {
      return res.status(400).json({ success: false, error: updateData.error.message || 'فشل تحديث كلمة المرور.' });
    }

    console.log('[api/reset-password] Updated password for user via REST:', targetUser.localId, targetUser.email);

    return res.status(200).json({
      success: true,
      uid: targetUser.localId,
      email: targetUser.email,
      message: 'تم تحديث كلمة مرور الموظف بنجاح.'
    });

  } catch (err) {
    console.error('[api/reset-password] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ غير متوقع أثناء معالجة الطلب: ' + (err.message || 'Unknown error')
    });
  }
}
