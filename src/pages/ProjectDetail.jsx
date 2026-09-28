import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Building2, CalendarDays, Pencil, Trash2, ArrowRight, Plus, X, AlertTriangle, Paperclip, CheckSquare, MessageCircle, FileText, Map as MapIcon, MapPin, Clock, Wallet, Package, Home, Wrench, Sparkles, Target, MessageSquare, Share2, Printer, Camera, Video, Play, HardHat, Search, Filter, ChevronDown, Loader2, CheckCircle2, CloudUpload } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

import StampRing from '../components/StampRing';
import { STAGES, ENGINEERS, TECH_OFFICE } from '../utils/constants';
import { fmtDate, todayISO, nowTimeISO, fmtTime, fmtDateTime, compressImageFile } from '../utils/helpers';
import { uploadMediaToFirebaseStorage, generatePortalToken } from '../services/cloudSync';
import { saveMediaBlob, getMediaBlob, createMicroThumbnail, repairProjectLegacyMedia } from '../utils/mediaStorage';
import MediaThumbnail from '../components/MediaThumbnail';
import MediaLightbox from '../components/MediaLightbox';
import { openWhatsApp, WHATSAPP_TEMPLATES } from '../utils/whatsappTemplates';
import ImageAnnotator from '../components/ImageAnnotator';
import FloorPlanAnnotator from '../components/FloorPlanAnnotator';
import VoiceInput from '../components/VoiceInput';
import ProjectSchedule from '../components/ProjectSchedule';
import ProjectFinance from '../components/ProjectFinance';
import ProjectSupply from '../components/ProjectSupply';
import ProjectRooms from '../components/ProjectRooms';
import ClientReportModal from '../components/ClientReportModal';
import ContractGeneratorModal from '../components/ContractGeneratorModal';
import CraftsmanContractModal from '../components/CraftsmanContractModal';
import ProjectCraftsmen from '../components/ProjectCraftsmen';
import ContractsHubPanel from '../components/ContractsHubPanel';
import ProjectDrawings from '../components/ProjectDrawings';
import confetti from 'canvas-confetti';
import { can } from '../utils/permissions';
import ErrorBoundary from '../components/ErrorBoundary';

export default function ProjectDetail({ project, team, userRole, onBack, onEdit, onDelete, onUpdate, initialSub, currentUser, activeCompanyId, onOpenClientPortal }) {
  const [confirming, setConfirming] = useState(false);
  const [showClientReport, setShowClientReport] = useState(false);
  const [activeContractView, setActiveContractView] = useState(null); // 'craftsman' | 'client' | null
  const [selectedWorkerForContract, setSelectedWorkerForContract] = useState(null);

  const craftsmenCount = (Array.isArray(project?.craftsmen) ? project.craftsmen.length : (project?.craftsmanContracts && typeof project.craftsmanContracts === 'object' ? Object.keys(project.craftsmanContracts).length : 5));

  const materialsList = Array.isArray(project?.resources?.materials) ? project.resources.materials.filter(Boolean) : [];
  const pendingMaterialsCount = materialsList.filter(m => m && m.status !== 'تم التوريد').length;

  const rawLogs = Array.isArray(project?.dailyLogs)
    ? project.dailyLogs
    : (project?.dailyLogs && typeof project.dailyLogs === 'object' ? Object.values(project.dailyLogs) : []);
  const safeLogs = rawLogs.filter(Boolean);

  const rawSnags = Array.isArray(project?.snags) ? project.snags : [];
  const safeSnags = rawSnags.filter(Boolean);

  const rawRooms = Array.isArray(project?.rooms) ? project.rooms : [];
  const safeRooms = rawRooms.filter(Boolean);

  const SUBTABS = [
    { key: "diary",     label: "اليوميات",       icon: CalendarDays, perm: 'project_tab_diary', count: safeLogs.length },
    { key: "craftsmen", label: "صنايعية الموقع", icon: HardHat,      perm: 'project_tab_craftsmen', count: craftsmenCount },
    { key: "snags",     label: "الاستلامات",     icon: CheckSquare, perm: 'project_tab_snags', count: safeSnags.length },
    { key: "schedule",  label: "الجدول الزمني",  icon: Clock,       perm: 'project_tab_gantt' },
    { key: "workplan",  label: "خطة العمل",     icon: Target,      perm: 'project_tab_diary' },
    { key: "drawings",  label: "الرسومات 3D",    icon: Sparkles,    perm: 'project_tab_drawings' },
    { key: "rooms",     label: "الغرف",         icon: Home,        perm: 'project_tab_rooms', count: safeRooms.length },
    { key: "supply",    label: "التوريدات",     icon: Package,     perm: 'project_tab_supply', count: pendingMaterialsCount || (materialsList.length ? materialsList.length : undefined) },
    { key: "finance",   label: "المالية",        icon: Wallet,      perm: 'project_tab_finance' },
    { key: "overview",  label: "البيانات",       icon: Building2,   perm: null },
    { key: "contracts", label: "العقود والعميل", icon: FileText,    perm: null, count: 4 },
  ].filter(t => !t.perm || can(currentUser || userRole, t.perm));

  // التبويب الافتراضي: أول تبويب متاح
  const defaultSub = SUBTABS[0]?.key || 'overview';
  const resolvedInitial = (initialSub && SUBTABS.find(t => t.key === initialSub)) ? initialSub : defaultSub;
  const [sub, setSub] = useState(resolvedInitial);

  useEffect(() => {
    if (initialSub && SUBTABS.find(t => t.key === initialSub)) setSub(initialSub);
  }, [initialSub]);

  // فحص وإنقاذ تلقائي فوري لأي صور قديمة محلياً بمجرد فتح المشروع
  useEffect(() => {
    if (project?.id && typeof onUpdate === 'function') {
      repairProjectLegacyMedia(project, onUpdate);
    }
  }, [project?.id]);

  return (
    <div className="tab-fade">
      <div className="back-link" onClick={onBack}><ArrowRight size={16} /> العودة إلى قائمة المواقع</div>

      {confirming && (
        <div className="confirm-bar">
          <span>هل أنت متأكد من حذف موقع "{project.name}"؟ جميع البيانات المرتبطة ستحذف نهائياً.</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-danger" onClick={onDelete}>تأكيد الحذف</button>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* ── Project Header Card ── */}
      <div className="project-detail-header panel">
        <div className="project-header-top">
          <div className="project-info-block">
            <div className="project-title-row">
              <h2 className="project-title-text font-display">{project.name}</h2>
              <StatusBadge status={project.status} />
            </div>
            <div className="project-meta-chips">
              <div className="meta-chip">
                <span className="meta-chip-label">العميل:</span>
                <span className="meta-chip-val">{typeof project.client === 'object' ? (project.client.name || '—') : (project.client || '—')}</span>
              </div>
              <span className="meta-dot">•</span>
              <div className="meta-chip">
                <span className="meta-chip-label">المنطقة:</span>
                <span className="meta-chip-val">{typeof project.area === 'object' ? (project.area.name || '—') : (project.area || '—')}</span>
              </div>
              {project.engineer && (
                <>
                  <span className="meta-dot">•</span>
                  <div className="meta-chip">
                    <span className="meta-chip-label">المهندس:</span>
                    <span className="meta-chip-val">{typeof project.engineer === 'object' ? (project.engineer.name || '—') : project.engineer}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="project-progress-circle">
            <span className="progress-circle-label">نسبة الإنجاز</span>
            <StampRing value={project.progress} size={74} />
          </div>
        </div>

        {/* ── Action Toolbar (Manage) ── */}
        {(can(currentUser || userRole, 'projects_edit') || can(currentUser || userRole, 'projects_delete')) && (
          <div className="project-action-toolbar" style={{ justifyContent: 'flex-end' }}>
            <div className="secondary-action-group">
              <button
                type="button"
                className="btn btn-outline btn-report-top"
                onClick={() => setShowClientReport(true)}
                title="توليد تقرير العميل وإرساله عبر واتساب"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: '#10B981', color: '#10B981', background: 'rgba(16, 185, 129, 0.06)' }}
              >
                <MessageCircle size={15} /> <span>تقرير واتساب 📱</span>
              </button>
              {can(currentUser || userRole, 'projects_edit') && (
                <button className="btn btn-edit-proj" onClick={onEdit}>
                  <Pencil size={15} /> <span>تعديل</span>
                </button>
              )}
              {can(currentUser || userRole, 'projects_delete') && (
                <button className="btn btn-ghost btn-delete-proj" onClick={() => setConfirming(true)}>
                  <Trash2 size={15} /> <span>حذف</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showClientReport && (
        <ClientReportModal project={project} onClose={() => setShowClientReport(false)} />
      )}

      {/* ── Mobile Tab Navigation Grid (3 Columns) ── */}
      <div className="mobile-subtabs-grid">
        {SUBTABS.map((t) => {
          const isActive = sub === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => { setSub(t.key); setActiveContractView(null); }}
              className={`mobile-tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span className="mobile-tab-badge">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Desktop/Tablet Modern Subtabs Grid ── */}
      <div className="desktop-subtabs-container">
        <div className="desktop-subtabs-grid">
          {SUBTABS.map((t) => {
            const isActive = sub === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => { setSub(t.key); setActiveContractView(null); }}
                className={`desktop-subtab-card ${isActive ? 'active' : ''}`}
                title={t.label}
              >
                <div className="desktop-subtab-icon-box">
                  <Icon size={20} />
                  {t.count !== undefined && t.count > 0 && (
                    <span className="desktop-subtab-badge">{t.count}</span>
                  )}
                </div>
                <span className="desktop-subtab-label">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ErrorBoundary key={sub} onBack={onBack} message="حدث خطأ أثناء تحميل محتوى هذا القسم، يمكنك التبديل لقسم آخر أو العودة لقائمة المواقع.">
        <div className="tab-fade">
          {sub === "craftsmen" && (
            <ProjectCraftsmen 
              project={project} 
              onUpdate={onUpdate} 
              currentUser={currentUser} 
              userRole={userRole} 
              onOpenContractModal={(worker) => {
                setSelectedWorkerForContract(worker);
                setSub('contracts');
                setActiveContractView('craftsman');
              }} 
            />
          )}
          {sub === "snags"    && <SnagsPanel project={project} onUpdate={onUpdate} />}
          {sub === "drawings" && <ProjectDrawings project={project} onUpdate={onUpdate} />}
          {sub === "diary"    && <DiaryPanel project={project} team={team} onUpdate={onUpdate} />}
          {sub === "workplan" && <WorkPlanPanel project={project} onUpdate={onUpdate} />}
          {sub === "rooms"    && <ProjectRooms project={project} onUpdate={onUpdate} />}
          {sub === "schedule" && <ProjectSchedule project={project} onUpdate={onUpdate} />}
          {sub === "supply"   && <ProjectSupply project={project} currentUser={currentUser} userRole={userRole} onUpdate={onUpdate} />}
          {sub === "finance"  && can(currentUser || userRole, 'project_tab_finance') && <ProjectFinance project={project} onUpdate={onUpdate} />}
          {sub === "overview" && <OverviewPanel project={project} onUpdate={onUpdate} />}
          {sub === "contracts" && (
            activeContractView === 'craftsman' ? (
              <CraftsmanContractModal 
                project={project} 
                initialWorker={selectedWorkerForContract}
                onUpdate={onUpdate} 
                isInline={true}
                onClose={() => { setActiveContractView(null); setSelectedWorkerForContract(null); }} 
              />
            ) : activeContractView === 'client' ? (
              <ContractGeneratorModal 
                project={project} 
                onUpdate={onUpdate} 
                isInline={true}
                onClose={() => setActiveContractView(null)} 
              />
            ) : (
              <ContractsHubPanel 
                project={project} 
                currentUser={currentUser} 
                userRole={userRole} 
                activeCompanyId={activeCompanyId || project.companyId}
                onUpdate={onUpdate}
                onOpenCraftsmanContract={(worker = null) => {
                  setSelectedWorkerForContract(worker);
                  setActiveContractView('craftsman');
                }}
                onOpenClientContract={() => {
                  setActiveContractView('client');
                }}
                onOpenClientReport={() => {
                  setShowClientReport(true);
                }}
                onOpenClientPortal={(token) => {
                  if (!onOpenClientPortal) return;
                  let activeToken = token || project.clientPortalToken;
                  if (!activeToken) {
                    activeToken = generatePortalToken();
                  }
                  if (onUpdate && (project.clientPortalToken !== activeToken || project.clientPortalEnabled !== true)) {
                    onUpdate({ clientPortalToken: activeToken, clientPortalEnabled: true });
                  }
                  onOpenClientPortal(activeToken);
                }}
              />
            )
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}

function SnagsPanel({ project, onUpdate }) {
  const snags = (project.snags || []).filter(Boolean);
  const floorPlan = project.floorPlan || null;
  const engName = typeof project.engineer === 'object' ? (project.engineer.name || "") : (project.engineer || "");
  const [form, setForm] = useState({ desc: "", location: "", assignee: engName, status: "pending", photo: null, thumbnail: "", mediaId: null, pin: null });
  const [confirmId, setConfirmId] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFP, setIsUploadingFP] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState(null);
  const [pickingPin, setPickingPin] = useState(false);
  const [uploadingAfterPhotoFor, setUploadingAfterPhotoFor] = useState(null);

  const doneCount = snags.filter((s) => s.status === "done").length;
  const totalCount = snags.length;

  const handlePhotoUpload = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    
    setIsUploading(true);
    try {
      const mediaId = 'snag_ph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const thumb = await createMicroThumbnail(selected, false);
      await saveMediaBlob(mediaId, selected, { type: selected.type, name: selected.name });
      const compId = project.companyId || (typeof localStorage !== 'undefined' ? (localStorage.getItem('platform-active-tenant-id') || localStorage.getItem('tashteeb_active_company_id')) : '') || 'company';
      // رفع سحابي لـ Cloud Vault
      let cloudUrl = null;
      try {
        cloudUrl = await uploadMediaToFirebaseStorage(
          selected,
          `companies/${compId}/projects/${project.id}`,
          selected.name,
          thumb,
          mediaId,
          compId
        );
      } catch (uploadErr) {
        console.warn("[Snags] Cloud upload notice:", uploadErr);
      }

      const persistentPhoto = cloudUrl || thumb || `idb://${mediaId}`;

      setForm(prev => ({
        ...prev,
        photo: persistentPhoto,
        thumbnail: thumb,
        mediaId
      }));

      setAnnotatingImage(compressed);
    } catch (err) {
      console.warn("handlePhotoUpload error:", err);
      const reader = new FileReader();
      reader.onload = (ev) => setAnnotatingImage(ev.target.result);
      reader.readAsDataURL(selected);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFloorPlanUpload = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setIsUploadingFP(true);
    try {
      const mediaId = 'fp_' + Date.now();
      const thumb = await createMicroThumbnail(selected, false);
      await saveMediaBlob(mediaId, selected, { type: selected.type, name: selected.name });
      const compressed = await compressImageFile(selected, 1400, 0.8);
      onUpdate({ floorPlan: compressed, floorPlanThumbnail: thumb, updatedAt: new Date().toISOString() });
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onUpdate({ floorPlan: ev.target.result, updatedAt: new Date().toISOString() });
      };
      reader.readAsDataURL(selected);
    } finally {
      setIsUploadingFP(false);
    }
  };
  
  const handleAfterPhotoUpload = async (id, e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setUploadingAfterPhotoFor(id);
    try {
      const mediaId = 'snag_after_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const thumb = await createMicroThumbnail(selected, false);
      await saveMediaBlob(mediaId, selected, { type: selected.type, name: selected.name });
      const compId = project.companyId || (typeof localStorage !== 'undefined' ? (localStorage.getItem('platform-active-tenant-id') || localStorage.getItem('tashteeb_active_company_id')) : '') || 'company';
      // رفع سحابي لـ Cloud Vault
      let cloudUrl = null;
      try {
        cloudUrl = await uploadMediaToFirebaseStorage(
          selected,
          `companies/${compId}/projects/${project.id}`,
          selected.name,
          thumb,
          mediaId,
          compId
        );
      } catch (uploadErr) {
        console.warn("[Snags] After photo cloud upload notice:", uploadErr);
      }

      const finalSrc = cloudUrl || thumb || `idb://${mediaId}`;

      onUpdate({
        snags: snags.map(s => s.id === id ? {
          ...s,
          afterPhoto: finalSrc,
          afterThumbnail: thumb,
          afterMediaId: mediaId,
          updatedAt: now
        } : s),
        updatedAt: now
      });
    } catch (err) {
      console.warn("handleAfterPhotoUpload error:", err);
    } finally {
      setUploadingAfterPhotoFor(null);
    }
  };

  function addSnag(e) {
    e.preventDefault();
    if (!form.desc.trim()) return;
    const now = new Date().toISOString();
    const newSnag = { 
      id: "snag_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      desc: form.desc.trim(),
      location: (form.location || "").trim(),
      assignee: (form.assignee || engName || "").trim(),
      status: form.status || "pending",
      photo: form.photo || null,
      thumbnail: form.thumbnail || "",
      mediaId: form.mediaId || null,
      pin: form.pin || null,
      date: todayISO(),
      number: snags.length + 1,
      createdAt: now,
      updatedAt: now
    };
    onUpdate({
      snags: [newSnag, ...snags],
      updatedAt: now
    });
    setForm({ desc: "", location: "", assignee: engName, status: "pending", photo: null, thumbnail: "", mediaId: null, pin: null });
  }

  function setSnagStatus(id, status) {
    const now = new Date().toISOString();
    onUpdate({
      snags: snags.map((s) => (s.id === id ? { ...s, status, updatedAt: now } : s)),
      updatedAt: now
    });
    
    if (status === 'done') {
      const doneCountNow = snags.filter(s => s.id !== id && s.status === 'done').length + 1;
      if (doneCountNow === snags.length && snags.length > 0) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#F59E0B', '#3B82F6']
        });
      }
    }
  }

  function removeSnag(id) {
    const now = new Date().toISOString();
    onUpdate({
      snags: snags.filter((s) => s.id !== id),
      updatedAt: now
    });
    setConfirmId(null);
  }

  function shareWhatsApp() {
    const pendingSnags = snags.filter(s => s.status !== "done");
    if (pendingSnags.length === 0) {
      alert("لا يوجد ملاحظات مفتوحة لمشاركتها!");
      return;
    }
    
    let text = `*ملاحظات موقع: ${project.name}*\nالتاريخ: ${fmtDate(todayISO())}\n\n`;
    pendingSnags.forEach((s, idx) => {
      text += `${idx + 1}. ${s.desc}`;
      if (s.location) text += ` (المكان: ${s.location})`;
      if (s.assignee) text += ` - المسؤول: ${s.assignee}`;
      text += ` [${s.status === 'progress' ? 'جاري العمل ⏳' : 'لم تنجز ❌'}]\n`;
    });
    
    text += `\nإجمالي الملاحظات المتبقية: ${pendingSnags.length}`;
    
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  function exportPDF() {
    window.print();
  }

  const existingPins = snags.filter(s => s.pin).map(s => ({ ...s.pin, number: s.number }));

  return (
    <>
      {previewModal && (
        <MediaLightbox item={previewModal} onClose={() => setPreviewModal(null)} />
      )}

      {annotatingImage && (
        <ImageAnnotator
          imageSrc={annotatingImage}
          onSave={async (annotatedUrl) => {
            try {
              const mediaId = 'snag_ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
              const thumb = await createMicroThumbnail(annotatedUrl, false);
              await saveMediaBlob(mediaId, annotatedUrl, { type: 'image/jpeg' });
              setForm(prev => ({
                ...prev,
                photo: `idb://${mediaId}`,
                thumbnail: thumb,
                mediaId
              }));
            } catch (err) {
              setForm(prev => ({ ...prev, photo: annotatedUrl }));
            }
            setAnnotatingImage(null);
          }}
          onCancel={() => setAnnotatingImage(null)}
        />
      )}
      
      {pickingPin && floorPlan && (
        <FloorPlanAnnotator
          imageSrc={floorPlan}
          initialPins={existingPins}
          onSave={(coord) => {
            setForm({ ...form, pin: coord });
            setPickingPin(false);
          }}
          onCancel={() => setPickingPin(false)}
        />
      )}
      
      <div className="grid print-container snags-grid" style={{ gap: 20 }}>
        {/* KPI & Summary Card */}
        <div className="panel snags-summary-card">
          <div className="snags-summary-main">
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: doneCount === totalCount && totalCount > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: doneCount === totalCount && totalCount > 0 ? "var(--teal)" : "var(--danger)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}>
              <CheckSquare size={28} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>ملاحظات الاستلام والفحص (Snags)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginTop: 2 }}>
                {doneCount} / {totalCount} <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>تم إنجازها</span>
              </div>
            </div>
          </div>
          <div className="snags-summary-actions no-print">
            <button className="btn btn-ghost" onClick={shareWhatsApp} title="مشاركة الملاحظات عبر الواتساب">
              <Share2 size={16} color="var(--teal)" /> مشاركة واتساب
            </button>
            <button className="btn btn-ghost" onClick={exportPDF} title="طباعة تقرير الفحص">
              <Printer size={16} /> طباعة التقرير
            </button>
          </div>
        </div>

        {/* Add Snag Form */}
        <div className="panel no-print">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}><Plus size={18} /> إضافة ملاحظة جديدة (Snag)</h3>
            
            {/* Floor Plan Upload Header Button */}
            {!floorPlan ? (
              <label className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 12px", border: "1px dashed var(--border)", cursor: "pointer", color: "var(--teal)" }}>
                <MapIcon size={16} /> {isUploadingFP ? "جاري الرفع..." : "رفع مخطط معماري للمشروع 📍"}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFloorPlanUpload} />
              </label>
            ) : (
              <label className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 12px", cursor: "pointer", color: "var(--muted)" }}>
                <MapIcon size={16} /> تغيير المخطط
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFloorPlanUpload} />
              </label>
            )}
          </div>
          
          <form onSubmit={addSnag} className="form-grid" style={{ background: "rgba(0,0,0,0.01)", padding: 20, borderRadius: 12, border: "1px solid var(--border)" }}>
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label>وصف الملاحظة المشاهدة في الموقع</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input style={{ flex: 1 }} required value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="مثال: لحام السباكة غير جيد، سيراميك غير مستوي..." />
                <VoiceInput onResult={(text) => setForm({ ...form, desc: form.desc + (form.desc ? " " : "") + text })} />
              </div>
            </div>
            
            <div className="form-field">
              <label>المكان / الغرفة</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="مثال: حمام الضيوف" />
            </div>
            <div className="form-field">
              <label>الصنايعي / المقاول المسؤول</label>
              <input value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="مثال: مقاول السباكة" />
            </div>
            
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <label className="btn btn-ghost" style={{ cursor: "pointer", border: "1px dashed var(--border)", padding: "10px 16px" }}>
                <Paperclip size={16} /> {form.photo ? "تغيير الصورة" : "إرفاق صورة للمشكلة 📸"}
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoUpload} />
              </label>
              
              {floorPlan && (
                <button type="button" className="btn btn-ghost" onClick={() => setPickingPin(true)} style={{ border: "1px dashed var(--border)", padding: "10px 16px", color: form.pin ? "var(--teal)" : "var(--ink)" }}>
                  <MapPin size={16} /> {form.pin ? "تم تحديد الموقع 📍" : "أشر على المخطط 📍"}
                </button>
              )}
              
              {isUploading && <span style={{ color: "var(--teal)", fontSize: 13, fontWeight: 600 }}>جاري إرفاق الصورة...</span>}
              {form.photo && !isUploading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--teal)", fontSize: 13, fontWeight: 600 }}>
                  <CheckSquare size={16} /> تم إرفاق الصورة بنجاح
                  <span style={{ cursor: "pointer", color: "var(--danger)", textDecoration: "underline" }} onClick={() => setForm({...form, photo: null})}>حذف</span>
                </div>
              )}
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button 
                className="btn btn-primary" 
                type="submit" 
                disabled={isUploading}
                style={{ 
                  padding: "12px 24px", 
                  opacity: isUploading ? 0.75 : 1, 
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: isUploading ? '#475569' : undefined
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>جاري رفع الصورة... استنّي ⏳</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} /> حفظ الملاحظة
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Render Floorplan Thumbnail in print or if it exists with pins */}
        {floorPlan && existingPins.length > 0 && (
          <div className="panel">
            <h3>أماكن الملاحظات على المخطط</h3>
            <div style={{ position: "relative", width: "100%", maxWidth: 600, margin: "0 auto", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <img src={floorPlan} alt="Floor Plan" style={{ width: "100%", display: "block" }} />
              {existingPins.map((p, i) => (
                <div key={i} style={{
                  position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
                  transform: "translate(-50%, -100%)",
                  color: "var(--danger)", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
                }}>
                  <MapPin size={32} fill="currentColor" color="white" strokeWidth={1.5} />
                  <div style={{
                    position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                    color: "white", fontSize: 12, fontWeight: "bold"
                  }}>{p.number}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel">
          <h3 style={{ margin: "0 0 16px 0" }}>سجل الملاحظات ({totalCount})</h3>
          {totalCount === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>لا توجد ملاحظات مسجلة حالياً.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {snags.map((s) => (
                <div key={s.id} className="snag-item-card" style={{ 
                  opacity: s.status === 'done' ? 0.75 : 1
                }}>
                  <div className="snag-item-row">
                    <div className="snag-item-main">
                      <div className="snag-num-badge" style={{ 
                        background: s.status === 'done' ? "rgba(16, 185, 129, 0.1)" : s.status === 'progress' ? "rgba(59, 130, 246, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: s.status === 'done' ? "var(--teal)" : s.status === 'progress' ? "#3B82F6" : "var(--danger)"
                      }}>
                        {s.number ? <span>{s.number}</span> : <CheckSquare size={16} />}
                      </div>
                      <div className="snag-text-block">
                        <div className="snag-desc-text" style={{ textDecoration: s.status === 'done' ? "line-through" : "none" }}>{s.desc}</div>
                        <div className="snag-meta-chips">
                          {s.location && <span className="snag-chip">📍 <strong style={{ color: "var(--ink)" }}>{s.location}</strong></span>}
                          {s.assignee && <span className="snag-chip">👤 <strong style={{ color: "var(--ink)" }}>{s.assignee}</strong></span>}
                          {s.date && <span className="snag-chip">📅 {fmtDate(s.date)}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="snag-item-actions no-print">
                      {s.assignee && (
                        <button
                          type="button"
                          className="btn btn-craftsman-task"
                          title="إرسال تكليف وملاحظة للصنايعي بالواتساب"
                          onClick={() => {
                            const msg = WHATSAPP_TEMPLATES.craftsmanSnagDispatch(
                              s.assignee,
                              project.name,
                              project.name,
                              s.desc,
                              s.location || 'الموقع',
                              '48 ساعة'
                            );
                            openWhatsApp('', msg);
                          }}
                        >
                          <MessageSquare size={13} />
                          <span>تكليف بالواتساب</span>
                        </button>
                      )}

                      <select 
                        className="snag-status-select"
                        style={{ 
                          background: s.status === 'done' ? "rgba(16, 185, 129, 0.12)" : s.status === 'progress' ? "rgba(59, 130, 246, 0.12)" : "rgba(239, 68, 68, 0.12)",
                          color: s.status === 'done' ? "var(--teal)" : s.status === 'progress' ? "#3B82F6" : "var(--danger)",
                        }} 
                        value={s.status} 
                        onChange={(e) => setSnagStatus(s.id, e.target.value)}
                      >
                        <option value="pending">لم تنجز ❌</option>
                        <option value="progress">جاري العمل ⏳</option>
                        <option value="done">تم الإصلاح ✅</option>
                      </select>

                      {confirmId === s.id ? (
                        <div style={{ display: "flex", gap: 6, background: "rgba(239, 68, 68, 0.1)", padding: 4, borderRadius: 6 }}>
                          <span className="icon-btn" style={{ width: 28, height: 28, background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }} onClick={() => removeSnag(s.id)}><Trash2 size={14} /></span>
                          <span className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setConfirmId(null)}><X size={14} /></span>
                        </div>
                      ) : (
                        <span className="icon-btn" title="حذف الملاحظة" onClick={() => setConfirmId(s.id)}><Trash2 size={16} /></span>
                      )}
                    </div>
                  </div>

                  {/* Photos Section: Before and After */}
                  {(s.photo || s.afterPhoto || (s.status === 'done' && !s.afterPhoto)) && (
                    <div className="snag-photos-strip">
                      {s.photo && (
                        <div className="snag-photo-box">
                          <div className="snag-photo-label before">توثيق الفحص:</div>
                          <MediaThumbnail
                            item={{
                              id: s.mediaId,
                              src: s.photo,
                              type: s.mediaType || (typeof s.photo === 'string' && s.photo.startsWith('data:video') ? 'video' : 'image'),
                              caption: `فحص: ${s.desc}`
                            }}
                            onClick={setPreviewModal}
                            style={{ width: '100%', height: 120, borderRadius: 8 }}
                          />
                        </div>
                      )}
                      
                      {s.afterPhoto ? (
                        <div className="snag-photo-box">
                          <div className="snag-photo-label after">بعد الإصلاح:</div>
                          <MediaThumbnail
                            item={{
                              src: s.afterPhoto,
                              type: 'image',
                              caption: `إصلاح: ${s.desc}`
                            }}
                            onClick={setPreviewModal}
                            style={{ width: '100%', height: 120, borderRadius: 8 }}
                          />
                        </div>
                      ) : s.status === 'done' ? (
                        <div className="snag-photo-add-box no-print">
                          <label className="btn btn-ghost" style={{ cursor: "pointer", border: "1px dashed var(--teal)", color: "var(--teal)", height: "100%", minHeight: 90, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            {uploadingAfterPhotoFor === s.id ? "جاري الرفع..." : (
                              <>
                                <Plus size={20} style={{ marginBottom: 4 }} />
                                أضف صورة بعد الإصلاح
                              </>
                            )}
                            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleAfterPhotoUpload(s.id, e)} />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DiaryPanel({ project, team, onUpdate }) {
  const rawLogs = Array.isArray(project?.dailyLogs)
    ? project.dailyLogs
    : (project?.dailyLogs && typeof project.dailyLogs === 'object' ? Object.values(project.dailyLogs) : []);
  const logs = useMemo(() => rawLogs.filter(Boolean), [rawLogs]);
  const hasTodayLog = useMemo(() => {
    const today = todayISO();
    return logs.some(l => l && (l.date === today || (typeof l.date === 'string' && l.date.startsWith(today))));
  }, [logs]);
  
  const engineerNames = (team?.engineers || []).map(e => (typeof e === 'string' ? e : e?.name)).filter(Boolean);
  const techOfficeNames = (team?.techOffice || []).map(e => (typeof e === 'string' ? e : e?.name)).filter(Boolean);
  const engineerList = engineerNames.length ? engineerNames : (ENGINEERS || []).map(e => (typeof e === 'string' ? e : e?.name)).filter(Boolean);
  const techOfficeList = techOfficeNames.length ? techOfficeNames : (TECH_OFFICE || []).map(e => (typeof e === 'string' ? e : e?.name)).filter(Boolean);
  const projEng = typeof project?.engineer === 'string' ? project.engineer : (project?.engineer?.name || '');
  const authorOptions = Array.from(new Set([...engineerList, ...techOfficeList, projEng].filter(Boolean)));
  
  const defaultAuthor = projEng || authorOptions[0] || "";
  const [form, setForm] = useState({ date: todayISO(), author: defaultAuthor, work: "", issues: "", workers: 5 });
  const [mediaList, setMediaList] = useState([]); // [{ src, type: 'image' | 'video', name }]
  const [previewModal, setPreviewModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // Filter states requested: Today (default), Week, Month, Custom Date, or All
  const [periodFilter, setPeriodFilter] = useState('today'); // 'today' | 'week' | 'month' | 'custom' | 'all'
  const [customDate, setCustomDate] = useState(todayISO());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [filterOnlyIssues, setFilterOnlyIssues] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const currentDefault = projEng || authorOptions[0] || "";
    setForm((prev) => ({
      ...prev,
      author: currentDefault
    }));
  }, [project?.id, projEng, team]);

  // ─── Phase 2: Retroactive Media Repair Engine (فحص وإصلاح الصور القديمة المحفوظة كـ idb:// في السحابة) ───
  const [repairState, setRepairState] = useState({
    running: false,
    repairedCount: 0,
    unrecoverableCount: 0,
    totalCount: 0,
    showBanner: false
  });
  const repairRanRef = useRef({});

  useEffect(() => {
    let active = true;
    const projId = project?.id;
    if (!projId || repairRanRef.current[projId]) return;

    const dailyLogs = Array.isArray(project.dailyLogs)
      ? project.dailyLogs
      : (project.dailyLogs && typeof project.dailyLogs === 'object' ? Object.values(project.dailyLogs) : []);

    if (dailyLogs.length === 0) return;

    // فحص ما إذا كان هناك صور محفوظة بـ idb:// ولم ترفع سحابياً
    const itemsToRepair = [];
    dailyLogs.forEach((log) => {
      if (Array.isArray(log.photos)) {
        log.photos.forEach((ph) => {
          const src = typeof ph === 'string' ? ph : ph?.src;
          const rawSrc = typeof ph === 'object' ? ph?.rawSrc : null;
          const id = typeof ph === 'object' ? ph?.id : (src?.startsWith('idb://') ? src.replace('idb://', '') : null);
          const isIdb = (src && src.startsWith('idb://')) || (rawSrc && rawSrc.startsWith('idb://'));
          const isNotCloud = !src || (!src.startsWith('http://') && !src.startsWith('https://'));
          if (id && isIdb && isNotCloud && !itemsToRepair.some(i => i.mediaId === id)) {
            itemsToRepair.push({ mediaId: id, logId: log.id });
          }
        });
      }
      if (Array.isArray(log.media)) {
        log.media.forEach((md) => {
          const src = md?.src;
          const rawSrc = md?.rawSrc;
          const id = md?.id || (src?.startsWith('idb://') ? src.replace('idb://', '') : (rawSrc?.startsWith('idb://') ? rawSrc.replace('idb://', '') : null));
          const isIdb = (src && src.startsWith('idb://')) || (rawSrc && rawSrc.startsWith('idb://'));
          const isNotCloud = !src || (!src.startsWith('http://') && !src.startsWith('https://'));
          if (id && isIdb && isNotCloud && !itemsToRepair.some(i => i.mediaId === id)) {
            itemsToRepair.push({ mediaId: id, logId: log.id });
          }
        });
      }
    });

    if (itemsToRepair.length === 0) return;
    repairRanRef.current[projId] = true;

    (async () => {
      setRepairState({
        running: true,
        repairedCount: 0,
        unrecoverableCount: 0,
        totalCount: itemsToRepair.length,
        showBanner: true
      });

      console.log(`[Phase 2 Repair] 🔍 Found ${itemsToRepair.length} legacy images with idb:// in project ${projId}`);

      let repairedCount = 0;
      let unrecoverableCount = 0;
      const repairedMediaMap = {}; // mediaId -> { cloudUrl, thumb }

      // معالجة بالدفعات (Batching بمعدل صورتين في المرة الواحدة لحماية أداء المتصفح والشبكة)
      const batchSize = 2;
      for (let i = 0; i < itemsToRepair.length; i += batchSize) {
        if (!active) break;
        const batch = itemsToRepair.slice(i, i + batchSize);

        await Promise.all(batch.map(async (item) => {
          try {
            const blob = await getMediaBlob(item.mediaId);
            if (blob) {
              const compId = project.companyId || (typeof localStorage !== 'undefined' ? (localStorage.getItem('platform-active-tenant-id') || localStorage.getItem('tashteeb_active_company_id')) : '') || 'company';
              let cloudUrl = null;
              try {
                cloudUrl = await uploadMediaToFirebaseStorage(
                  blob,
                  `companies/${compId}/projects/${projId}`,
                  fileName,
                  '',
                  item.mediaId,
                  compId
                );
              } catch (storageErr) {
                console.warn('[Phase 2 Repair] Storage upload notice:', storageErr);
              }

              // توليد المصغرة الخفيفة الدائمة فوراً من الـ blob
              const thumb = await createMicroThumbnail(blob, false);

              // إذا توفر رابط سحابي HTTPS نعتمد عليه، وإلا نعتمد المصغرة كبديل دائم لضمان ظهور الصورة عبر جميع الأجهزة وبوابة العميل بنسبة 100%
              const targetUrl = cloudUrl || thumb;

              if (targetUrl) {
                repairedMediaMap[item.mediaId] = {
                  cloudUrl: targetUrl,
                  thumb: thumb || targetUrl
                };
                repairedCount++;
                console.log(`[Phase 2 Repair] ✅ Successfully rescued photo: ${item.mediaId} via ${cloudUrl ? 'Cloud HTTPS' : 'Base64 Micro-Thumbnail'}!`);
              } else {
                unrecoverableCount++;
              }
            } else {
              unrecoverableCount++;
              console.warn(`[Phase 2 Repair] ⚠️ Media blob not found in IndexedDB on this machine for mediaId: ${item.mediaId}. Photo needs manual re-upload or opening from the originating machine.`);
            }
          } catch (err) {
            unrecoverableCount++;
            console.error(`[Phase 2 Repair] Error repairing ${item.mediaId}:`, err);
          }
        }));

        if (active) {
          setRepairState(prev => ({ ...prev, repairedCount, unrecoverableCount }));
        }
      }

      if (!active) return;

      const hasRepairs = Object.keys(repairedMediaMap).length > 0;

      if (hasRepairs) {
        // تحديث سجلات اليوميات بروابط السحابة الدائمة
        const updatedLogs = dailyLogs.map(l => {
          let logModified = false;
          const newPhotos = (l.photos || []).map(p => {
            const mId = typeof p === 'object' ? (p.id || (p.rawSrc ? p.rawSrc.replace('idb://', '') : p.src?.replace('idb://', ''))) : p?.replace('idb://', '');
            if (mId && repairedMediaMap[mId]) {
              logModified = true;
              const rep = repairedMediaMap[mId];
              return typeof p === 'object'
                ? { ...p, src: rep.cloudUrl, rawSrc: rep.cloudUrl, thumbnail: rep.thumb || p.thumbnail }
                : { id: mId, src: rep.cloudUrl, rawSrc: rep.cloudUrl, thumbnail: rep.thumb, type: 'image' };
            }
            return p;
          });

          const newMedia = (l.media || []).map(m => {
            const mId = m.id || (m.rawSrc ? m.rawSrc.replace('idb://', '') : m.src?.replace('idb://', ''));
            if (mId && repairedMediaMap[mId]) {
              logModified = true;
              const rep = repairedMediaMap[mId];
              return { ...m, src: rep.cloudUrl, rawSrc: rep.cloudUrl, thumbnail: rep.thumb || m.thumbnail };
            }
            return m;
          });

          return logModified ? { ...l, photos: newPhotos, media: newMedia } : l;
        });

        // تحديث project.files أيضاً إن كانت الصور مضافة إليها
        let updatedFiles = project.files;
        if (Array.isArray(project.files) && project.files.length > 0) {
          updatedFiles = project.files.map(f => {
            const mId = f.id || (f.rawSrc ? f.rawSrc.replace('idb://', '') : f.src?.replace('idb://', ''));
            if (mId && repairedMediaMap[mId]) {
              const rep = repairedMediaMap[mId];
              return { ...f, src: rep.cloudUrl, rawSrc: rep.cloudUrl, thumbnail: rep.thumb || f.thumbnail };
            }
            return f;
          });
        }

        const patch = { dailyLogs: updatedLogs, updatedAt: new Date().toISOString() };
        if (updatedFiles) patch.files = updatedFiles;

        onUpdate(patch);
      }

      setRepairState({
        running: false,
        repairedCount,
        unrecoverableCount,
        totalCount: itemsToRepair.length,
        showBanner: true
      });
    })();

    return () => { active = false; };
  }, [project?.id]);

  async function handleMediaUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        alert('حجم الصورة كبير (أقصى حد 25 ميجابايت)');
        continue;
      }
      try {
        const mediaId = 'ph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        
        // 1. رابط معاينة فوري وعرضه على الشاشة
        const instantUrl = URL.createObjectURL(file);
        
        // 2. توليد مصغرة خفيفة وعالية الجودة آمنة لسحابة فايربيس والذاكرة
        const thumb = await createMicroThumbnail(file, false);
        
        // 3. حفظ الملف الثنائي الكامل فوراً في IndexedDB المحلي للجهاز الحالي
        await saveMediaBlob(mediaId, file, { type: file.type, name: file.name });

        const mediaItem = {
          id: mediaId,
          src: thumb || instantUrl,
          rawSrc: thumb || `idb://${mediaId}`,
          thumbnail: thumb || '',
          type: 'image',
          name: file.name,
          isUploading: false
        };

        setMediaList(prev => [...prev, mediaItem]);

        const compId = project.companyId || (typeof localStorage !== 'undefined' ? (localStorage.getItem('platform-active-tenant-id') || localStorage.getItem('tashteeb_active_company_id')) : '') || 'company';
        // 4. رفع فوري في الخلفية دون تعطيل الواجهة
        uploadMediaToFirebaseStorage(
          file,
          `companies/${compId}/projects/${project.id}`,
          file.name,
          thumb,
          mediaId,
          compId
        ).then(cloudUrl => {
          if (cloudUrl) {
            setMediaList(prev => prev.map(m => m.id === mediaId ? {
              ...m,
              src: cloudUrl,
              rawSrc: cloudUrl
            } : m));
          }
          // إذا كان المستخدم قد حفظ اليومية بالفعل أثناء الرفع، نحدث اليومية في المشروع مباشرة
          if (cloudUrl) {
            const currentLogs = project?.dailyLogs || [];
            const hasLogWithThisMedia = currentLogs.some(l =>
              (Array.isArray(l.photos) && l.photos.some(p => p.id === mediaId)) ||
              (Array.isArray(l.media) && l.media.some(m => m.id === mediaId))
            );
            if (hasLogWithThisMedia) {
              const updated = currentLogs.map(l => ({
                ...l,
                photos: (l.photos || []).map(p => p.id === mediaId ? { ...p, src: cloudUrl, rawSrc: cloudUrl } : p),
                media: (l.media || []).map(m => m.id === mediaId ? { ...m, src: cloudUrl, rawSrc: cloudUrl } : m),
              }));
              onUpdate({ dailyLogs: updated });
            }
          }
        }).catch(() => {
          clearTimeout(failsafeTimer);
          const fallbackSrc = thumb || mediaItem.thumbnail;
          setMediaList(prev => prev.map(m => m.id === mediaId ? {
            ...m,
            src: fallbackSrc,
            rawSrc: fallbackSrc,
            thumbnail: thumb || m.thumbnail,
            isUploading: false
          } : m));
        });
      } catch (err) {
        console.error("Error reading file:", err);
      }
    }
    e.target.value = '';

  }

  function addLog(e) {
    e.preventDefault();
    if (!form.work.trim()) return;
    const now = new Date().toISOString();

    const safeMediaToSave = mediaList.map(m => {
      // نختار المصدر الدائم: رابط سحابي HTTPS، أو المصغرة Base64، ولا نعتمد على idb:// كـ src وحيد إلا كملاذ أخير
      const safeThumb = (m.thumbnail && m.thumbnail.startsWith('data:'))
        ? m.thumbnail
        : (m.src && m.src.startsWith('data:') ? m.src : '');

      const persistentSrc = (m.src && (m.src.startsWith('http://') || m.src.startsWith('https://')))
        ? m.src
        : (safeThumb || (m.rawSrc && !m.rawSrc.startsWith('blob:') && !m.rawSrc.startsWith('idb://') ? m.rawSrc : `idb://${m.id}`));

      return {
        id: m.id,
        src: persistentSrc,
        rawSrc: m.rawSrc || persistentSrc,
        thumbnail: safeThumb,
        type: m.type,
        name: m.name || '',
        caption: `يومية ${form.date}: ${form.work.slice(0, 35)}`
      };
    });

    const safePhotos = safeMediaToSave
      .filter(m => m.type === 'image')
      .map(m => ({
        id: m.id,
        src: m.src,
        rawSrc: m.rawSrc,
        thumbnail: m.thumbnail || (m.src.startsWith('data:') ? m.src : ''),
        caption: m.caption || '',
        type: 'image'
      }));

    const logTime = nowTimeISO();
    const newLog = {
      ...form,
      time: logTime,
      id: "d_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      workers: Number(form.workers) || 1,
      photos: safePhotos,
      media: safeMediaToSave,
      timestamp: now,
      createdAt: now,
      updatedAt: now
    };

    const patch = { 
      dailyLogs: [newLog, ...logs],
      updatedAt: now 
    };

    if (safeMediaToSave.length > 0) {
      const existingFiles = project.files || [];
      const newFiles = safeMediaToSave.map((m, idx) => ({
        id: m.id || ((m.type === 'video' ? 'vid_' : 'ph_') + Date.now() + '_' + idx),
        src: m.src,
        rawSrc: m.rawSrc,
        thumbnail: m.thumbnail || '',
        type: m.type,
        caption: m.caption || '',
        date: form.date,
        timestamp: now
      }));
      patch.files = [...newFiles, ...existingFiles];
    }

    onUpdate(patch);
    const currentDefault = projEng || authorOptions[0] || "";
    setForm({ date: todayISO(), author: currentDefault, work: "", issues: "", workers: 5 });
    setMediaList([]);
  }

  function removeLog(id) {
    const now = new Date().toISOString();
    onUpdate({
      dailyLogs: logs.filter((l) => l && l.id !== id),
      updatedAt: now
    });
    setConfirmId(null);
  }

  function getLogMedia(l) {
    if (!l) return [];
    const items = [];
    const defaultCaption = l.work ? `يومية ${fmtDate(l.date)}: ${String(l.work).slice(0, 45)}` : `يومية ${fmtDate(l.date)}`;
    if (Array.isArray(l.media)) {
      l.media.forEach(m => {
        if (typeof m === 'string') {
          const isVid = m.startsWith('data:video') || m.includes('.mp4') || m.includes('.webm');
          items.push({ src: m, type: isVid ? 'video' : 'image', caption: defaultCaption, date: fmtDate(l.date) });
        } else if (m && (m.src || m.thumbnail || m.id)) {
          const rawSrc = m.src;
          const bestSrc = (rawSrc && !rawSrc.startsWith('idb://'))
            ? rawSrc
            : (m.thumbnail && (m.thumbnail.startsWith('data:') || m.thumbnail.startsWith('http')))
              ? m.thumbnail
              : rawSrc;
          items.push({
            ...m,
            src: bestSrc,
            rawSrc: m.rawSrc || (rawSrc?.startsWith('idb://') ? rawSrc : null),
            thumbnail: m.thumbnail || '',
            caption: m.caption || defaultCaption,
            date: m.date || fmtDate(l.date)
          });
        }
      });
    }
    if (Array.isArray(l.photos)) {
      l.photos.forEach(p => {
        const rawSrc = typeof p === 'string' ? p : (p?.src || p?.thumbnail);
        const id = typeof p === 'object' ? p?.id : null;
        if ((rawSrc || id) && !items.some(it => (id && it.id === id) || (rawSrc && it.src === rawSrc))) {
          const isVid = (typeof rawSrc === 'string' && (rawSrc.startsWith('data:video') || rawSrc.includes('.mp4') || rawSrc.includes('.webm'))) || p?.type === 'video';
          const thumbnail = typeof p === 'object' ? p?.thumbnail : null;
          const bestSrc = (rawSrc && !rawSrc.startsWith('idb://'))
            ? rawSrc
            : (thumbnail && (thumbnail.startsWith('data:') || thumbnail.startsWith('http')))
              ? thumbnail
              : rawSrc;

          items.push(typeof p === 'object' 
            ? { ...p, src: bestSrc, rawSrc: p.rawSrc || (rawSrc?.startsWith('idb://') ? rawSrc : null), thumbnail: thumbnail || '', caption: p.caption || defaultCaption, date: p.date || fmtDate(l.date) }
            : { src: bestSrc, thumbnail: thumbnail || '', type: isVid ? 'video' : 'image', caption: defaultCaption, date: fmtDate(l.date) }
          );
        }
      });
    }
    if (l.video && !items.some(it => it.src === l.video)) {
      items.push({ src: l.video, type: 'video', caption: defaultCaption, date: fmtDate(l.date) });
    }
    return items;
  }

  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => {
      const dateA = a?.date ? String(a.date) : '';
      const dateB = b?.date ? String(b.date) : '';
      return dateA < dateB ? 1 : -1;
    });
  }, [logs]);

  // Extract available months from logs for fast indexing & jumping
  const availableMonths = useMemo(() => {
    const monthCounts = {};
    logs.forEach(l => {
      if (l && l.date) {
        const dStr = String(l.date).trim();
        const match = dStr.match(/^(\d{4})[-/](\d{1,2})/);
        if (match) {
          const ym = `${match[1]}-${match[2].padStart(2, '0')}`;
          monthCounts[ym] = (monthCounts[ym] || 0) + 1;
        }
      }
    });
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return Object.entries(monthCounts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, count]) => {
        const parts = ym.split('-');
        const y = parts[0];
        const m = parts[1] || '01';
        const mName = monthNames[parseInt(m, 10) - 1] || m;
        return { ym, label: `${mName} ${y}`, count };
      });
  }, [logs]);

  // Filter logs by period (today, week, month, custom date), search, and issues
  const today = todayISO();
  const currentYM = today.slice(0, 7);

  const filteredLogs = useMemo(() => {
    let res = sorted;

    // 1. Period filter (اليوم / أسبوع / شهر / تاريخ محدد / الكل)
    if (periodFilter === 'today') {
      res = res.filter(l => l && l.date && String(l.date).startsWith(today));
    } else if (periodFilter === 'week') {
      const nowMs = new Date().getTime();
      const sevenDaysMs = 7 * 86400000;
      res = res.filter(l => {
        if (!l || !l.date) return false;
        const d = new Date(l.date).getTime();
        return !isNaN(d) && (nowMs - d) <= sevenDaysMs && (nowMs - d) >= -86400000;
      });
    } else if (periodFilter === 'month') {
      const targetMonth = selectedMonth === 'all' ? currentYM : selectedMonth;
      res = res.filter(l => {
        if (!l || !l.date) return false;
        const dStr = String(l.date).replace(/\//g, '-');
        return dStr.startsWith(targetMonth);
      });
    } else if (periodFilter === 'custom' && customDate) {
      res = res.filter(l => l && l.date && String(l.date).startsWith(customDate));
    }

    // 2. Issues only
    if (filterOnlyIssues) {
      res = res.filter(l => l && l.issues && l.issues !== "لا يوجد");
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter(l => {
        if (!l) return false;
        const workText = String(l.work || l.text || '').toLowerCase();
        const authorText = String(l.author || '').toLowerCase();
        const dateText = String(l.date || '').toLowerCase();
        const issuesText = String(l.issues || '').toLowerCase();
        return workText.includes(q) || authorText.includes(q) || dateText.includes(q) || issuesText.includes(q);
      });
    }

    return res;
  }, [sorted, periodFilter, customDate, selectedMonth, filterOnlyIssues, searchQuery, today, currentYM]);

  const issuesTotalCount = useMemo(() => {
    return logs.filter(l => l && l.issues && l.issues !== "لا يوجد").length;
  }, [logs]);

  return (
    <div className="diary-container">
      {/* Lightbox / Video Modal */}
      {previewModal && (
        <MediaLightbox
          item={previewModal}
          onClose={() => setPreviewModal(null)}
        />
      )}

      {/* ─── Phase 2: شريط حالة فحص وإصلاح الصور القديمة ومزامنتها سحابياً ─── */}
      {repairState.showBanner && (
        <div
          className="tab-fade"
          style={{
            background: repairState.running 
              ? 'rgba(56, 189, 248, 0.12)' 
              : repairState.repairedCount > 0 
                ? 'rgba(16, 185, 129, 0.12)' 
                : 'rgba(245, 158, 11, 0.12)',
            border: `1.5px solid ${repairState.running ? 'rgba(56, 189, 248, 0.35)' : repairState.repairedCount > 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            borderRadius: 12,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {repairState.running ? (
              <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite', color: '#0284C7' }} />
            ) : repairState.repairedCount > 0 ? (
              <CheckCircle2 size={18} color="#10B981" />
            ) : (
              <AlertTriangle size={18} color="#F59E0B" />
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
              {repairState.running ? (
                `جاري فحص وإصلاح الصور القديمة ومزامنتها سحابياً لتعمل عبر جميع الأجهزة وبوابة العميل... (${repairState.repairedCount}/${repairState.totalCount}) ⏳`
              ) : repairState.repairedCount > 0 ? (
                `تم إنقاذ ومزامنة ${repairState.repairedCount} صورة قديمة تلقائياً إلى السحابة بنجاح! أصبحت متاحة الآن على جميع المتصفحات وبوابة العميل ☁️`
              ) : (
                `تنبيه: توجد ${repairState.unrecoverableCount} صورة قديمة محفوظة على جهاز آخر. لرؤيتها أو مزامنتها سحابياً، يرجى فتح الموقع من نفس الجهاز الذي رُفعت منه أول مرة.`
              )}
            </div>
          </div>

          {!repairState.running && (
            <button
              type="button"
              onClick={() => setRepairState(prev => ({ ...prev, showBanner: false }))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              ✕ إخفاء
            </button>
          )}
        </div>
      )}

      {!hasTodayLog && (
        <div
          className="tab-fade"
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1.5px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <div>
              <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>
                تذكير الأتمتة: لم تسجل يوميات هذا الموقع لليوم ({fmtDate(todayISO())})
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                سجل الأعمال المنجزة والعمالة مع الصور والفيديو لتوثيق الإنجاز ومشاركته مع الإدارة والعميل.
              </div>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.15)', padding: '4px 10px', borderRadius: 8 }}>
            بانتظار التسجيل ⏳
          </span>
        </div>
      )}

      <div className="panel diary-form-panel">
        <h3 className="diary-section-heading"><CalendarDays size={18} /> إضافة يومية موقع</h3>
        <form onSubmit={addLog} className="diary-form-grid">
          <div className="form-field">
            <label>التاريخ</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="form-field">
            <label>مُسجل اليومية</label>
            <select value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}>
              {authorOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-field diary-full-row">
            <label>الأعمال المنفذة اليوم</label>
            <div className="voice-input-wrapper">
              <input 
                className="diary-work-input" 
                required 
                value={form.work} 
                onChange={(e) => setForm({ ...form, work: e.target.value })} 
                placeholder="مثال: تنفيذ محارة حوائط الصالة، توريد سيراميك، تمديد الكهرباء..." 
              />
              <VoiceInput onResult={(text) => setForm({ ...form, work: form.work + (form.work ? " " : "") + text })} />
            </div>
          </div>
          <div className="form-field">
            <label>عدد العمالة / الصنايعية بالموقع</label>
            <input type="number" min="0" value={form.workers} onChange={(e) => setForm({ ...form, workers: e.target.value })} />
          </div>
          <div className="form-field">
            <label>عوائق طارئة (إن وجدت)</label>
            <input value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} placeholder="مثال: تأخر توريد الرمل أو انقطاع الكهرباء" />
          </div>

          {/* 📸🎥 حقل رفع وتصوير الصور والفيديو لليومية */}
          <div className="form-field diary-full-row" style={{ marginTop: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>
              <Camera size={16} color="#1877F2" />
              <span>إرفاق صور وفيديوهات لتوثيق اليومية:</span>
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                borderRadius: 10, border: '1.5px dashed #10B981', background: 'rgba(16,185,129,0.08)',
                color: '#059669', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                transition: 'all 0.15s ease'
              }}>
                <Camera size={18} />
                <span>التقاط / رفع صور للموقع 📸</span>
                <input type="file" accept="image/*" capture="environment" multiple onChange={handleMediaUpload} style={{ display: 'none' }} />
              </label>

              {mediaList.length > 0 && (
                <span style={{ fontSize: 12.5, color: '#10B981', fontWeight: 700 }}>
                  ({mediaList.length} صور جاهزة للحفظ)
                </span>
              )}
            </div>

            {/* معاينة المصغرات قبل الحفظ */}
            {mediaList.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                {mediaList.map((m, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 85, height: 85, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--border)', background: '#0F172A', cursor: 'pointer' }}>
                    <img src={m.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => setPreviewModal(m)} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setMediaList(prev => prev.filter((_, i) => i !== idx)); }}
                      style={{
                        position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="diary-submit-row">
            <button 
              className="btn btn-primary diary-submit-btn" 
              type="submit"
            >
              <Plus size={16} /> تسجيل اليومية
            </button>
          </div>
        </form>
      </div>

      <div className="panel diary-history-panel">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14
        }}>
          <h3 className="diary-section-heading" style={{ margin: 0 }}>
            <CalendarDays size={18} /> سجل اليوميات والتوثيق الميداني ({filteredLogs.length}{periodFilter !== 'all' ? ` من ${logs.length}` : ''})
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* قائمة الاختيار المدمجة والصغيرة للفترات */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  fontFamily: 'Cairo',
                  cursor: 'pointer'
                }}
              >
                <option value="today">📅 اليوم</option>
                <option value="week">🗓️ هذا الأسبوع</option>
                <option value="month">📆 هذا الشهر</option>
                <option value="custom">🎯 تاريخ محدد</option>
                <option value="all">📋 الكل ({logs.length})</option>
              </select>
            </div>

            {/* تحديد تاريخ مخصص إذا اختار تاريخ محدد */}
            {periodFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1.5px solid var(--teal)',
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'Cairo'
                }}
              />
            )}

            {/* تحديد شهر مخصص إذا اختار شهر */}
            {periodFilter === 'month' && availableMonths.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1.5px solid var(--teal)',
                  background: 'var(--card)',
                  color: 'var(--ink)',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'Cairo',
                  cursor: 'pointer'
                }}
              >
                <option value="all">الشهر الحالي ({currentYM})</option>
                {availableMonths.map(m => (
                  <option key={m.ym} value={m.ym}>{m.label} ({m.count})</option>
                ))}
              </select>
            )}

            {/* فلتر العوائق فقط */}
            <button
              type="button"
              onClick={() => setFilterOnlyIssues(prev => !prev)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `1px solid ${filterOnlyIssues ? '#F59E0B' : 'var(--border)'}`,
                background: filterOnlyIssues ? 'rgba(245, 158, 11, 0.15)' : 'var(--card)',
                color: filterOnlyIssues ? '#D97706' : 'var(--muted)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <AlertTriangle size={13} color={filterOnlyIssues ? '#D97706' : 'var(--muted)'} />
              <span>عوائق فقط ({issuesTotalCount})</span>
            </button>
          </div>
        </div>

        {/* البحث اللحظي */}
        <div style={{ position: 'relative', width: '100%', marginBottom: 16 }}>
          <Search size={16} color="var(--muted)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="ابحث في الأعمال، المسجل، التاريخ، أو العوائق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 36px 9px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--ink)',
              fontSize: 13,
              fontFamily: 'Cairo'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {filteredLogs.length === 0 ? (
          <div className="diary-empty-state" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--muted)', background: 'var(--card)', borderRadius: 12, border: '1px dashed var(--border)' }}>
            <CalendarDays size={36} color="var(--muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {periodFilter === 'today'
                ? `لا توجد يومية مسجلة لليوم (${fmtDate(today)})`
                : periodFilter === 'week'
                ? 'لا توجد يوميات مسجلة خلال هذا الأسبوع'
                : periodFilter === 'month'
                ? 'لا توجد يوميات مسجلة لهذا الشهر'
                : periodFilter === 'custom'
                ? `لا توجد يوميات مسجلة للتاريخ المحدد (${fmtDate(customDate)})`
                : 'لا توجد نتائج مطابقة لبحثك أو الفلتر المحدد.'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              {periodFilter === 'today' && !hasTodayLog && 'يمكنك تسجيل إنجاز اليوم من النموذج بالأعلى 👆، أو عرض فترات أخرى:'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {periodFilter !== 'all' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setPeriodFilter('all')}
                  style={{ border: '1px solid var(--border)', fontSize: 12 }}
                >
                  📋 عرض كل اليوميات ({logs.length})
                </button>
              )}
              {periodFilter !== 'week' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setPeriodFilter('week')}
                  style={{ border: '1px solid var(--border)', fontSize: 12 }}
                >
                  🗓️ هذا الأسبوع
                </button>
              )}
              {periodFilter !== 'month' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setPeriodFilter('month')}
                  style={{ border: '1px solid var(--border)', fontSize: 12 }}
                >
                  📆 هذا الشهر
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="diary-logs-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredLogs.map((l, idx) => {
              const logMedia = getLogMedia(l);
              const logId = l?.id || `log_${idx}`;
              const authorName = typeof l?.author === 'object' ? (l.author?.name || '—') : (l?.author || '—');
              return (
                <div
                  key={logId}
                  className="diary-log-card"
                  style={{
                    padding: '13px 15px',
                    borderRadius: 12,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'box-shadow 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
                        📅 {fmtDate(l?.date)}
                      </span>
                      {(l?.time || l?.timestamp) && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.1)', padding: '2px 7px', borderRadius: 6 }}>
                          ⏰ {fmtTime(l.time, l.timestamp)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                        👷 {l?.workers || l?.laborCount || 1} عمال
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                        {authorName}
                      </span>
                      {confirmId === logId ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 6 }}>
                          <button className="btn btn-danger btn-xs" onClick={() => removeLog(logId)} style={{ padding: '2px 8px', fontSize: 11 }}>تأكيد</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setConfirmId(null)} style={{ padding: '2px 6px', fontSize: 11 }}>إلغاء</button>
                        </div>
                      ) : (
                        <span className="icon-btn diary-delete-btn" title="حذف اليومية" onClick={() => setConfirmId(logId)} style={{ width: 26, height: 26, padding: 0 }}>
                          <Trash2 size={13} />
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6 }}>
                    {l?.work || l?.text || '—'}
                  </div>
                  
                  {l?.issues && l.issues !== "لا يوجد" && (
                    <div style={{ fontSize: 11.5, color: '#D97706', background: 'rgba(245,158,11,0.08)', padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={13} color="#D97706" />
                      <span>{l.issues}</span>
                    </div>
                  )}

                  {/* 📸🎥 مكان عرض الصور والفيديوهات المسجلة لليومية بنفس الأناقة والخفة */}
                  {logMedia.length > 0 && (
                    <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Camera size={13} color="#10B981" />
                        <span>الصور والفيديوهات المسجلة ({logMedia.length}):</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {logMedia.map((item, mIdx) => (
                          <MediaThumbnail
                            key={mIdx}
                            item={item}
                            onClick={setPreviewModal}
                            style={{
                              width: 75,
                              height: 75,
                              flexShrink: 0,
                              borderRadius: 8,
                              border: '1.5px solid var(--border)',
                              cursor: 'pointer'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewPanel({ project, onUpdate }) {
  let cum = 0;
  const stages = project.stages || STAGES;

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", alignItems: "start" }}>
      <div className="panel">
        <h3 style={{ margin: "0 0 16px 0" }}>نسبة الإنجاز ومراحل العمل</h3>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            <span>قم بسحب الشريط لتحديث نسبة إنجاز الموقع الكلية</span>
            <span className="font-mono" style={{ color: "var(--teal)", fontSize: 18 }}>{project.progress}%</span>
          </label>
          <input 
            type="range" 
            min="0" max="100" 
            value={project.progress} 
            onChange={(e) => onUpdate({ progress: Number(e.target.value) })}
            style={{ width: "100%", accentColor: "var(--teal)", height: 8 }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 24 }}>
          {stages.map((s) => {
            const start = cum; cum += s.weight;
            const done = project.progress >= cum;
            const partial = !done && project.progress > start;
            const fillPct = done ? 100 : partial ? Math.round(((project.progress - start) / s.weight) * 100) : 0;
            const color = done ? "var(--teal)" : partial ? "var(--amber)" : "var(--border)";
            
            return (
              <div className="stage-row" key={s.key}>
                <span className="stage-dot" style={{ background: color }} />
                <span style={{ width: 220, flexShrink: 0, fontWeight: done || partial ? 600 : 400, color: done || partial ? "var(--ink)" : "var(--muted)" }}>{s.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: fillPct + "%", background: color }} />
                </div>
                <span className="font-mono" style={{ width: 34, textAlign: "left", fontSize: 12, color: done ? "var(--teal)" : "var(--muted)", fontWeight: 600 }}>{fillPct}%</span>
              </div>
            );
          })}
        </div>
        
        <div style={{ 
          display: "flex", justifyContent: "space-between", marginTop: 32, 
          fontSize: 14, color: "var(--muted)", borderTop: "1px dashed var(--border)", paddingTop: 16 
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={16} /> استلام الموقع: <b style={{ color: "var(--ink)" }}>{fmtDate(project.startDate)}</b>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            التسليم للعميل: <b style={{ color: "var(--ink)" }}>{fmtDate(project.dueDate)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── خطة العمل: مهام بكرة ومهام الأسبوع ─── */
function WorkPlanPanel({ project, onUpdate }) {
  const plan = project.workPlan || { tomorrow: [], thisWeek: [] };
  const [tmrInput, setTmrInput] = useState('');
  const [weekInput, setWeekInput] = useState('');

  function addItem(list, text, setInput) {
    if (!text.trim()) return;
    const updated = { ...plan, [list]: [...(plan[list] || []), { id: list[0] + Date.now(), text: text.trim(), done: false }] };
    onUpdate({ workPlan: updated });
    setInput('');
  }
  function toggleItem(list, id) {
    const updated = { ...plan, [list]: (plan[list] || []).map(i => i.id === id ? { ...i, done: !i.done } : i) };
    onUpdate({ workPlan: updated });
  }
  function removeItem(list, id) {
    const updated = { ...plan, [list]: (plan[list] || []).filter(i => i.id !== id) };
    onUpdate({ workPlan: updated });
  }

  const renderCol = (listKey, label, color, emoji, val, setVal) => {
    const items = plan[listKey] || [];
    const doneCount = items.filter(i => i.done).length;
    return (
      <div className="panel" key={listKey}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color }}>
          <Target size={18} /> {emoji} {label}
          <span style={{ marginRight: 'auto', fontSize: 12, background: color + '18', color, padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>
            {doneCount}/{items.length} منجز
          </span>
        </h3>

        <form onSubmit={e => { e.preventDefault(); addItem(listKey, val, setVal); }}
          style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={val} onChange={e => setVal(e.target.value)}
            placeholder="أضف مهمة..."
            style={{
              flex: 1, padding: '10px 14px',
              border: '1.5px solid var(--border)', borderRadius: 10,
              background: 'transparent', color: 'var(--ink)',
              fontFamily: "'Cairo'", fontSize: 14
            }}
          />
          <button type="submit" style={{
            padding: '10px 16px', background: color,
            color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer'
          }}><Plus size={16} /></button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0', fontSize: 13 }}>
              لا توجد مهام — أضف أول مهمة
            </div>
          )}
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: item.done ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.02)',
              border: '1px solid ' + (item.done ? 'rgba(16,185,129,0.25)' : 'var(--border)'),
              transition: 'all 0.2s'
            }}>
              <button
                onClick={() => toggleItem(listKey, item.id)}
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                  background: item.done ? '#10B981' : 'transparent',
                  border: '2px solid ' + (item.done ? '#10B981' : '#94A3B8'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {item.done && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>}
              </button>
              <span style={{
                flex: 1, fontSize: 14, color: 'var(--ink)',
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.6 : 1
              }}>{item.text}</span>
              <button
                onClick={() => removeItem(listKey, item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
              ><X size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="workplan-grid">
      {renderCol("tomorrow", "مهام بكرة", "#F59E0B", "⚡", tmrInput, setTmrInput)}
      {renderCol("thisWeek", "مهام الأسبوع", "#3B82F6", "📅", weekInput, setWeekInput)}
    </div>
  );
}
