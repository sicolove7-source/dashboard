import React, { useState } from 'react';
import { Camera, ClipboardList, Banknote, X, CheckCircle, Mic, Plus, Building2, HardHat, Save } from 'lucide-react';
import VoiceInput from './VoiceInput';
import { todayISO } from '../utils/helpers';

export default function MobileQuickActionsModal({ projects, onUpdateProject, activeCompanyId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'photo' | 'log' | 'expense' | null
  const [selectedProjectId, setSelectedProjectId] = useState(() => projects?.[0]?.id || '');
  const [toast, setToast] = useState('');

  // Forms state
  const [logWork, setLogWork] = useState('');
  const [logWorkers, setLogWorkers] = useState(4);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeProject = (projects || []).find(p => p.id === (selectedProjectId || projects?.[0]?.id));

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function handleCaptureFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً (أكثر من 4 ميجابايت)');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setCapturedPhoto(ev.target.result);
      setActiveAction('photo');
    };
    reader.readAsDataURL(file);
  }

  function handleSaveQuickLog(e) {
    e.preventDefault();
    if (!activeProject || !logWork.trim()) return;
    setSaving(true);
    const today = todayISO();
    const newLog = {
      id: 'd_' + Date.now(),
      date: today,
      author: 'مهندس الموقع (ميداني)',
      work: logWork.trim(),
      issues: '',
      workers: Number(logWorkers) || 1,
      photos: [],
      timestamp: new Date().toISOString()
    };
    const existingLogs = activeProject.dailyLogs || [];
    onUpdateProject(activeProject.id, {
      dailyLogs: [newLog, ...existingLogs]
    });
    setSaving(false);
    setLogWork('');
    setActiveAction(null);
    setIsOpen(false);
    showToast('✅ تم تسجيل اليومية سحابياً بنجاح!');
  }

  function handleSaveQuickExpense(e) {
    e.preventDefault();
    if (!activeProject || !expenseTitle.trim() || !expenseAmount) return;
    setSaving(true);
    const amountNum = Number(expenseAmount);
    const newExpense = {
      id: 'exp_' + Date.now(),
      title: expenseTitle.trim(),
      amount: amountNum,
      category: 'مشتريات موقع ونثريات',
      date: todayISO(),
      timestamp: new Date().toISOString()
    };
    const existingExpenses = activeProject.expenses || [];
    const newSpent = (Number(activeProject.spent) || 0) + amountNum;
    onUpdateProject(activeProject.id, {
      expenses: [newExpense, ...existingExpenses],
      spent: newSpent
    });
    setSaving(false);
    setExpenseTitle('');
    setExpenseAmount('');
    setActiveAction(null);
    setIsOpen(false);
    showToast(`✅ تم قيد مصروف (${amountNum.toLocaleString('ar-EG')} ج.م) وتحديث إجمالي الصرف!`);
  }

  function handleSaveQuickPhoto(e) {
    e.preventDefault();
    if (!activeProject || !capturedPhoto) return;
    setSaving(true);
    const newPhoto = {
      src: capturedPhoto,
      caption: photoCaption.trim() || 'توثيق موقع ميداني',
      date: todayISO(),
      id: 'ph_' + Date.now()
    };
    const existingFiles = activeProject.files || [];
    onUpdateProject(activeProject.id, {
      files: [newPhoto, ...existingFiles]
    });
    setSaving(false);
    setCapturedPhoto(null);
    setPhotoCaption('');
    setActiveAction(null);
    setIsOpen(false);
    showToast('📸 تم حفظ وتوثيق صورة الموقع سحابياً!');
  }

  if (!projects || projects.length === 0) return null;

  return (
    <>
      {/* ─── Toast Message ─── */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A',
          color: '#10B981',
          padding: '12px 24px',
          borderRadius: 99,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          border: '1px solid #10B98155',
          fontFamily: "'Cairo', sans-serif",
          fontSize: 14,
          fontWeight: 700,
          zIndex: 10002,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          direction: 'rtl',
          animation: 'fadeIn 0.2s ease',
        }}>
          <CheckCircle size={18} color="#10B981" />
          <span>{toast}</span>
        </div>
      )}

      {/* ─── FLOATING ACTION BUTTON (Visible on Mobile only via CSS) ─── */}
      <div className="mobile-fab-container" style={{
        position: 'fixed',
        bottom: 68,
        left: 14,
        zIndex: 9997,
        direction: 'rtl',
      }}>
        <button
          onClick={() => { setIsOpen(true); setActiveAction(null); }}
          style={{
            background: 'linear-gradient(135deg, #1877F2, #0D65D9)',
            color: '#fff',
            border: 'none',
            borderRadius: 99,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 18px rgba(24,119,242,0.45)',
            cursor: 'pointer',
            fontFamily: "'Cairo', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            border: '2px solid rgba(255,255,255,0.3)',
          }}
          title="إجراءات الموقع السريعة للمهندس"
        >
          <HardHat size={18} />
          <span>إجراء موقع سريع ⚡</span>
        </button>
      </div>

      {/* ─── BOTTOM SHEET MODAL ─── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setIsOpen(false); setActiveAction(null); }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              animation: 'fadeIn 0.2s ease',
            }}
          />

          {/* Modal Content */}
          <div
            dir="rtl"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--card, #FFFFFF)',
              color: 'var(--ink, #0F172A)',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: '2px solid var(--border, #E2E8F0)',
              padding: '24px 20px 36px',
              zIndex: 10001,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
              fontFamily: "'Cairo', sans-serif",
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(24,119,242,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <HardHat size={20} color="#1877F2" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>إجراءات الموقع السريعة للمهندس</h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>تحديثات ميدانية فورية متزامنة مع السحابة</p>
                </div>
              </div>
              <button
                onClick={() => { setIsOpen(false); setActiveAction(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Project Picker */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                المشروع المستهدف:
              </label>
              <select
                value={selectedProjectId || activeProject?.id}
                onChange={e => setSelectedProjectId(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 46,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border, #E2E8F0)',
                  background: 'var(--bg-color, #F8FAFC)',
                  color: 'var(--ink)',
                  fontFamily: "'Cairo'",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.client || 'عميل'})</option>
                ))}
              </select>
            </div>

            {/* 3 Quick Action Buttons if no active subaction */}
            {!activeAction && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                {/* 1. Camera Direct */}
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '16px 8px', borderRadius: 14, border: '2px solid #1877F2',
                  background: 'rgba(24,119,242,0.06)', color: '#1877F2',
                  cursor: 'pointer', textAlign: 'center', gap: 8, minHeight: 96,
                }}>
                  <Camera size={26} />
                  <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>تصوير واستلام</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleCaptureFile} style={{ display: 'none' }} />
                </label>

                {/* 2. Quick Log */}
                <button
                  type="button"
                  onClick={() => setActiveAction('log')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '16px 8px', borderRadius: 14, border: '2px solid #10B981',
                    background: 'rgba(16,185,129,0.06)', color: '#10B981',
                    cursor: 'pointer', textAlign: 'center', gap: 8, minHeight: 96,
                  }}
                >
                  <ClipboardList size={26} />
                  <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>يومية سريعة</span>
                </button>

                {/* 3. Quick Expense */}
                <button
                  type="button"
                  onClick={() => setActiveAction('expense')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '16px 8px', borderRadius: 14, border: '2px solid #F59E0B',
                    background: 'rgba(245,158,11,0.06)', color: '#D97706',
                    cursor: 'pointer', textAlign: 'center', gap: 8, minHeight: 96,
                  }}
                >
                  <Banknote size={26} />
                  <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>مصروف موقع</span>
                </button>
              </div>
            )}

            {/* ─── Form 1: Photo Preview & Caption ─── */}
            {activeAction === 'photo' && capturedPhoto && (
              <form onSubmit={handleSaveQuickPhoto} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={capturedPhoto}
                    alt="صورة الموقع"
                    style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 12, border: '2px solid #1877F2', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>وصف / بند الصورة:</label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={e => setPhotoCaption(e.target.value)}
                    placeholder="مثال: استلام رخام الدرج، صب عتب الصالة..."
                    style={{
                      width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                      fontFamily: "'Cairo'", fontSize: 14,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, minHeight: 46, borderRadius: 10, background: '#1877F2', color: '#fff',
                      border: 'none', fontWeight: 800, fontSize: 14, fontFamily: "'Cairo'", cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'جاري الحفظ...' : 'حفظ الصورة في السحابة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCapturedPhoto(null); setActiveAction(null); }}
                    style={{
                      minHeight: 46, padding: '0 16px', borderRadius: 10, background: 'var(--border)',
                      color: 'var(--ink)', border: 'none', fontFamily: "'Cairo'", cursor: 'pointer',
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* ─── Form 2: Quick Daily Log ─── */}
            {activeAction === 'log' && (
              <form onSubmit={handleSaveQuickLog} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700 }}>الأعمال المنفذة اليوم بالموقع:</label>
                    <VoiceInput onResult={t => setLogWork(w => (w ? w + ' ' : '') + t)} />
                  </div>
                  <textarea
                    required
                    rows={3}
                    value={logWork}
                    onChange={e => setLogWork(e.target.value)}
                    placeholder="اكتب أو اضغط على الميكروفون للتحدث: مثال تم صب بلاط السطح ومحارة الجدران..."
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                      fontFamily: "'Cairo'", fontSize: 14, resize: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>عدد العمالة:</label>
                  <input
                    type="number"
                    min="1"
                    value={logWorkers}
                    onChange={e => setLogWorkers(e.target.value)}
                    style={{
                      width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                      fontFamily: "'Cairo'", fontSize: 14,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, minHeight: 46, borderRadius: 10, background: '#10B981', color: '#fff',
                      border: 'none', fontWeight: 800, fontSize: 14, fontFamily: "'Cairo'", cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'جاري الحفظ...' : 'حفظ اليومية في السحابة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAction(null)}
                    style={{
                      minHeight: 46, padding: '0 16px', borderRadius: 10, background: 'var(--border)',
                      color: 'var(--ink)', border: 'none', fontFamily: "'Cairo'", cursor: 'pointer',
                    }}
                  >
                    رجوع
                  </button>
                </div>
              </form>
            )}

            {/* ─── Form 3: Quick Field Expense ─── */}
            {activeAction === 'expense' && (
              <form onSubmit={handleSaveQuickExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>بند المصروف:</label>
                  <input
                    type="text"
                    required
                    value={expenseTitle}
                    onChange={e => setExpenseTitle(e.target.value)}
                    placeholder="مثال: شراء شكائر أسمنت، نقل رمل، إكرامية ونش..."
                    style={{
                      width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                      fontFamily: "'Cairo'", fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>المبلغ المدفوع (ج.م):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    placeholder="مثال: 350"
                    style={{
                      width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                      fontFamily: "'Cairo'", fontSize: 14,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, minHeight: 46, borderRadius: 10, background: '#F59E0B', color: '#fff',
                      border: 'none', fontWeight: 800, fontSize: 14, fontFamily: "'Cairo'", cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'جاري القيد...' : 'قيد المصروف وتحديث الصرف'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAction(null)}
                    style={{
                      minHeight: 46, padding: '0 16px', borderRadius: 10, background: 'var(--border)',
                      color: 'var(--ink)', border: 'none', fontFamily: "'Cairo'", cursor: 'pointer',
                    }}
                  >
                    رجوع
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
