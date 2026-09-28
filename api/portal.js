import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCsrivi9P36fdl4DANVdtB_uaBP0X4t8TM",
  authDomain: "tashteeb-67d13.firebaseapp.com",
  projectId: "tashteeb-67d13",
  storageBucket: "tashteeb-67d13.firebasestorage.app",
  messagingSenderId: "527043598350",
  appId: "1:527043598350:web:8f9119be0ddf9dab04045f"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ذاكرة تخزين مؤقتة سريعة في بيئة السيرفر
const memoryCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // دقيقة واحدة

async function ensureSuperAdminAuth() {
  const adminEmail = process.env.FIREBASE_ADMIN_AUTH_EMAIL;
  const adminPassword = process.env.FIREBASE_ADMIN_AUTH_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return;
  }
  if (auth.currentUser && auth.currentUser.email === adminEmail) {
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  } catch (e) {
    console.warn('[api/portal] Admin auth notice:', e.message);
  }
}

function sanitizeProjectForPortal(p, companyId) {
  if (!p) return null;
  return {
    id: p.id || 'p_client',
    projectId: p.id || 'p_client',
    companyId: companyId || p.companyId || null,
    name: p.name || p.title || 'مشروع بدون عنوان',
    client: p.client || 'عميلنا العزيز',
    clientPhone: p.clientPhone || '',
    location: p.location || '',
    type: p.type || 'سكني',
    floors: p.floors || '',
    area: Number(p.area || 0),
    budget: Number(p.budget || p.contractValue || 0),
    contractValue: Number(p.contractValue || p.budget || 0),
    progress: Number(p.progress || 0),
    status: p.status || 'active',
    startDate: p.startDate || '',
    endDate: p.endDate || '',
    dueDate: p.dueDate || '',
    workItems: Array.isArray(p.workItems) ? p.workItems.map(w => ({
      id: w.id,
      name: w.name || w.title,
      progress: w.progress || 0,
      status: w.status || 'pending',
      startDate: w.startDate || '',
      endDate: w.endDate || ''
    })) : [],
    dailyLogs: Array.isArray(p.dailyLogs) ? p.dailyLogs.map(l => ({
      id: l.id,
      date: l.date,
      time: l.time || '',
      author: l.author || 'مهندس الموقع',
      work: l.work || '',
      issues: l.issues || '',
      photos: Array.isArray(l.photos) ? l.photos : []
    })) : [],
    photos: Array.isArray(p.photos) ? p.photos : [],
    sitePhotos: Array.isArray(p.sitePhotos) ? p.sitePhotos : [],
    payments: Array.isArray(p.payments) ? p.payments : (p.clientPayments || []),
    clientPayments: Array.isArray(p.clientPayments) ? p.clientPayments : (p.payments || []),
    clientSignature: p.clientSignature || null,
    clientApprovalDate: p.clientApprovalDate || null,
    clientApprovalNotes: p.clientApprovalNotes || null,
    clientContract: p.clientContract || null,
    clientPortalEnabled: true,
    clientPortalToken: p.clientPortalToken,
    token: p.clientPortalToken,
    engineer: p.engineer || 'مهندس المشروع'
  };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const token = (req.query.token || req.query.id || req.body?.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Missing token parameter' });
  }

  // معالجة توقيع واعتماد العميل إلكترونياً
  if (req.method === 'POST') {
    try {
      await ensureSuperAdminAuth();
      const patch = req.body || {};
      const sanitizedPatch = {
        clientSignature: patch.clientSignature ? String(patch.clientSignature) : '',
        clientApprovalDate: patch.clientApprovalDate ? String(patch.clientApprovalDate) : new Date().toISOString(),
        clientApprovalNotes: patch.clientApprovalNotes ? String(patch.clientApprovalNotes).slice(0, 1000) : '',
        updatedAt: new Date().toISOString()
      };

      // مسح الكاش المؤقت لضمان قراءة التحديث لحظياً
      memoryCache.delete(token);

      // البحث عن المشروع لتحديثه سحابياً
      const metaDoc = await getDoc(doc(db, 'platform_metadata', 'tenants'));
      const tenants = metaDoc.exists() ? (metaDoc.data().tenants || []) : [];
      for (const tenant of tenants) {
        try {
          const pSnap = await getDocs(collection(db, 'companies', tenant.id, 'projects'));
          for (const pDoc of pSnap.docs) {
            if (pDoc.data().clientPortalToken === token) {
              const projectRef = doc(db, 'companies', tenant.id, 'projects', pDoc.id);
              const { setDoc } = await import('firebase/firestore');
              await setDoc(projectRef, sanitizedPatch, { merge: true });
              return res.status(200).json({ success: true, updated: true });
            }
          }
        } catch (e) {}
      }

      return res.status(200).json({ success: true });
    } catch (postErr) {
      return res.status(500).json({ success: false, error: postErr.message });
    }
  }

  // 1. فحص الكاش السريع (للطلبات العادية GET)
  const cached = memoryCache.get(token);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(cached.payload);
  }

  try {
    // 2. فحص portal_shares/{token} المباشر
    try {
      const shareDocRef = doc(db, 'portal_shares', token);
      const shareSnap = await getDoc(shareDocRef);
      if (shareSnap.exists()) {
        const data = shareSnap.data();
        const payload = {
          success: true,
          companyId: data.companyId || null,
          companySettings: data.companySettings || null,
          project: sanitizeProjectForPortal(data, data.companyId)
        };
        memoryCache.set(token, { payload, timestamp: Date.now() });
        return res.status(200).json(payload);
      }
    } catch (e) {
      // Direct share read fallback
    }

    // 3. البحث الشامل في مشاريع الشركات بواسطة حساب النظام المركزي
    await ensureSuperAdminAuth();

    // جلب قائمة الشركات المسجلة
    let tenants = [];
    try {
      const metaDoc = await getDoc(doc(db, 'platform_metadata', 'tenants'));
      if (metaDoc.exists()) {
        tenants = metaDoc.data().tenants || [];
      }
    } catch (e) {}

    // فحص مشاريع كل شركة للبحث عن التوكن
    for (const tenant of tenants) {
      try {
        const pSnap = await getDocs(collection(db, 'companies', tenant.id, 'projects'));
        for (const pDoc of pSnap.docs) {
          const raw = pDoc.data();
          if (raw.clientPortalToken === token) {
            let companySettings = tenant.settings || null;
            if (!companySettings) {
              try {
                const compDoc = await getDoc(doc(db, 'companies', tenant.id));
                if (compDoc.exists()) {
                  companySettings = compDoc.data().settings || null;
                }
              } catch (e) {}
            }

            const payload = {
              success: true,
              companyId: tenant.id,
              companySettings: companySettings,
              project: sanitizeProjectForPortal({ ...raw, id: pDoc.id }, tenant.id)
            };

            memoryCache.set(token, { payload, timestamp: Date.now() });
            return res.status(200).json(payload);
          }
        }
      } catch (err) {}
    }

    // لم يتم العثور على أي مشروع مرتبط بهذا التوكن
    return res.status(404).json({
      success: false,
      error: 'Project not found or portal link disabled'
    });

  } catch (err) {
    console.error('[api/portal] Error resolving portal:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
