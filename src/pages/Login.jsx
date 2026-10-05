import React, { useState } from "react";
import {
  Building2, Lock, Mail, AlertTriangle, ShieldCheck, User, Phone,
  Sparkles, ArrowRight, CheckCircle2, KeyRound, Eye, EyeOff, X, Globe
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  loginWithEmail,
  logoutUser,
  sendPasswordReset,
  registerWithEmail,
  getUserClaims,
  callAssignUserClaims,
} from "../services/auth";
import {
  resolveTenantUserByEmail,
  registerNewTenant,
  loadAllTenants,
  getTenantData,
} from "../services/tenantsManager";
import { isCompanySubdomain, getSubdomain, getSubdomainUrl, getCrossSubdomainCookie, setCrossSubdomainCookie, removeCrossSubdomainCookie } from "../services/subdomainResolver";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { syncTenantsListToCloud, syncCompanyDataToCloud, cleanPhoneNumber, fetchUserByPhoneFromCloudDirectory, fetchUserFromCloudDirectory } from "../services/cloudSync";

export default function Login({
  onLogin,
  companySettings,
  onBackToLanding,
  initialMode = 'login'
}) {
  const currentSub = isCompanySubdomain() ? getSubdomain() : null;
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const paramCompName = urlParams?.get('company_name');

  let resolvedCompanyName = companySettings?.companyName;
  let resolvedCompanyPhone = companySettings?.phone || companySettings?.supportPhone;
  if (!resolvedCompanyName && currentSub) {
    if (paramCompName) resolvedCompanyName = decodeURIComponent(paramCompName);
    if (!resolvedCompanyName) {
      try {
        const allTenants = loadAllTenants();
        const matched = allTenants.find(t =>
          (t.subdomain || t.slug || t.id || '').toLowerCase().trim() === currentSub ||
          t.id?.toLowerCase().trim() === `comp_${currentSub}`
        );
        if (matched?.name) resolvedCompanyName = matched.name;
        if (matched?.phone && !resolvedCompanyPhone) resolvedCompanyPhone = matched.phone;
      } catch (e) {}
    }
    if (!resolvedCompanyName) {
      try {
        const lastReg = getCrossSubdomainCookie('tashteeb_last_registered_tenant');
        if (lastReg && (lastReg.subdomain?.toLowerCase() === currentSub || lastReg.id === `comp_${currentSub}`)) {
          resolvedCompanyName = lastReg.name;
          if (lastReg.phone && !resolvedCompanyPhone) resolvedCompanyPhone = lastReg.phone;
        }
      } catch (e) {}
    }
    if (!resolvedCompanyName) {
      resolvedCompanyName = currentSub;
    }
  }

  // استخدام هوية الشركة الخاصة إذا كنا على نطاق فرعي للشركة أو إذا تم تفعيل White-label
  const isCompanyPortal = isCompanySubdomain() || (!!companySettings?.isCustomBranding && !!companySettings?.companyLogo);
  const companyName = isCompanyPortal && resolvedCompanyName ? resolvedCompanyName : 'Tashteeb Pro | تشطيب برو';
  const companySubtitle = isCompanyPortal ? 'بوابة إدارة المشروعات والتشطيبات الخاصة بموظفي الشركة' : 'المنصة الذكية لإدارة التشطيبات والمقاولات والمشاريع';
  const companyLogo = (isCompanyPortal && companySettings?.companyLogo) ? companySettings.companyLogo : null;
  const primaryColor = companySettings?.primaryColor || '#1877F2';
  const accentColor = companySettings?.accentColor || '#166FE5';

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState(isCompanyPortal ? 'login' : initialMode);

  // Common State
  const [email, setEmail] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('email');
      return p ? p.trim().toLowerCase() : "";
    } catch (e) {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(null);
  const [registeredTenantInfo, setRegisteredTenantInfo] = useState(null);
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);

  // Register Fields (البيانات الإلزامية لتأسيس مساحة عمل الشركة)
  const [companyTitle, setCompanyTitle] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [phone, setPhone] = useState("");

  // اقتراح تلقائي لامتداد النطاق من اسم الشركة إذا كان به حروف إنجليزية
  const handleCompanyTitleChange = (val) => {
    setCompanyTitle(val);
    if (!subdomainTouched) {
      const latinOnly = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (latinOnly.length >= 3) {
        setSubdomain(latinOnly.slice(0, 25));
      }
    }
  };

  // حالة نافذة استعادة كلمة المرور عبر البريد الإلكتروني الرسمي
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    try {
      // ✅ نمسح فقط الجلسة المحلية القديمة دون عمل signOut لتجنب طرد التابات الأخرى
      try { localStorage.removeItem('active_session_user'); } catch (e) {}


      const rawIdentifier = (email || '').trim();
      if (!rawIdentifier) {
        setError("يرجى إدخال البريد الإلكتروني أو رقم الهاتف.");
        setLoading(false);
        return;
      }

      // فحص هل المدخل هو رقم تليفون أم بريد إلكتروني
      const looksLikePhone = /^[\d\s\+\-\(\)]{7,}$/.test(rawIdentifier) && !rawIdentifier.includes('@');
      const cleanedPhone = looksLikePhone ? cleanPhoneNumber(rawIdentifier) : null;

      let cleanEmail;
      if (cleanedPhone && cleanedPhone.length >= 7) {
        // تحويل رقم التليفون للصيغة الداخلية المستخدمة في Firebase
        cleanEmail = `phone_${cleanedPhone}@tashteeb.app`;
      } else {
        cleanEmail = rawIdentifier.toLowerCase();
        if (!cleanEmail.includes('@')) {
          setError("يرجى إدخال بريد إلكتروني صالح (مثال: name@company.com) أو رقم هاتف صحيح.");
          setLoading(false);
          return;
        }
      }

      // 1. المصادقة عبر Firebase Authentication الرسمي بالبريد الإلكتروني
      let authResult = await loginWithEmail(cleanEmail, password);

      // فحص ذكي إضافي: إذا كان رقم هاتف وفشل بصيغة phone_... نجرب صيغة company.com المعتمدة للحسابات المنشأة سابقاً
      if (!authResult.success && cleanedPhone) {
        const legacyEmail = `${cleanedPhone}@company.com`;
        const legacyAuth = await loginWithEmail(legacyEmail, password);
        if (legacyAuth.success) {
          authResult = legacyAuth;
          cleanEmail = legacyEmail;
        }
      }

      // في حال فشل تسجيل الدخول برقم الهاتف لأن الحساب لم يُنشأ في Firebase Auth بعد:
      if (!authResult.success && (authResult.code === 'auth/invalid-credential' || authResult.code === 'auth/user-not-found' || authResult.code === 'auth/wrong-password')) {
        try {
          let registeredUser = null;
          if (cleanedPhone) {
            registeredUser = await fetchUserByPhoneFromCloudDirectory(cleanedPhone);
          } else {
            registeredUser = await fetchUserFromCloudDirectory(cleanEmail);
          }

          // إذا لم نجده في الدليل السحابي العام، نفحص مستخدمي الشركة الحالية
          if (!registeredUser && currentSub) {
            try {
              const localData = getTenantData(`comp_${currentSub}`) || getTenantData(currentSub);
              if (localData?.users && Array.isArray(localData.users)) {
                registeredUser = localData.users.find(u => {
                  if (cleanedPhone) {
                    if (cleanPhoneNumber(u.phone) === cleanedPhone || cleanPhoneNumber(u.cleanPhone) === cleanedPhone) return true;
                    if (u.email && cleanPhoneNumber(u.email.split('@')[0]) === cleanedPhone) return true;
                  }
                  if (u.email && u.email.toLowerCase() === cleanEmail) return true;
                  return false;
                });
              }
            } catch (e) {}
          }

          if (registeredUser) {
            // إذا كان للمستخدم بريد مسجل في الشركة مختلف عن cleanEmail نجرب تسجيل الدخول به عبر Firebase Auth
            if (!authResult.success && registeredUser.email && registeredUser.email !== cleanEmail) {
              const userEmailAuth = await loginWithEmail(registeredUser.email, password);
              if (userEmailAuth.success) {
                authResult = userEmailAuth;
                cleanEmail = registeredUser.email;
              }
            }
          }
        } catch (autoErr) {
          console.warn('[Login] Employee lookup notice:', autoErr);
        }
      }

      if (authResult.success) {
        // قراءة الـ Custom Claims المشفرة من Google
        let claims = await getUserClaims(authResult.user);
        if (!claims?.companyId && !claims?.role && !claims?.isSuperAdmin) {
          try {
            claims = await getUserClaims(authResult.user, true);
          } catch (e) {}
        }

        // 2. تحديد بيانات الشركة والمستخدم والصلاحيات مع إعادة المحاولة للمستخدمين المسجلين حديثاً
        // السبب: عند التسجيل الجديد، قد لا تكون البيانات السحابية انتشرت بعد
        // لذا نحاول 4 مرات بفواصل زمنية متزايدة قبل إصدار رسالة الخطأ
        const isNewlyRegistered = (() => {
          try {
            const params = new URLSearchParams(window.location.search);
            return params.get('registered') === '1' || isCompanySubdomain();
          } catch (e) { return false; }
        })();

        const MAX_RETRIES = isNewlyRegistered ? 4 : 1;
        const RETRY_DELAYS = [0, 2000, 3000, 4000]; // بالمللي ثانية

        let tenantResult = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            // انتظر قبل المحاولة التالية مع إظهار رسالة للمستخدم
            setError(`⏳ جاري مزامنة بيانات الشركة... (محاولة ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt] || 2000));
            setError(null);
          }
          tenantResult = await resolveTenantUserByEmail(cleanEmail, authResult.user?.uid, claims);
          if (tenantResult?.success) break;
          console.log(`[handleLogin] Attempt ${attempt + 1}/${MAX_RETRIES} failed:`, tenantResult?.error);
        }

        if (tenantResult?.success) {
          // 🔒 فحص عزل الشركات: هل المستخدم على رابط شركة أخرى غير شركته؟
          const currentSub = isCompanySubdomain() ? getSubdomain() : null;
          const userTenant = tenantResult.tenant;
          const roleIsSuperAdmin = tenantResult.isSuperAdmin || tenantResult.user?.role === 'super_admin';

          // 🔒 فحص تعليق المؤسسة
          if (!roleIsSuperAdmin && userTenant?.status === 'suspended') {
            setError(
              <div style={{ textAlign: 'right', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10 }}>
                <div style={{ fontWeight: 800, color: '#EF4444', fontSize: 14, marginBottom: 4 }}>
                  🚫 حساب المؤسسة معلق
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  تم تعليق أو إيقاف حساب شركة <strong>{userTenant.name || 'المؤسسة'}</strong> من قِبل إدارة منصة تشطيب برو. يُرجى مراجعة إدارة المنصة لإعادة التفعيل.
                </div>
              </div>
            );
            setLoading(false);
            return;
          }

          // 🔒 فحص تعليق حساب الموظف
          if (!roleIsSuperAdmin && (tenantResult.user?.status === 'suspended' || tenantResult.user?.status === 'inactive')) {
            setError(
              <div style={{ textAlign: 'right', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10 }}>
                <div style={{ fontWeight: 800, color: '#EF4444', fontSize: 14, marginBottom: 4 }}>
                  🚫 الحساب موقوف
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  تم إيقاف أو تجميد هذا الحساب من قِبل إدارة الشركة. يُرجى مراجعة مدير المؤسسة.
                </div>
              </div>
            );
            setLoading(false);
            return;
          }

          if (currentSub && !roleIsSuperAdmin && userTenant) {
            const userSub = (userTenant.subdomain || userTenant.slug || '').toLowerCase().trim();
            const userId = (userTenant.id || '').toLowerCase().trim();
            const subMatches = userSub === currentSub || userId === currentSub || userId === `comp_${currentSub}` || userId === `comp_c_${currentSub}`;
            if (!subMatches) {
              const correctUrl = getSubdomainUrl(userSub || currentSub);
              setError(
                <div style={{ textAlign: 'right', lineHeight: 1.6 }}>
                  <span>❌ هذا الحساب مسجل في شركة <strong>{userTenant.name || 'أخرى'}</strong> ولا يملك صلاحية الدخول لبوابة هذه الشركة.</span>
                  <div style={{ marginTop: 8 }}>
                    <a
                      href={correctUrl}
                      style={{ color: '#1877F2', fontWeight: 800, textDecoration: 'underline' }}
                    >
                      الانتقال فوراً إلى رابط شركتك ({userSub || userTenant.name}) ←
                    </a>
                  </div>
                </div>
              );
              setLoading(false);
              return;
            }
          }

          try {
            const compId = tenantResult.tenant?.id || tenantResult.user?.companyId;
            if (compId && !roleIsSuperAdmin) {
              const cKey = `tenant_${compId}_users`;
              const raw = localStorage.getItem(cKey);
              let uList = raw ? JSON.parse(raw) : [];
              if (!Array.isArray(uList)) uList = [];
              const cleanP = (tenantResult.user.cleanPhone || tenantResult.user.phone || tenantResult.user.email || '').replace(/\D/g, '');
              const exists = uList.some(u => {
                if (!u) return false;
                if (u.email && tenantResult.user.email && u.email.toLowerCase().trim() === tenantResult.user.email.toLowerCase().trim()) return true;
                const uP = (u.cleanPhone || u.phone || '').replace(/\D/g, '');
                if (uP && cleanP && (uP === cleanP || uP.endsWith(cleanP) || cleanP.endsWith(uP))) return true;
                return false;
              });
              if (!exists) {
                uList.push(tenantResult.user);
                localStorage.setItem(cKey, JSON.stringify(uList));
              }
              const regRaw = localStorage.getItem('platform-all-users-registry');
              const reg = regRaw ? JSON.parse(regRaw) : {};
              if (tenantResult.user.email) reg[tenantResult.user.email.toLowerCase().trim()] = { ...tenantResult.user, companyId: compId };
              if (cleanP) {
                reg[cleanP] = { ...tenantResult.user, companyId: compId };
                reg['phone_' + cleanP] = { ...tenantResult.user, companyId: compId };
              }
              localStorage.setItem('platform-all-users-registry', JSON.stringify(reg));
            }
          } catch (e) {}

          onLogin(tenantResult.user, tenantResult.tenant, tenantResult.isSuperAdmin);
        } else {
          // فحص حذف أو تعليق الشركة أو الموظف في نتيجة المصادقة
          if (tenantResult?.isCompanyDeleted || tenantResult?.error === 'company_deleted' || tenantResult?.error === 'company_not_found') {
            setError(
              <div style={{ textAlign: 'right', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10 }}>
                <div style={{ fontWeight: 800, color: '#EF4444', fontSize: 14, marginBottom: 4 }}>
                  🚫 حساب المؤسسة محذوف أو غير متاح
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {tenantResult.message || 'تم حذف حساب هذه المؤسسة أو إلغاء اشتراكها من قِبل إدارة منصة تشطيب برو.'}
                </div>
              </div>
            );
            try {
              import('../firebase').then(({ auth }) => {
                import('firebase/auth').then(({ signOut }) => signOut(auth));
              });
            } catch (e) {}
          } else if (tenantResult?.isTenantSuspended) {
            setError(
              <div style={{ textAlign: 'right', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10 }}>
                <div style={{ fontWeight: 800, color: '#EF4444', fontSize: 14, marginBottom: 4 }}>
                  🚫 حساب المؤسسة معلق
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {tenantResult.error || 'تم تعليق حساب هذه المؤسسة. يُرجى التواصل مع إدارة منصة تشطيب برو.'}
                </div>
              </div>
            );
          } else if (tenantResult?.isUserSuspended) {
            setError(
              <div style={{ textAlign: 'right', lineHeight: 1.6, padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10 }}>
                <div style={{ fontWeight: 800, color: '#EF4444', fontSize: 14, marginBottom: 4 }}>
                  🚫 الحساب موقوف
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  {tenantResult.error || 'تم إيقاف هذا الحساب من قِبل إدارة الشركة. يرجى مراجعة مسؤول المؤسسة.'}
                </div>
              </div>
            );
          } else if (isCompanySubdomain()) {
            setError(
              <span>
                تعذر التحقق من بيانات الشركة. إذا سجّلت للتو، يرجى الانتظار 30 ثانية وإعادة المحاولة.
                <br />
                إذا استمرت المشكلة، يمكنك الدخول من{' '}
                <a
                  href="https://tashteebpro.com/login"
                  style={{ color: '#1877F2', fontWeight: 700 }}
                >
                  الصفحة الرئيسية
                </a>
                {' '}ببريدك وكلمة مرورك.
              </span>
            );
          } else {
            setError(tenantResult?.error || "تعذر تحديد بيانات الشركة المرتبطة بهذا الحساب أو تم حذفه.");
          }
        }
      } else {
        setError(authResult.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }
    } catch (err) {
      console.error("Login unexpected error:", err);
      setError(err?.message ? `حدث خطأ أثناء المصادقة: ${err.message}` : "حدث خطأ أثناء الاتصال بنظام المصادقة. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };


  const handleOpenForgotModal = () => {
    setError(null);
    setResetSuccess(null);
    // لو المستخدم كاتب رقم تليفون في خانة الدخول — نضع رقمه كمعرف مسبقاً
    const rawId = (email || '').trim();
    const looksPhone = /^[\d\s\+\-\(\)]{7,}$/.test(rawId) && !rawId.includes('@');
    setForgotEmail(looksPhone ? rawId : rawId.toLowerCase());
    setModalError(null);
    setModalSuccess(null);
    setShowForgotModal(true);
  };

  const handleSendPasswordReset = async (e) => {
    e?.preventDefault?.();
    setModalError(null);
    setModalSuccess(null);

    const targetEmail = (forgotEmail || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setModalError("يرجى إدخال بريد إلكتروني صالح.");
      return;
    }

    setModalLoading(true);
    try {
      const res = await sendPasswordReset(targetEmail);
      if (res.success) {
        setModalSuccess(`تم إرسال رابط إعادة تعيين كلمة المرور إلى (${targetEmail}) بنجاح. يرجى مراجعة بريدك الإلكتروني.`);
      } else {
        setModalError(res.error || "تعذر إرسال رابط إعادة تعيين كلمة المرور.");
      }
    } catch (err) {
      setModalError("حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setLoading(true);

    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanCompany = (companyTitle || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanSubdomain = (subdomain || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    if (!cleanCompany) {
      setError('يرجى إدخال اسم شركة المقاولات / مكتب التشطيب.');
      setLoading(false);
      return;
    }

    if (!cleanSubdomain || cleanSubdomain.length < 3) {
      setError('يرجى تحديد امتداد النطاق الفرعي للشركة (3 أحرف إنجليزية على الأقل، مثال: amlak).');
      setLoading(false);
      return;
    }

    if (cleanSubdomain.startsWith('-') || cleanSubdomain.endsWith('-')) {
      setError('امتداد النطاق الفرعي لا يمكن أن يبدأ أو ينتهي بشرطة (-).');
      setLoading(false);
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setError('يرجى إدخال رقم الهاتف والواتساب للتواصل (8 أرقام على الأقل).');
      setLoading(false);
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صالح للدخول (مثال: name@company.com).');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('يرجى إدخال كلمة مرور قوية مكونة من 6 أحرف أو أرقام على الأقل.');
      setLoading(false);
      return;
    }

    // علامة أمان تمنع App.jsx من طرد المستخدم قبل اكتمال التسجيل وربط الشركة
    try { sessionStorage.setItem('is_registering_user', cleanEmail); } catch (e) {}

    try {
      // 1. تسجيل بيانات الشركة والمستخدم أولاً محلياً وسحابياً لتكون جاهزة فور إطلاق حدث المصادقة
      const res = await registerNewTenant({
        companyName: cleanCompany,
        subdomain: cleanSubdomain,
        adminName: adminName?.trim() || 'مدير الشركة',
        phone: cleanPhone,
        email: cleanEmail,
        password: password,
        currency: 'ج.م',
      });

      if (!res.success) {
        try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
        setError(res.error || 'حدث خطأ أثناء إنشاء الحساب.');
        setLoading(false);
        return;
      }

      try {
        const safeLastReg = {
          id: res.tenant?.id,
          name: res.tenant?.name,
          subdomain: res.tenant?.subdomain,
          slug: res.tenant?.slug,
          logo: res.tenant?.logo || null,
          primaryColor: res.tenant?.primaryColor || null,
        };
        setCrossSubdomainCookie('tashteeb_last_registered_tenant', safeLastReg);
      } catch (e) {}

      // 2. توجيه فوري لرابط الشركة المخصص مع حفظ الجلسة مسبقاً للانتقال السلس
      const subUrl = getSubdomainUrl(cleanSubdomain);
      const targetUrl = `${subUrl}${subUrl.includes('?') ? '&' : '?'}email=${encodeURIComponent(cleanEmail)}&registered=1&tenant_id=${encodeURIComponent(res.tenant?.id || '')}&company_name=${encodeURIComponent(cleanCompany)}`;

      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      // ✅ localStorage فقط (per-origin) — لا كوكيز مشتركة للجلسة
      try {
        localStorage.setItem('active_session_user', JSON.stringify(res.user));
      } catch (e) {}

      // انتظار لحظة لتأكيد انتشار البيانات السحابية قبل الانتقال
      setRegisteredTenantInfo({
        companyName: cleanCompany,
        subdomain: cleanSubdomain,
        email: cleanEmail,
        user: res.user,
        tenant: res.tenant,
        subUrl: targetUrl,
      });
      setLoading(false);

      // انتقال تلقائي بعد 3 ثوانٍ لرابط الشركة إذا لم يضغط المستخدم على أي زر
      const autoRedirectTimer = setTimeout(() => {
        try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
        window.location.href = targetUrl;
      }, 6000);
      // حفظ المؤقت لإمكانية إلغائه عند ضغط أزرار يدوية
      window._autoRedirectTimer = autoRedirectTimer;

    } catch (err) {
      try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
      console.error("handleRegister error:", err);
      setError(err?.message ? `تعذر إنشاء الحساب: ${err.message}` : 'تعذر إنشاء الحساب حالياً. يرجى التحقق من اتصال الإنترنت.');
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-gradient, #F0F2F5)",
        backgroundColor: "var(--bg-color, #F0F2F5)",
        padding: "24px 16px",
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: mode === 'register' ? 480 : 420,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          transition: "max-width 0.3s ease",
        }}
      >
        {onBackToLanding && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={onBackToLanding}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <ArrowRight size={14} /> <span>العودة للموقع التعريفي</span>
            </button>
          </div>
        )}

        {/* ─── الشعار والهوية ─── */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 88,
              height: 88,
              borderRadius: 24,
              background: companyLogo ? "#FFFFFF" : isCompanyPortal ? (primaryColor || "#1877F2") : "#0A0F1D",
              boxShadow: companyLogo
                ? "0 10px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)"
                : "0 16px 40px rgba(0, 0, 0, 0.35), 0 0 0 1.5px rgba(56, 189, 248, 0.35)",
              marginBottom: 14,
              overflow: "hidden",
              padding: companyLogo ? 6 : 0,
            }}
          >
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  imageRendering: "-webkit-optimize-contrast"
                }}
              />
            ) : isCompanyPortal ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: primaryColor || '#1877F2' }}>
                <Building2 size={40} color="#fff" />
              </div>
            ) : (
              <img
                src="/app-icon.png"
                alt="Tashteeb Pro"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                }}
              />
            )}
            <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#1877F2' }}>
              <Building2 size={40} color="#fff" />
            </div>
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "var(--ink, #0F172A)",
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
            }}
          >
            {companyName}
          </h1>
          <p style={{ color: "var(--muted, #64748B)", marginTop: 6, fontSize: 13, fontWeight: 500 }}>
            {companySubtitle}
          </p>
        </div>

        {/* ─── البطاقة الرئيسية ─── */}
        <div
          style={{
            background: "var(--card, #FFFFFF)",
            borderRadius: 20,
            border: "1px solid var(--border, #E2E8F0)",
            padding: "28px 24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          {registeredTenantInfo ? (
            /* ══════════════ بطاقة التهنئة وتأكيد رابط النطاق الفرعي ══════════════ */
            <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: "rgba(16,185,129,0.12)", color: "#10B981",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto", fontSize: 28
              }}>
                🎉
              </div>

              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                  مبروك! تم تأسيس مساحة عمل شركتك بنجاح
                </h2>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                  {registeredTenantInfo.companyName}
                </div>
              </div>

              {/* بطاقة الرابط المخصص */}
              <div style={{
                background: "rgba(24,119,242,0.06)",
                border: "1.5px dashed rgba(24,119,242,0.35)",
                borderRadius: 14,
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textAlign: "right"
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1877F2", display: "flex", alignItems: "center", gap: 6 }}>
                  <Globe size={15} />
                  <span>رابط الدخول المخصص الحصري لشركتك وفريقك:</span>
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--card, #fff)",
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "1px solid var(--border)",
                  direction: "ltr",
                  gap: 8,
                }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A", wordBreak: "break-all" }}>
                    {getSubdomainUrl(registeredTenantInfo.subdomain)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getSubdomainUrl(registeredTenantInfo.subdomain));
                      setCopiedSubdomain(true);
                      setTimeout(() => setCopiedSubdomain(false), 2500);
                    }}
                    style={{
                      background: copiedSubdomain ? "#10B981" : "rgba(24,119,242,0.12)",
                      color: copiedSubdomain ? "#fff" : "#1877F2",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Cairo', sans-serif",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {copiedSubdomain ? "✓ تم النسخ" : "نسخ الرابط"}
                  </button>
                </div>

                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                  📌 <strong>كيف تدخل أنت ومهندسو موقعك مستقبلاً؟</strong><br />
                  • <strong>الدخول المباشر:</strong> احفظ هذا الرابط في المتصفح أو أرسله لمهندسي شركتك للدخول المباشر لمساحة عملكم دون المرور بالموقع التعريفي.<br />
                  • <strong>أو عبر المنصة:</strong> يمكنك أيضاً الدخول دائماً من <strong>tashteebpro.com</strong> ببريدك الإلكتروني وكلمة المرور.
                </div>
              </div>

              {/* أزرار المتابعة */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                {/* الزر الرئيسي: الانتقال فوراً للسب-دومين (يعمل في التطوير والإنتاج) */}
                <a
                  href={registeredTenantInfo.subUrl}
                  onClick={() => {
                    try { if (window._autoRedirectTimer) clearTimeout(window._autoRedirectTimer); } catch (e) {}
                    try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
                  }}
                  style={{
                    width: "100%", padding: "12px",
                    background: "linear-gradient(135deg, #1877F2, #166FE5)",
                    color: "#fff", border: "none", borderRadius: 12,
                    fontFamily: "'Cairo', sans-serif", fontSize: 14.5, fontWeight: 800,
                    textDecoration: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 16px rgba(24,119,242,0.35)",
                    boxSizing: "border-box",
                  }}
                >
                  <Globe size={16} />
                  <span>الانتقال إلى رابط شركتي المخصص الآن 🚀</span>
                </a>

                {/* زر المتابعة: يوجه للسب-دومين أيضاً (لا يبقى على الدومين الرئيسي) */}
                <button
                  type="button"
                  onClick={() => {
                    try { if (window._autoRedirectTimer) clearTimeout(window._autoRedirectTimer); } catch (e) {}
                    try { sessionStorage.removeItem('is_registering_user'); } catch (e) {}
                    window.location.href = registeredTenantInfo.subUrl;
                  }}
                  style={{
                    width: "100%", padding: "10px",
                    background: "var(--sidebar-hover-bg, #F8FAFC)",
                    color: "var(--ink)", border: "1px solid var(--border)", borderRadius: 10,
                    fontFamily: "'Cairo', sans-serif", fontSize: 13, fontWeight: 700,
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  البدء في إضافة المشاريع ← (ستنتقل تلقائياً خلال ثوانٍ)
                </button>
              </div>

            </div>
          ) : (
            <>
          {/* ─── التبديل بين تسجيل الدخول وإنشاء حساب أو شارة بوابة الشركة الخاصة ─── */}
          {isCompanyPortal ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(24, 119, 242, 0.08)",
                border: "1px solid rgba(24, 119, 242, 0.22)",
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 20,
              }}
            >
              <ShieldCheck size={18} color="#1877F2" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1877F2" }}>
                بوابة خاصة ومحمية لموظفي ومهندسي الشركة فقط
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "var(--sidebar-hover-bg, #F1F5F9)",
                borderRadius: 12,
                padding: 4,
                marginBottom: 22,
                border: "1px solid var(--border, #E2E8F0)",
              }}
            >
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: mode === 'login' ? "var(--card, #fff)" : "transparent",
                  color: mode === 'login' ? primaryColor : "var(--muted, #64748B)",
                  fontWeight: mode === 'login' ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: mode === 'login' ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                  fontFamily: "'Cairo', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Lock size={15} />
                <span>تسجيل الدخول</span>
              </button>

              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: mode === 'register' ? "var(--card, #fff)" : "transparent",
                  color: mode === 'register' ? "#10B981" : "var(--muted, #64748B)",
                  fontWeight: mode === 'register' ? 800 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: mode === 'register' ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                  fontFamily: "'Cairo', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={15} />
                <span>حساب شركة جديد</span>
              </button>
            </div>
          )}

          {/* شارة التجربة المجانية عند التسجيل */}
          {!isCompanyPortal && mode === 'register' && (
            <div
              style={{
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#059669",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={16} />
              <span>تجربة مجانية فورية لمدة 14 يوماً</span>
            </div>
          )}

          {/* رسالة الخطأ إن وجدت مع زر الاستعادة الفوري بالكود */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#EF4444",
                padding: "12px 14px",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
                marginBottom: 18,
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    color: "#B91C1C",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "right",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    alignSelf: "flex-start",
                  }}
                >
                  <KeyRound size={13} />
                  <span>نسيت كلمة المرور؟ اضغط هنا لاستلام كود التحقق عبر واتساب 📲</span>
                </button>
              )}
            </div>
          )}

          {/* رسالة نجاح إعادة تعيين كلمة المرور إن وجدت */}
          {resetSuccess && (
            <div
              style={{
                background: "rgba(16,185,129,0.1)",
                color: "#10B981",
                padding: "10px 14px",
                borderRadius: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 13,
                marginBottom: 18,
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{resetSuccess}</span>
            </div>
          )}

          {/* ══════════════ نموذج 1: تسجيل الدخول ══════════════ */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* البريد الإلكتروني */}
              <div>
                <label style={{ display: "block", marginBottom: 7, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                  البريد الإلكتروني أو رقم الهاتف
                </label>
                <div style={{ position: "relative" }}>
                  {/^[\d\s\+\-\(\)]{3,}$/.test(email) && !email.includes('@')
                    ? <Phone size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#1877F2" }} />
                    : <Mail size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  }
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@company.com أو 01012345678"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    style={{
                      width: "100%", padding: "11px 42px 11px 14px",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      background: "transparent", color: "var(--ink)",
                      fontFamily: "'Cairo', sans-serif", fontSize: 14,
                      outline: "none", boxSizing: "border-box",
                      direction: "ltr",
                      textAlign: "right"
                    }}
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5, fontWeight: 600 }}>
                  يمكنك الدخول بالبريد الإلكتروني أو برقم هاتفك مباشرة
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <label style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    style={{
                      background: "none",
                      border: "none",
                      color: primaryColor,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "11px 42px 11px 14px",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      background: "transparent", color: "var(--ink)",
                      fontFamily: "'Cairo', sans-serif", fontSize: 14,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* زر تسجيل الدخول */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  color: "#fff", border: "none", borderRadius: 12,
                  fontFamily: "'Cairo', sans-serif", fontSize: 15, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: `0 4px 18px ${primaryColor}35`,
                  marginTop: 6,
                }}
              >
                {loading ? "⏳ جاري التحقق والدخول..." : (isCompanyPortal ? "تسجيل الدخول لبوابة الشركة ←" : "تسجيل الدخول للمنصة ←")}
              </button>
              {isCompanyPortal && (
                <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
                  لست موظفاً في هذه الشركة؟{' '}
                  <a
                    href="https://tashteebpro.com"
                    style={{ color: primaryColor, fontWeight: 700, textDecoration: 'underline' }}
                  >
                    الانتقال للمنصة الرئيسية
                  </a>
                </div>
              )}
            </form>
          ) : (
            /* ══════════════ نموذج 2: تسجيل شركة جديدة (Sign Up) ══════════════ */
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* اسم الشركة */}
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                  اسم شركة المقاولات / مكتب التشطيب <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <Building2 size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input
                    type="text"
                    value={companyTitle}
                    onChange={(e) => handleCompanyTitleChange(e.target.value)}
                    required
                    placeholder="مثال: شركة النيل للتشطيبات والديكور"
                    style={{
                      width: "100%", padding: "11px 42px 11px 14px",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      background: "transparent", color: "var(--ink)",
                      fontFamily: "'Cairo', sans-serif", fontSize: 14,
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* امتداد النطاق الفرعي للشركة (Company Subdomain) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ margin: 0, color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                    امتداد النطاق ورابط مساحة العمل <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <span style={{ fontSize: 11, color: "var(--muted)", direction: "ltr" }}>
                    حروف إنجليزية وأرقام
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "stretch",
                  border: "1.5px solid var(--border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "var(--card, #fff)",
                  direction: "ltr",
                  transition: "border-color 0.2s",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    background: "var(--sidebar-hover-bg, #F8FAFC)",
                    color: "var(--muted)",
                    borderRight: "1px solid var(--border)",
                  }}>
                    <Globe size={16} />
                  </div>
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => {
                      setSubdomainTouched(true);
                      setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    required
                    placeholder="company-name"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "none",
                      background: "transparent",
                      color: "var(--ink)",
                      fontFamily: "'Cairo', monospace, sans-serif",
                      fontSize: 14,
                      outline: "none",
                      direction: "ltr",
                      textAlign: "left",
                    }}
                  />
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 12px",
                    background: "var(--sidebar-hover-bg, #F1F5F9)",
                    color: "var(--muted)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    borderLeft: "1px solid var(--border)",
                    userSelect: "none",
                  }}>
                    .tashteebpro.com
                  </div>
                </div>

                {/* المعاينة الحية للرابط */}
                <div style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 10px",
                  borderRadius: 7,
                  background: subdomain.trim().length >= 3 ? "rgba(16,185,129,0.06)" : "var(--sidebar-hover-bg, #F8FAFC)",
                  border: `1px dashed ${subdomain.trim().length >= 3 ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
                  fontSize: 11.5,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, direction: "ltr" }}>
                    <span>🔗</span>
                    <span style={{
                      fontWeight: 700,
                      color: subdomain.trim().length >= 3 ? "#059669" : "var(--muted)",
                      letterSpacing: "0.2px"
                    }}>
                      {getSubdomainUrl(subdomain.trim() || 'your-company')}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>رابط الدخول المباشر لمكتبكم</span>
                </div>
              </div>

              {/* اسم المسؤول والهاتف (شبكة ثنائية) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    اسم المسؤول / المهندس <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <User size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      placeholder="م. أحمد حسن"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    رقم الهاتف والواتساب <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Phone size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="010XXXXXXXX"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                        direction: "ltr",
                        textAlign: "right"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* البريد الإلكتروني وكلمة المرور */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    البريد الإلكتروني للدخول <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ceo@company.com"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 12.5, fontWeight: 700 }}>
                    كلمة المرور <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="اختر كلمة مرور"
                      style={{
                        width: "100%", padding: "10px 36px 10px 10px",
                        border: "1.5px solid var(--border)", borderRadius: 10,
                        background: "transparent", color: "var(--ink)",
                        fontFamily: "'Cairo', sans-serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* زر إنشاء الحساب */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontFamily: "'Cairo', sans-serif", fontSize: 15, fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 4px 18px rgba(16,185,129,0.35)",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={18} />
                <span>{loading ? "⏳ جاري إعداد مساحة عمل شركتك..." : "إنشاء الحساب وبدء التجربة المجانية 🚀"}</span>
              </button>
            </form>
          )}
          </>
        )}

          {onBackToLanding && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button
                type="button"
                onClick={onBackToLanding}
                style={{
                  background: "none", border: "none",
                  color: "var(--muted)", fontSize: 12.5, fontWeight: 700,
                  cursor: "pointer", textDecoration: "underline"
                }}
              >
                ← العودة إلى الصفحة التعريفية والأسعار
              </button>
            </div>
          )}
        </div>

        {/* ─── شارة الحماية والأمان ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--muted)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={16} color="#10B981" />
          <span>اتصال سحابي مشفر 256-bit • Tashteeb Pro 2026</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          نافذة استعادة كلمة المرور وإرسال كود التحقق (OTP Reset Modal)
          ════════════════════════════════════════════════════════════ */}
      {showForgotModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            direction: "rtl",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          <div
            style={{
              background: "var(--card, #ffffff)",
              color: "var(--ink, #0F172A)",
              border: "1px solid var(--border, #E2E8F0)",
              borderRadius: 24,
              width: "100%",
              maxWidth: 460,
              padding: "26px 24px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* زر الإغلاق */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                position: "absolute",
                left: 18,
                top: 18,
                background: "var(--sidebar-hover-bg, #F1F5F9)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--muted, #64748B)",
              }}
              title="إغلاق"
            >
              <X size={18} />
            </button>

            {/* ترويسة النافذة */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "rgba(24, 119, 242, 0.12)",
                  color: primaryColor,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <KeyRound size={26} />
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                إعادة تعيين كلمة المرور
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                {/^[\d\s\+\-\(\)]{7,}$/.test(forgotEmail) && !forgotEmail.includes('@')
                  ? 'حسابك مرتبط برقم هاتف — الرجاء التواصل مع مدير شركتك لتعيين كلمة مرور جديدة.'
                  : 'أدخل بريدك الإلكتروني المسجل، وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور فوراً.'}
              </p>
            </div>

            {/* تنبيه الخطأ */}
            {modalError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#EF4444",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {/* تنبيه النجاح */}
            {modalSuccess && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#10B981",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{modalSuccess}</span>
              </div>
            )}

            {/* لو المستخدم دخل برقم تليفون: عرض رسالة توجيهية بدل الفورم */}
            {/^[\d\s\+\-\(\)]{7,}$/.test(forgotEmail) && !forgotEmail.includes('@') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1.5px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 14,
                  padding: '16px 14px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}>
                  <Phone size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#92400E', marginBottom: 6 }}>
                      حسابك مرتبط برقم هاتف فقط
                    </div>
                    <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.65 }}>
                      لا يمكن إرسال رابط إعادة التعيين عبر البريد لأن حسابك مسجل برقم الهاتف فقط.
                      <br />
                      <strong>الحل: تواصل مع مدير شركتك</strong> ليقوم بتعيين كلمة مرور جديدة لحسابك من لوحة إدارة الموظفين مباشرة.
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 12.5,
                  color: '#064E3B',
                  lineHeight: 1.6,
                }}>
                  💡 <strong>للمدير:</strong> من لوحة إدارة الموظفين ← اضغط على زر "كلمة مرور" بجانب اسم الموظف لتعيين كلمة مرور فورية.
                </div>

                {resolvedCompanyPhone ? (
                  <a
                    href={`https://wa.me/${cleanPhoneNumber(resolvedCompanyPhone).startsWith('01') ? '2' + cleanPhoneNumber(resolvedCompanyPhone) : cleanPhoneNumber(resolvedCompanyPhone)}?text=${encodeURIComponent(`السلام عليكم، نسيت كلمة المرور الخاصة بحسابي على منصة تشطيب برو.\nرقم هاتفي المسجل: ${forgotEmail}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '100%', padding: '12px',
                      background: '#10B981',
                      color: '#fff', textDecoration: 'none',
                      borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontSize: 14, fontWeight: 800,
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    💬 مراسلة إدارة الشركة عبر واتساب
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`السلام عليكم، نسيت كلمة المرور الخاصة بحسابي على منصة تشطيب برو.\nرقم هاتفي المسجل: ${forgotEmail}`);
                      setModalSuccess('✅ تم نسخ نص رسالة الطلب! يمكنك لصقها وإرسالها لمدير شركتك الآن.');
                    }}
                    style={{
                      width: '100%', padding: '12px',
                      background: '#0F172A',
                      color: '#fff', border: 'none', borderRadius: 12,
                      fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    📋 نسخ طلب استعادة كلمة المرور لإرساله للمدير
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    width: '100%', padding: '10px',
                    background: 'transparent',
                    color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 12,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  إغلاق
                </button>
              </div>
            ) : (
              /* المستخدم عنده بريد إلكتروني: عرض فورم إرسال رابط */
              <form onSubmit={handleSendPasswordReset}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7, color: "var(--muted)" }}>
                    البريد الإلكتروني المسجل
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      placeholder="name@company.com"
                      style={{
                        width: "100%", padding: "11px 42px 11px 14px",
                        border: "1.5px solid var(--border)", borderRadius: 12,
                        background: "transparent", color: "var(--ink)",
                        fontSize: 14, outline: "none", boxSizing: "border-box",
                        direction: "ltr", textAlign: "right"
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: modalLoading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: `0 4px 18px ${primaryColor}40`,
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  <KeyRound size={16} />
                  <span>{modalLoading ? "جاري إرسال الرابط..." : "إرسال رابط إعادة التعيين ✉️"}</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
