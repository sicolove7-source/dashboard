import React, { useState } from 'react';
import {
  Camera, Video, ClipboardList, CheckSquare, X, CheckCircle,
  Plus, HardHat, Save, Trash2, ArrowRight, ShieldCheck, Clock,
  AlertCircle, AlertTriangle, Play, Eye
} from 'lucide-react';
import VoiceInput from './VoiceInput';
import { todayISO, fmtDate, compressImageFile } from '../utils/helpers';
import { uploadMediaToFirebaseStorage } from '../services/cloudSync';
import { saveMediaBlob, createMicroThumbnail } from '../utils/mediaStorage';
import MediaThumbnail from './MediaThumbnail';
import MediaLightbox from './MediaLightbox';

export default function MobileQuickActionsModal({ projects, onUpdateProject, activeCompanyId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'log' | 'snag' | null
  const [selectedProjectId, setSelectedProjectId] = useState(() => projects?.[0]?.id || '');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewMediaModal, setPreviewMediaModal] = useState(null); // { src, type, caption }

  // ─── Daily Log State (اليوميات) ───
  const [logTab, setLogTab] = useState('add'); // 'add' | 'list'
  const [logWork, setLogWork] = useState('');
  const [logWorkers, setLogWorkers] = useState(4);
  const [logIssues, setLogIssues] = useState('');
  const [logMedia, setLogMedia] = useState(null); // { src, type: 'image' | 'video', name }
  const [logMediaCaption, setLogMediaCaption] = useState('');

  // ─── Snag / Inspection State (الاستلامات) ───
  const [snagTab, setSnagTab] = useState('add'); // 'add' | 'list'
  const [snagDesc, setSnagDesc] = useState('');
  const [snagLocation, setSnagLocation] = useState('');
  const [snagAssignee, setSnagAssignee] = useState('');
  const [snagStatus, setSnagStatus] = useState('done'); // 'done' | 'progress' | 'pending'
  const [snagMedia, setSnagMedia] = useState(null); // { src, type: 'image' | 'video', name }

  const activeProject = (projects || []).find(p => p.id === (selectedProjectId || projects?.[0]?.id));
  const projectLogs = activeProject?.dailyLogs || [];
  const projectSnags = activeProject?.snags || [];
  const pendingSnagsCount = projectSnags.filter(s => s.status !== 'done').length;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  // Handle Photo or Video Capture with auto compression and IndexedDB safe storage
  async function handleCaptureMedia(e, target = 'log') {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`حجم الملف كبير (أقصى حد ${isVideo ? '50' : '25'} ميجابايت)`);
      return;
    }

    const mediaId = (isVideo ? 'vid_' : 'ph_') + Date.now();

    try {
      // 1. توليد رابط معاينة فوري وعرضه على الشاشة بدون أي تأخير
      const instantPreviewUrl = URL.createObjectURL(file);
      
      // 2. توليد مصغرة صغيرة جداً (15KB) للحفظ الآمن في السحابة وLocalStorage
      const thumb = await createMicroThumbnail(file, isVideo);

      // 3. حفظ الملف الثنائي الكامل فوراً في IndexedDB المحلي غير المحدود
      await saveMediaBlob(mediaId, file, { type: file.type, name: file.name });

      const mediaObj = {
        id: mediaId,
        src: instantPreviewUrl,
        rawSrc: `idb://${mediaId}`,
        thumbnail: thumb,
        type: isVideo ? 'video' : 'image',
        name: file.name,
        isUploading: true
      };

      if (target === 'log') {
        setLogMedia(mediaObj);
      } else {
        setSnagMedia(mediaObj);
      }

      // 4. محاولة الرفع السحابي في الخلفية (Background Cloud Upload)
      uploadMediaToFirebaseStorage(
        file,
        `companies/${activeCompanyId || 'general'}/projects/${activeProject?.id || 'common'}`,
        file.name
      ).then((cloudUrl) => {
        if (cloudUrl) {
          const cloudMedia = {
            ...mediaObj,
            src: cloudUrl,
            rawSrc: cloudUrl,
            isUploading: false
          };
          if (target === 'log') setLogMedia(cloudMedia);
          else setSnagMedia(cloudMedia);
        } else {
          const localMedia = {
            ...mediaObj,
            isUploading: false
          };
          if (target === 'log') setLogMedia(localMedia);
          else setSnagMedia(localMedia);
        }
      }).catch(() => {
        const localMedia = {
          ...mediaObj,
          isUploading: false
        };
        if (target === 'log') setLogMedia(localMedia);
        else setSnagMedia(localMedia);
      });

    } catch (err) {
      console.error("Error processing media:", err);
      alert("حدث خطأ أثناء قراءة الملف، يرجى المحاولة مرة أخرى.");
    }
    e.target.value = '';
  }

  // Helper to extract media from a daily log item
  function extractLogMedia(log) {
    const items = [];
    if (Array.isArray(log.media)) {
      log.media.forEach(m => {
        if (typeof m === 'string') {
          const isVid = m.startsWith('data:video') || m.includes('.mp4') || m.includes('.webm');
          items.push({ src: m, type: isVid ? 'video' : 'image' });
        } else if (m && m.src) {
          items.push(m);
        }
      });
    }
    if (Array.isArray(log.photos)) {
      log.photos.forEach(p => {
        const src = typeof p === 'string' ? p : p?.src;
        if (src && !items.some(it => it.src === src)) {
          const isVid = src.startsWith('data:video') || src.includes('.mp4') || src.includes('.webm') || p?.type === 'video';
          items.push({ src, type: isVid ? 'video' : 'image', caption: p?.caption || '' });
        }
      });
    }
    if (log.video && !items.some(it => it.src === log.video)) {
      items.push({ src: log.video, type: 'video' });
    }
    return items;
  }

  // ─── Save Quick Daily Log (حفظ يومية سريعة) ───
  function handleSaveQuickLog(e) {
    e.preventDefault();
    if (!activeProject || !logWork.trim()) return;
    setSaving(true);
    const today = todayISO();

    const mediaToSave = logMedia ? {
      id: logMedia.id,
      src: logMedia.rawSrc || (logMedia.src?.startsWith('blob:') ? `idb://${logMedia.id}` : logMedia.src),
      thumbnail: logMedia.thumbnail || '',
      type: logMedia.type,
      name: logMedia.name,
      caption: logMediaCaption.trim() || (logMedia.type === 'video' ? 'فيديو توثيق الموقع' : 'صورة توثيق الموقع')
    } : null;

    const newLog = {
      id: 'd_' + Date.now(),
      date: today,
      author: 'مهندس الموقع (ميداني)',
      work: logWork.trim(),
      issues: logIssues.trim(),
      workers: Number(logWorkers) || 1,
      photos: mediaToSave && mediaToSave.type === 'image' ? [mediaToSave.thumbnail || mediaToSave.src] : [],
      media: mediaToSave ? [mediaToSave] : [],
      timestamp: new Date().toISOString()
    };

    const existingLogs = activeProject.dailyLogs || [];
    const patch = { 
      dailyLogs: [newLog, ...existingLogs],
      updatedAt: new Date().toISOString()
    };

    // Also archive media in project files so it appears in project files & drawings
    if (mediaToSave) {
      const newFile = {
        id: mediaToSave.id,
        src: mediaToSave.src,
        thumbnail: mediaToSave.thumbnail,
        type: mediaToSave.type,
        caption: mediaToSave.caption,
        date: today,
        timestamp: new Date().toISOString()
      };
      const existingFiles = activeProject.files || [];
      patch.files = [newFile, ...existingFiles];
    }

    onUpdateProject(activeProject.id, patch);
    setSaving(false);
    setLogWork('');
    setLogIssues('');
    setLogMedia(null);
    setLogMediaCaption('');
    // Switch to list tab so user immediately sees their log with the photo/video!
    setLogTab('list');
    showToast('تم تسجيل اليومية الميدانية وحفظ التوثيق بنجاح! 📋');
  }

  // ─── Save New Snag (حفظ بند استلام / فحص) ───
  function handleSaveSnag(e) {
    e.preventDefault();
    if (!activeProject || !snagDesc.trim()) return;
    setSaving(true);
    const today = todayISO();

    const mediaToSave = snagMedia ? {
      id: snagMedia.id,
      src: snagMedia.rawSrc || (snagMedia.src?.startsWith('blob:') ? `idb://${snagMedia.id}` : snagMedia.src),
      thumbnail: snagMedia.thumbnail || '',
      type: snagMedia.type,
      name: snagMedia.name
    } : null;

    const newSnag = {
      id: 'snag_' + Date.now(),
      desc: snagDesc.trim(),
      location: snagLocation.trim() || 'الموقع العام',
      assignee: snagAssignee.trim() || 'المقاول المختص',
      status: snagStatus,
      date: today,
      photo: mediaToSave ? (mediaToSave.thumbnail || mediaToSave.src) : null,
      mediaType: mediaToSave?.type || null,
      mediaId: mediaToSave?.id || null,
      timestamp: new Date().toISOString()
    };

    const existingSnags = activeProject.snags || [];
    const patch = { 
      snags: [newSnag, ...existingSnags],
      updatedAt: new Date().toISOString()
    };

    if (mediaToSave) {
      const newFile = {
        id: mediaToSave.id,
        src: mediaToSave.src,
        thumbnail: mediaToSave.thumbnail,
        type: mediaToSave.type,
        caption: `استلام وفحص: ${snagDesc.trim()} (${snagLocation.trim() || 'الموقع'})`,
        date: today,
        timestamp: new Date().toISOString()
      };
      const existingFiles = activeProject.files || [];
      patch.files = [newFile, ...existingFiles];
    }

    onUpdateProject(activeProject.id, patch);
    setSaving(false);
    setSnagDesc('');
    setSnagLocation('');
    setSnagAssignee('');
    setSnagMedia(null);
    setSnagTab('list');
    showToast(snagStatus === 'done' ? '✅ تم توثيق واعتماد الاستلام سحابياً!' : '⚠️ تم قيد ملاحظة الفحص سحابياً لمتابعتها!');
  }

  // ─── Toggle Existing Snag Status ───
  function handleToggleSnagStatus(snagId, currentStatus) {
    if (!activeProject) return;
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done';
    const existingSnags = activeProject.snags || [];
    const updatedSnags = existingSnags.map(s => s.id === snagId ? { ...s, status: nextStatus } : s);
    onUpdateProject(activeProject.id, { snags: updatedSnags });
    showToast(nextStatus === 'done' ? '✅ تم إغلاق واعتماد الملاحظة!' : '⏳ تم إعادة فتح الملاحظة للمتابعة');
  }

  if (!projects || projects.length === 0) return null;

  return (
    <>
      {/* ─── Media Lightbox Modal ─── */}
      {/* ─── Media Lightbox Modal ─── */}
      {previewMediaModal && (
        <MediaLightbox
          item={previewMediaModal}
          onClose={() => setPreviewMediaModal(null)}
        />
      )}

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
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
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
              padding: '22px 18px 34px',
              zIndex: 10001,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
              fontFamily: "'Cairo', sans-serif",
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
                  <p style={{ margin: 0, fontSize: 11.5, color: 'var(--muted)' }}>اليوميات الميدانية والاستلامات المعتمدة</p>
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
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                المشروع المستهدف:
              </label>
              <select
                value={selectedProjectId || activeProject?.id}
                onChange={e => setSelectedProjectId(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 44,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border, #E2E8F0)',
                  background: 'var(--bg-color, #F8FAFC)',
                  color: 'var(--ink)',
                  fontFamily: "'Cairo'",
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.client || 'عميل'})</option>
                ))}
              </select>
            </div>

            {/* ─── TWO MAIN QUICK ACTION CARDS (When at root) ─── */}
            {!activeAction && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {/* 1. Quick Daily Log */}
                <button
                  type="button"
                  onClick={() => { setActiveAction('log'); setLogTab('add'); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '18px 10px', borderRadius: 16, border: '2px solid #10B981',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))',
                    color: '#059669', cursor: 'pointer', textAlign: 'center', gap: 10, minHeight: 120,
                    boxShadow: '0 4px 14px rgba(16,185,129,0.12)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ClipboardList size={24} color="#10B981" />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 900, color: '#047857', marginBottom: 2 }}>
                      اليوميات 📝
                    </span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B' }}>
                      أعمال، عمالة، صورة أو فيديو 🎥
                    </span>
                  </div>
                </button>

                {/* 2. Site Inspections & Snags */}
                <button
                  type="button"
                  onClick={() => { setActiveAction('snag'); setSnagTab('add'); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '18px 10px', borderRadius: 16, border: '2px solid #1877F2',
                    background: 'linear-gradient(135deg, rgba(24,119,242,0.08), rgba(24,119,242,0.02))',
                    color: '#1877F2', cursor: 'pointer', textAlign: 'center', gap: 10, minHeight: 120,
                    boxShadow: '0 4px 14px rgba(24,119,242,0.12)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'rgba(24,119,242,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <CheckSquare size={24} color="#1877F2" />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 900, color: '#1D4ED8', marginBottom: 2 }}>
                      الاستلامات 🔍
                    </span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B' }}>
                      فحص البنود وملاحظات الموقع
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* ══════════════ ACTION 1: DAILY LOGS (اليوميات والوسائط) ══════════════ */}
            {activeAction === 'log' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Header with back button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 800, fontSize: 14 }}>
                    <ClipboardList size={18} />
                    <span>يوميات الموقع الميدانية والتوثيق</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveAction(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ← تبديل الإجراء
                  </button>
                </div>

                {/* Subtabs: ➕ إضافة يومية vs 📋 سجل اليوميات والوسائط */}
                <div style={{ display: 'flex', gap: 8, background: 'var(--bg-color, #F1F5F9)', padding: 4, borderRadius: 10 }}>
                  <button
                    type="button"
                    onClick={() => setLogTab('add')}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: logTab === 'add' ? '#fff' : 'transparent',
                      color: logTab === 'add' ? '#059669' : 'var(--muted)',
                      fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      boxShadow: logTab === 'add' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <Plus size={14} />
                    <span>تسجيل يومية جديدة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogTab('list')}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: logTab === 'list' ? '#fff' : 'transparent',
                      color: logTab === 'list' ? '#059669' : 'var(--muted)',
                      fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      boxShadow: logTab === 'list' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <ClipboardList size={14} />
                    <span>سجل اليوميات والوسائط ({projectLogs.length})</span>
                  </button>
                </div>

                {/* Subtab 1: Form */}
                {logTab === 'add' && (
                  <form onSubmit={handleSaveQuickLog} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* الأعمال المنفذة اليوم */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12.5, fontWeight: 700 }}>الأعمال المنفذة اليوم بالموقع: <span style={{ color: '#EF4444' }}>*</span></label>
                        <VoiceInput onResult={t => setLogWork(w => (w ? w + ' ' : '') + t)} />
                      </div>
                      <textarea
                        required
                        rows={3}
                        value={logWork}
                        onChange={e => setLogWork(e.target.value)}
                        placeholder="اكتب أو اضغط على الميكروفون للتحدث: مثال تم صب بلاط السطح ومحارة الجدران..."
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 10,
                          border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                          fontFamily: "'Cairo'", fontSize: 13.5, resize: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* عدد العمالة والمعوقات */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>عدد العمالة:</label>
                        <input
                          type="number"
                          min="1"
                          value={logWorkers}
                          onChange={e => setLogWorkers(e.target.value)}
                          style={{
                            width: '100%', minHeight: 42, padding: '8px 10px', borderRadius: 10,
                            border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                            fontFamily: "'Cairo'", fontSize: 13.5, boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>عوائق / ملاحظات الموقع:</label>
                        <input
                          type="text"
                          value={logIssues}
                          onChange={e => setLogIssues(e.target.value)}
                          placeholder="مثال: تأخر توريد الرمل ساعتين"
                          style={{
                            width: '100%', minHeight: 42, padding: '8px 10px', borderRadius: 10,
                            border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                            fontFamily: "'Cairo'", fontSize: 13, boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* 📸🎥 حقل تصوير صورة أو تسجيل فيديو حي */}
                    <div style={{
                      background: 'var(--bg-color, #F8FAFC)',
                      padding: 12,
                      borderRadius: 12,
                      border: '1.5px dashed var(--border, #CBD5E1)',
                    }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Camera size={16} color="#10B981" />
                        <span>توثيق الموقع (تصوير صورة أو تسجيل فيديو):</span>
                      </div>

                      {!logMedia ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {/* Photo Button */}
                          <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '12px 8px', borderRadius: 10, border: '1.5px solid #10B981',
                            background: 'rgba(16,185,129,0.06)', color: '#059669',
                            fontSize: 13, fontWeight: 800, cursor: 'pointer', textAlign: 'center'
                          }}>
                            <Camera size={18} />
                            <span>تصوير صورة 📸</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={e => handleCaptureMedia(e, 'log')}
                              style={{ display: 'none' }}
                            />
                          </label>

                          {/* Video Button */}
                          <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '12px 8px', borderRadius: 10, border: '1.5px solid #6366F1',
                            background: 'rgba(99,102,241,0.06)', color: '#4F46E5',
                            fontSize: 13, fontWeight: 800, cursor: 'pointer', textAlign: 'center'
                          }}>
                            <Video size={18} />
                            <span>تصوير فيديو 🎥</span>
                            <input
                              type="file"
                              accept="video/*"
                              capture="environment"
                              onChange={e => handleCaptureMedia(e, 'log')}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{
                            position: 'relative', borderRadius: 10, overflow: 'hidden',
                            background: '#0F172A', maxHeight: 200, display: 'flex', justifyContent: 'center', alignItems: 'center'
                          }}>
                            {logMedia.type === 'image' ? (
                              <img src={logMedia.src} alt="معاينة الصورة" style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }} />
                            ) : (
                              <video src={logMedia.src} controls style={{ maxHeight: 200, width: '100%' }} />
                            )}
                            <button
                              type="button"
                              onClick={() => setLogMedia(null)}
                              style={{
                                position: 'absolute', top: 8, right: 8,
                                background: 'rgba(239,68,68,0.9)', color: '#fff',
                                border: 'none', borderRadius: 8, padding: '4px 8px',
                                fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <Trash2 size={13} /> حذف المرفق
                            </button>
                          </div>
                          <input
                            type="text"
                            value={logMediaCaption}
                            onChange={e => setLogMediaCaption(e.target.value)}
                            placeholder="وصف الصورة أو الفيديو (مثال: معاينة تشطيبات الصالة)"
                            style={{
                              width: '100%', minHeight: 38, padding: '6px 12px', borderRadius: 8,
                              border: '1.5px solid var(--border)', background: 'transparent',
                              fontFamily: "'Cairo'", fontSize: 12.5, color: 'var(--ink)', boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* أزرار الحفظ */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          flex: 1, minHeight: 46, borderRadius: 12, background: 'linear-gradient(135deg, #10B981, #059669)',
                          color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, fontFamily: "'Cairo'", cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                        }}
                      >
                        <Save size={16} />
                        {saving ? 'جاري الحفظ والمزامنة...' : 'حفظ اليومية والوسائط في السحابة'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAction(null)}
                        style={{
                          minHeight: 46, padding: '0 16px', borderRadius: 12, background: 'var(--border)',
                          color: 'var(--ink)', border: 'none', fontFamily: "'Cairo'", cursor: 'pointer', fontWeight: 700, fontSize: 13
                        }}
                      >
                        رجوع
                      </button>
                    </div>
                  </form>
                )}

                {/* Subtab 2: Logs History List with Photos & Videos (سجل اليوميات والوسائط) */}
                {logTab === 'list' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {projectLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}>
                        <ClipboardList size={32} color="#10B981" style={{ marginBottom: 6 }} />
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>لا توجد يوميات مسجلة بعد لهذا الموقع</div>
                        <button
                          type="button"
                          onClick={() => setLogTab('add')}
                          style={{
                            marginTop: 10, padding: '8px 16px', borderRadius: 8, background: '#10B981',
                            color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                          }}
                        >
                          + تسجيل أول يومية الآن
                        </button>
                      </div>
                    ) : (
                      projectLogs.map(log => {
                        const mediaItems = extractLogMedia(log);
                        return (
                          <div
                            key={log.id}
                            style={{
                              padding: '12px 14px', borderRadius: 12,
                              background: 'var(--bg-color, #F8FAFC)',
                              border: '1px solid var(--border)',
                              display: 'flex', flexDirection: 'column', gap: 8
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
                                📅 {fmtDate(log.date)}
                              </span>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                                  👷 {log.workers || 1} عمال
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                                  {log.author}
                                </span>
                              </div>
                            </div>

                            <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6 }}>
                              {log.work}
                            </div>

                            {log.issues && log.issues !== 'لا يوجد' && (
                              <div style={{ fontSize: 11.5, color: '#D97706', background: 'rgba(245,158,11,0.08)', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={13} />
                                <span>{log.issues}</span>
                              </div>
                            )}

                            {/* 📸🎥 مكان عرض الصور والفيديوهات المسجلة لليومية */}
                            {mediaItems.length > 0 && (
                              <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Camera size={13} color="#10B981" />
                                  <span>الصور والفيديوهات المسجلة ({mediaItems.length}):</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {mediaItems.map((item, mIdx) => (
                                    <MediaThumbnail
                                      key={mIdx}
                                      item={item}
                                      onClick={setPreviewMediaModal}
                                      style={{
                                        width: 75,
                                        height: 75,
                                        flexShrink: 0,
                                        border: '1.5px solid var(--border)',
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ ACTION 2: INSPECTIONS & SNAGS (الاستلامات) ══════════════ */}
            {activeAction === 'snag' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Header with back button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1877F2', fontWeight: 800, fontSize: 14 }}>
                    <CheckSquare size={18} />
                    <span>الاستلامات وفحص الجودة (Snags)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveAction(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ← تبديل الإجراء
                  </button>
                </div>

                {/* Subtabs: Add vs List */}
                <div style={{ display: 'flex', gap: 8, background: 'var(--bg-color, #F1F5F9)', padding: 4, borderRadius: 10 }}>
                  <button
                    type="button"
                    onClick={() => setSnagTab('add')}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: snagTab === 'add' ? '#fff' : 'transparent',
                      color: snagTab === 'add' ? '#1877F2' : 'var(--muted)',
                      fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      boxShadow: snagTab === 'add' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <Plus size={14} />
                    <span>تسجيل استلام جديد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnagTab('list')}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: snagTab === 'list' ? '#fff' : 'transparent',
                      color: snagTab === 'list' ? '#1877F2' : 'var(--muted)',
                      fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      boxShadow: snagTab === 'list' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <ClipboardList size={14} />
                    <span>سجل الملاحظات ({projectSnags.length})</span>
                  </button>
                </div>

                {/* Subtab 1: Add Snag/Inspection Form */}
                {snagTab === 'add' && (
                  <form onSubmit={handleSaveSnag} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* وصف البند المستلم */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 12.5, fontWeight: 700 }}>بند الاستلام / وصف الملاحظة: <span style={{ color: '#EF4444' }}>*</span></label>
                        <VoiceInput onResult={t => setSnagDesc(d => (d ? d + ' ' : '') + t)} />
                      </div>
                      <input
                        type="text"
                        required
                        value={snagDesc}
                        onChange={e => setSnagDesc(e.target.value)}
                        placeholder="مثال: استلام زوايا السيراميك، كبس مواسير السباكة..."
                        style={{
                          width: '100%', minHeight: 42, padding: '8px 12px', borderRadius: 10,
                          border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                          fontFamily: "'Cairo'", fontSize: 13.5, boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* المكان والغرفة + المقاول المسؤول */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>المكان / الغرفة:</label>
                        <input
                          type="text"
                          value={snagLocation}
                          onChange={e => setSnagLocation(e.target.value)}
                          placeholder="مثال: حمام الماستر"
                          style={{
                            width: '100%', minHeight: 42, padding: '8px 10px', borderRadius: 10,
                            border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                            fontFamily: "'Cairo'", fontSize: 13, boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>المقاول / الصنايعي:</label>
                        <input
                          type="text"
                          value={snagAssignee}
                          onChange={e => setSnagAssignee(e.target.value)}
                          placeholder="مثال: مقاول السباكة"
                          style={{
                            width: '100%', minHeight: 42, padding: '8px 10px', borderRadius: 10,
                            border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--ink)',
                            fontFamily: "'Cairo'", fontSize: 13, boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* نتيجة وحالة الاستلام */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>حالة الاستلام والاعتماد:</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setSnagStatus('done')}
                          style={{
                            padding: '8px 4px', borderRadius: 8,
                            border: snagStatus === 'done' ? '2px solid #10B981' : '1px solid var(--border)',
                            background: snagStatus === 'done' ? 'rgba(16,185,129,0.12)' : 'transparent',
                            color: snagStatus === 'done' ? '#059669' : 'var(--muted)',
                            fontWeight: 800, fontSize: 12, cursor: 'pointer'
                          }}
                        >
                          مطابق ومعتمد ✅
                        </button>
                        <button
                          type="button"
                          onClick={() => setSnagStatus('progress')}
                          style={{
                            padding: '8px 4px', borderRadius: 8,
                            border: snagStatus === 'progress' ? '2px solid #F59E0B' : '1px solid var(--border)',
                            background: snagStatus === 'progress' ? 'rgba(245,158,11,0.12)' : 'transparent',
                            color: snagStatus === 'progress' ? '#D97706' : 'var(--muted)',
                            fontWeight: 800, fontSize: 12, cursor: 'pointer'
                          }}
                        >
                          تحت التعديل ⚠️
                        </button>
                        <button
                          type="button"
                          onClick={() => setSnagStatus('pending')}
                          style={{
                            padding: '8px 4px', borderRadius: 8,
                            border: snagStatus === 'pending' ? '2px solid #EF4444' : '1px solid var(--border)',
                            background: snagStatus === 'pending' ? 'rgba(239,68,68,0.12)' : 'transparent',
                            color: snagStatus === 'pending' ? '#DC2626' : 'var(--muted)',
                            fontWeight: 800, fontSize: 12, cursor: 'pointer'
                          }}
                        >
                          مرفوض ❌
                        </button>
                      </div>
                    </div>

                    {/* توثيق الفحص بصورة أو فيديو */}
                    <div style={{
                      background: 'var(--bg-color, #F8FAFC)',
                      padding: 10,
                      borderRadius: 10,
                      border: '1.5px dashed var(--border)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                        إرفاق توثيق فحص (صورة أو فيديو):
                      </div>

                      {!snagMedia ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '9px 6px', borderRadius: 8, border: '1.5px solid #1877F2',
                            background: 'rgba(24,119,242,0.06)', color: '#1877F2',
                            fontSize: 12, fontWeight: 800, cursor: 'pointer', textAlign: 'center'
                          }}>
                            <Camera size={16} />
                            <span>صورة الفحص 📸</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={e => handleCaptureMedia(e, 'snag')}
                              style={{ display: 'none' }}
                            />
                          </label>

                          <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '9px 6px', borderRadius: 8, border: '1.5px solid #6366F1',
                            background: 'rgba(99,102,241,0.06)', color: '#4F46E5',
                            fontSize: 12, fontWeight: 800, cursor: 'pointer', textAlign: 'center'
                          }}>
                            <Video size={16} />
                            <span>فيديو الفحص 🎥</span>
                            <input
                              type="file"
                              accept="video/*"
                              capture="environment"
                              onChange={e => handleCaptureMedia(e, 'snag')}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#0F172A', maxHeight: 160, display: 'flex', justifyContent: 'center' }}>
                          {snagMedia.type === 'image' ? (
                            <img src={snagMedia.src} alt="معاينة" style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }} />
                          ) : (
                            <video src={snagMedia.src} controls style={{ maxHeight: 160, width: '100%' }} />
                          )}
                          <button
                            type="button"
                            onClick={() => setSnagMedia(null)}
                            style={{
                              position: 'absolute', top: 6, right: 6,
                              background: 'rgba(239,68,68,0.9)', color: '#fff',
                              border: 'none', borderRadius: 6, padding: '3px 6px',
                              fontSize: 11, fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </div>

                    {/* أزرار الحفظ */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          flex: 1, minHeight: 46, borderRadius: 12, background: 'linear-gradient(135deg, #1877F2, #0D65D9)',
                          color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, fontFamily: "'Cairo'", cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          boxShadow: '0 4px 14px rgba(24,119,242,0.35)'
                        }}
                      >
                        <Save size={16} />
                        {saving ? 'جاري الحفظ...' : 'حفظ واعتماد بند الاستلام'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAction(null)}
                        style={{
                          minHeight: 46, padding: '0 16px', borderRadius: 12, background: 'var(--border)',
                          color: 'var(--ink)', border: 'none', fontFamily: "'Cairo'", cursor: 'pointer', fontWeight: 700, fontSize: 13
                        }}
                      >
                        رجوع
                      </button>
                    </div>
                  </form>
                )}

                {/* Subtab 2: Snags List with Photo/Video previews */}
                {snagTab === 'list' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {projectSnags.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}>
                        <CheckCircle size={32} color="#10B981" style={{ marginBottom: 6 }} />
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>الموقع نظيف بالكامل!</div>
                        <div style={{ fontSize: 12 }}>لا توجد أي ملاحظات أو استلامات مسجلة لهذا المشروع.</div>
                      </div>
                    ) : (
                      projectSnags.map(snag => {
                        const isDone = snag.status === 'done';
                        const isProgress = snag.status === 'progress';
                        return (
                          <div
                            key={snag.id}
                            style={{
                              display: 'flex', flexDirection: 'column', gap: 6,
                              padding: '10px 12px', borderRadius: 10,
                              background: isDone ? 'rgba(16,185,129,0.06)' : 'var(--bg-color, #F8FAFC)',
                              border: isDone ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontWeight: 700, fontSize: 13,
                                  textDecoration: isDone ? 'line-through' : 'none',
                                  color: isDone ? 'var(--muted)' : 'var(--ink)'
                                }}>
                                  {snag.desc}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                                  {snag.location && <span>📍 {snag.location}</span>}
                                  {snag.assignee && <span>👷 {snag.assignee}</span>}
                                  <span>📅 {snag.date}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleSnagStatus(snag.id, snag.status)}
                                style={{
                                  padding: '6px 10px', borderRadius: 8,
                                  background: isDone ? '#10B981' : isProgress ? '#F59E0B' : '#EF4444',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
                                }}
                              >
                                <CheckCircle size={13} />
                                <span>{isDone ? 'معتمد ✅' : isProgress ? 'قيد التعديل ⏳' : 'مفتوح ❌'}</span>
                              </button>
                            </div>

                            {/* صورة أو فيديو الفحص إن وجد */}
                            {snag.photo && (
                              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MediaThumbnail
                                  item={{
                                    id: snag.mediaId,
                                    src: snag.photo,
                                    type: snag.mediaType || (snag.photo.startsWith('data:video') ? 'video' : 'image'),
                                  }}
                                  onClick={setPreviewMediaModal}
                                  style={{ width: 50, height: 50, borderRadius: 6, flexShrink: 0 }}
                                />
                                <span style={{ fontSize: 11, color: 'var(--muted)' }}>اضغط لمعاينة التوثيق المرفق</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
