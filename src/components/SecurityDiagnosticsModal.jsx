import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, X, Database, Key, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function SecurityDiagnosticsModal({ isOpen, onClose, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState(null);
  const [companyDoc, setCompanyDoc] = useState(null);
  const [tenantDoc, setTenantDoc] = useState(null);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  async function loadDiagnostics(forceRefresh = false) {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(forceRefresh);
      setClaims(tokenResult.claims);

      const targetCompanyId = tokenResult.claims.companyId || currentUser?.companyId;

      if (targetCompanyId) {
        // 1. جلب وثيقة الشركة الأصلية companies/{id}
        try {
          const compSnap = await getDoc(doc(db, 'companies', targetCompanyId));
          setCompanyDoc(compSnap.exists() ? compSnap.data() : { _notFound: true });
        } catch (cErr) {
          setCompanyDoc({ _error: cErr.message });
        }

        // 2. جلب وثيقة tenants/{id}
        try {
          const tenantSnap = await getDoc(doc(db, 'tenants', targetCompanyId));
          setTenantDoc(tenantSnap.exists() ? tenantSnap.data() : { _notFound: true });
        } catch (tErr) {
          setTenantDoc({ _error: tErr.message });
        }
      } else {
        setCompanyDoc(null);
        setTenantDoc(null);
      }

      setLastRefreshed(new Date().toLocaleTimeString('ar-EG'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      direction: 'rtl',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: '#1E293B',
        color: '#F8FAFC',
        borderRadius: 16,
        width: '100%',
        maxWidth: 720,
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} color="#38BDF8" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              أداة تشخيص الأمان والصلاحيات (Auth Claims & Multi-Tenant Diagnostics)
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>
              آخر تحديث: {lastRefreshed || 'جاري التحميل...'}
            </span>
            <button
              onClick={() => loadDiagnostics(true)}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#0284C7',
                color: '#FFF',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              إجبار تجديد التوكن (Force Refresh Token)
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#7F1D1D',
              border: '1px solid #DC2626',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
            }}>
              <AlertCircle size={18} color="#FCA5A5" />
              <span>خطأ في التشخيص: {error}</span>
            </div>
          )}

          {/* Section 1: User & Token Claims */}
          <div style={{
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: 10,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Key size={18} color="#F59E0B" />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#F59E0B' }}>
                Google Auth Token Claims (المصدر الوحيد للحقيقة)
              </h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 13 }}>
              <div><strong>UID:</strong> <code style={{ color: '#38BDF8' }}>{auth.currentUser?.uid}</code></div>
              <div><strong>البريد:</strong> <code style={{ color: '#38BDF8' }}>{auth.currentUser?.email}</code></div>
              <div><strong>Email Verified:</strong> {auth.currentUser?.emailVerified ? '✅ نعم' : '❌ لا'}</div>
              <div><strong>الدور (role):</strong> <span style={{ color: '#10B981', fontWeight: 'bold' }}>{claims?.role || 'غير محدد'}</span></div>
              <div><strong>معرف الشركة (companyId):</strong> <span style={{ color: '#6366F1' }}>{claims?.companyId || 'غير مرتبط'}</span></div>
              <div><strong>سوبر أدمن (isSuperAdmin):</strong> {claims?.isSuperAdmin ? '👑 نعم' : 'لا'}</div>
            </div>
            <pre style={{
              marginTop: 12,
              backgroundColor: '#020617',
              padding: 10,
              borderRadius: 6,
              fontSize: 12,
              overflowX: 'auto',
              color: '#CBD5E1',
            }}>
              {JSON.stringify(claims, null, 2)}
            </pre>
          </div>

          {/* Section 2: Firestore Company Doc */}
          <div style={{
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: 10,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Building2 size={18} color="#6366F1" />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#6366F1' }}>
                وثيقة الشركة في companies/{claims?.companyId || currentUser?.companyId || '—'}
              </h4>
            </div>
            <pre style={{
              backgroundColor: '#020617',
              padding: 10,
              borderRadius: 6,
              fontSize: 12,
              overflowX: 'auto',
              color: '#CBD5E1',
            }}>
              {companyDoc ? JSON.stringify(companyDoc, null, 2) : 'لا توجد وثيقة شركة محددة'}
            </pre>
          </div>

          {/* Section 3: Central Tenants Doc */}
          <div style={{
            backgroundColor: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: 10,
            padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Database size={18} color="#10B981" />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#10B981' }}>
                وثيقة الدليل المركزي في tenants/{claims?.companyId || currentUser?.companyId || '—'}
              </h4>
            </div>
            <pre style={{
              backgroundColor: '#020617',
              padding: 10,
              borderRadius: 6,
              fontSize: 12,
              overflowX: 'auto',
              color: '#CBD5E1',
            }}>
              {tenantDoc ? JSON.stringify(tenantDoc, null, 2) : 'لا توجد بيانات مسجلة في tenants'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
