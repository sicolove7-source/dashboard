import React, { useState, useMemo } from "react";
import {
  Building2, CheckCircle2, Clock, ShieldCheck, FileText, Image as ImageIcon,
  CreditCard, MessageCircle, Phone, Calendar, ArrowRight, Check, AlertTriangle,
  Award, Sparkles, Download, PenTool, Eye, X, ZoomIn, Camera, ClipboardList
} from "lucide-react";
import { getGlobalCurrency, fmtDate, fmtTime } from "../utils/helpers";
import SignaturePad from "../components/SignaturePad";
import MediaThumbnail from "../components/MediaThumbnail";
import MediaLightbox from "../components/MediaLightbox";
import { openWhatsApp, WHATSAPP_TEMPLATES } from "../utils/whatsappTemplates";
import { can, isEngineer, isOwner } from "../utils/permissions";

export default function ClientPortal({
  project,
  companySettings,
  onBack,
  onUpdateProject,
  userRole = 'engineer',
  currentUser = null,
}) {
  // فحص صفة المستخدم: العميل يرى كافة تفاصيل مشروعه بما فيها الحسابات والدفعات والعقد للتوقيع
  const isClientRole = userRole === 'client' || (!currentUser && !userRole);
  const isEngineerUser = !isClientRole && (isEngineer(currentUser || userRole) || userRole === 'engineer' || !can(currentUser || userRole, 'finance_view'));
  const isOwnerUser = !isClientRole && (isOwner(currentUser || userRole) || can(currentUser || userRole, 'finance_view'));
  const [ownerPreviewEngineer, setOwnerPreviewEngineer] = useState(false);

  // وضع العرض المقيد للمهندس (مراحل التنفيذ + صور وتقارير الموقع فقط)
  const isEngineerRestricted = isEngineerUser || ownerPreviewEngineer;

  // التبويبات المسموحة
  const allowedTabs = useMemo(() => {
    const base = [
      { id: "overview", label: "مراحل التنفيذ", icon: CheckCircle2, badge: '🏗️' },
      { id: "diary",    label: "صور وتقارير الموقع", icon: ImageIcon, badge: '📸' },
    ];
    if (!isEngineerRestricted) {
      base.push(
        { id: "finance",  label: "الحسابات والدفعات", icon: CreditCard, badge: '💳' },
        { id: "contract", label: "العقد والتوقيع الإلكتروني", icon: FileText, badge: '📜' }
      );
    }
    return base;
  }, [isEngineerRestricted]);

  const [activeTab, setActiveTab] = useState("overview"); // overview | diary | finance | contract
  const [diaryFilter, setDiaryFilter] = useState("all"); // all | photos | reports
  const [selectedPhoto, setSelectedPhoto] = useState(null); // lightbox image preview

  const [clientSignature, setClientSignature] = useState(project?.clientSignature || null);
  const [isSigned, setIsSigned] = useState(!!project?.clientSignature);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // التأكد من أن التبويب الحالي مسموح به، وإلا العودة لمراحل التنفيذ
  const safeTab = allowedTabs.some(t => t.id === activeTab) ? activeTab : "overview";

  const companyName = companySettings?.companyName || "إدارة التشطيبات";
  const companyLogo = companySettings?.companyLogo || null;
  const primaryColor = companySettings?.primaryColor || "#1B3A4B";

  // دالة ذكية لاختيار أفضل رابط صالح للعرض عبر أي متصفح ومنع الروابط المكسورة أو idb://
  function getBestPortalImageSrc(rawSrc, thumbnail) {
    if (typeof rawSrc === 'string' && (rawSrc.startsWith('https://') || rawSrc.startsWith('http://'))) {
      return rawSrc;
    }
    if (typeof rawSrc === 'string' && rawSrc.startsWith('data:image/')) {
      return rawSrc;
    }
    if (typeof thumbnail === 'string' && (thumbnail.startsWith('data:image/') || thumbnail.startsWith('http'))) {
      return thumbnail;
    }
    if (typeof rawSrc === 'string' && rawSrc.startsWith('blob:')) {
      return rawSrc;
    }
    if (thumbnail && !thumbnail.startsWith('idb://')) {
      return thumbnail;
    }
    return '';
  }

  // تجميع صور الموقع من اليوميات وألبوم الموقع
  const allSitePhotos = useMemo(() => {
    const photos = [];
    // 1. صور ألبوم الموقع المباشرة
    if (project?.sitePhotos && Array.isArray(project.sitePhotos)) {
      project.sitePhotos.forEach(p => {
        const bestSrc = getBestPortalImageSrc(p.src, p.thumbnail);
        photos.push({
          id: p.id || Math.random(),
          src: bestSrc,
          rawSrc: p.rawSrc || p.src,
          thumbnail: p.thumbnail,
          caption: p.caption || "صورة من موقع العمل",
          date: p.date || project.startDate || "",
          source: "ألبوم الموقع"
        });
      });
    }
    // 2. صور مرفقات اليوميات الميدانية
    if (project?.dailyLogs && Array.isArray(project.dailyLogs)) {
      project.dailyLogs.forEach(log => {
        const logPhotosList = [];
        if (log.photos && Array.isArray(log.photos)) {
          logPhotosList.push(...log.photos);
        }
        if (log.media && Array.isArray(log.media)) {
          log.media.forEach(m => {
            if (m && m.type !== 'video' && !logPhotosList.some(p => typeof p === 'object' && p.id && p.id === m.id)) {
              logPhotosList.push(m);
            }
          });
        }

        logPhotosList.forEach((lp, idx) => {
          const rawSrc = typeof lp === 'string' ? lp : lp?.src;
          const thumbnail = typeof lp === 'object' ? lp?.thumbnail : null;
          const bestSrc = getBestPortalImageSrc(rawSrc, thumbnail);

          photos.push({
            id: (typeof lp === 'object' && lp?.id) ? lp.id : `${log.id}_photo_${idx}`,
            src: bestSrc,
            rawSrc: typeof lp === 'object' ? lp?.rawSrc : (rawSrc?.startsWith('idb://') ? rawSrc : null),
            thumbnail: thumbnail,
            caption: (typeof lp === 'object' && lp?.caption) ? lp.caption : `يومية: ${log.date}`,
            date: log.date,
            source: `يومية ${log.author || 'المهندس'}`
          });
        });
      });
    }
    return photos;
  }, [project]);

  // Financial calculations (فقط عند السماح للمدير)
  const totalBudget = project?.budget || 0;
  const clientPayments = project?.clientPayments || [];
  const totalPaid = clientPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, totalBudget - totalPaid);

  function handleSaveSignature(sigData) {
    setClientSignature(sigData);
  }

  function handleConfirmApproval() {
    if (!clientSignature) {
      alert("يرجى التوقيع أولاً في المساحة المخصصة.");
      return;
    }
    const updated = {
      ...project,
      clientSignature,
      clientApprovalDate: new Date().toISOString().slice(0, 10),
    };
    if (onUpdateProject) {
      onUpdateProject(project.id, updated);
    }
    setIsSigned(true);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  function handleContactEngineer() {
    const text = `مرحباً مهندس ${project?.engineer || ""} 👋\nأنا ${project?.client || "العميل"} بخصوص متابعة مشروعي *(${project?.name})*. أود الاستفسار عن تفاصيل مراحل التنفيذ بالموقع.`;
    openWhatsApp(project?.engineerPhone || "01000000000", text);
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "var(--bg-gradient, #f8fafc)",
        color: "var(--ink, #1e293b)",
        fontFamily: "'Cairo', sans-serif",
        paddingBottom: 60,
      }}
    >
      {/* ─── Header Bar ─── */}
      <header
        style={{
          background: "var(--card, rgba(255,255,255,0.95))",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border, #e2e8f0)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {companyLogo ? (
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#FFFFFF",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: 3,
              flexShrink: 0
            }}>
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
            </div>
          ) : (
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#0F172A',
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
            }}>
              <img src="/app-icon.png" alt="Tashteeb Pro" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{companyName}</div>
            <div style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>
              {isEngineerRestricted
                ? "بوابة المتابعة الميدانية (مراحل التنفيذ وصور وتقارير الموقع)"
                : "بوابة العميل التفاعلية الرسمية"}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Owner Toggle to preview engineer view */}
          {isOwnerUser && (
            <button
              onClick={() => setOwnerPreviewEngineer(prev => !prev)}
              className="btn btn-ghost"
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 10,
                border: "1px dashed var(--border)",
                background: ownerPreviewEngineer ? "rgba(37,99,235,0.1)" : "transparent",
                color: ownerPreviewEngineer ? "#2563EB" : "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
              title="معاينة البوابة كما يراها المهندس (مراحل وتقارير وصور فقط بدون أي ماليات أو عقود)"
            >
              {ownerPreviewEngineer ? "👷 معاينة المهندس (مفعّلة)" : "👁️ معاينة كمهندس موقع"}
            </button>
          )}

          {onBack && (
            <button
              onClick={onBack}
              className="btn"
              style={{ padding: "8px 14px", fontSize: 13, gap: 6, background: "rgba(0,0,0,0.05)" }}
            >
              <ArrowRight size={15} /> {isClientRole ? "الرئيسية" : "العودة للإدارة"}
            </button>
          )}

          <button
            onClick={handleContactEngineer}
            className="btn"
            style={{
              padding: "8px 16px",
              fontSize: 13,
              gap: 8,
              background: "#25D366",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
            }}
          >
            <MessageCircle size={16} /> تواصل مع المهندس
          </button>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <div style={{ maxWidth: 1050, margin: "24px auto", padding: "0 16px" }}>
        <div
          className="panel"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            padding: "24px 28px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            borderRadius: 16,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: isEngineerRestricted ? "rgba(37,99,235,0.1)" : `${primaryColor}20`, color: isEngineerRestricted ? "#2563EB" : primaryColor, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
              <Sparkles size={14} />
              {isEngineerRestricted
                ? "متابعة التنفيذ الميداني والتقارير الفنية فقط"
                : "مشروع قيد المتابعة الحية"}
            </div>
            <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 900 }}>{project?.name || "مشروع التشطيب"}</h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "var(--muted)", fontSize: 13 }}>
              <span>👤 العميل: <strong>{project?.client}</strong></span>
              <span>📍 الموقع: <strong>{project?.area}</strong></span>
              <span>🏗️ المهندس المشرف: <strong>{project?.engineer}</strong></span>
            </div>
          </div>

          <div style={{ textAlign: "center", minWidth: 140 }}>
            <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 8px" }}>
              <svg width="90" height="90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(0,0,0,0.08)"
                  strokeWidth="3.5"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={isEngineerRestricted ? "#2563EB" : primaryColor}
                  strokeWidth="3.5"
                  strokeDasharray={`${project?.progress || 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: isEngineerRestricted ? "#2563EB" : primaryColor }}>
                {project?.progress || 0}%
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>نسبة الإنجاز الكلية</div>
          </div>
        </div>

        {/* ─── Navigation Subtabs (Restricted to Stages & Photos/Reports for Engineer) ─── */}
        <div style={{ display: "flex", gap: 8, margin: "24px 0", borderBottom: "1px solid var(--border)", overflowX: "auto", paddingBottom: 6 }}>
          {allowedTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = safeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  background: isActive ? (isEngineerRestricted ? "#2563EB" : primaryColor) : "transparent",
                  color: isActive ? "#fff" : "var(--muted)",
                  boxShadow: isActive ? "0 4px 14px rgba(0,0,0,0.15)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW & STAGES (مراحل التنفيذ) ─── */}
        {safeTab === "overview" && (
          <div className="grid tab-fade" style={{ gap: 20 }}>
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>مراحل ومحطات التنفيذ الميداني</h3>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>متابعة حالة إنجاز بنود وأعمال الموقع خطوة بخطوة</div>
                </div>
                <div style={{ display: "flex", gap: 8, fontSize: 11, fontWeight: 700 }}>
                  <span style={{ padding: "4px 10px", borderRadius: 12, background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                    ✓ مكتملة: {(project?.tasks || []).filter(t => t.status === 'done').length}
                  </span>
                  <span style={{ padding: "4px 10px", borderRadius: 12, background: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                    ⚡ جاري العمل: {(project?.tasks || []).filter(t => t.status === 'in_progress').length}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(!project?.tasks || project.tasks.length === 0) ? (
                  <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                    لا توجد بنود مجدولة حالياً.
                  </div>
                ) : (
                  project.tasks.map((task, i) => {
                    const isDone = task.status === "done";
                    const inProgress = task.status === "in_progress";
                    return (
                      <div
                        key={task.id || i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 18px",
                          borderRadius: 12,
                          background: isDone ? "rgba(16,185,129,0.05)" : inProgress ? "rgba(245,158,11,0.07)" : "rgba(0,0,0,0.01)",
                          border: `1px solid ${isDone ? "rgba(16,185,129,0.2)" : inProgress ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: isDone ? "#10B981" : inProgress ? "#F59E0B" : "var(--border)",
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            {isDone ? "✓" : i + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{task.title}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                              {task.start} ⬅️ {task.end}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isDone ? "rgba(16,185,129,0.15)" : inProgress ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.05)",
                            color: isDone ? "#10B981" : inProgress ? "#D97706" : "var(--muted)",
                          }}
                        >
                          {isDone ? "تم الإنجاز" : inProgress ? "جاري العمل" : "مجدولة"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SITE PHOTOS & REPORTS (صور وتقارير الموقع) ─── */}
        {safeTab === "diary" && (
          <div className="grid tab-fade" style={{ gap: 20 }}>
            {/* Filter Pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                className={`filter-pill ${diaryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDiaryFilter('all')}
              >
                الكل (تقارير وصور)
              </button>
              <button
                className={`filter-pill ${diaryFilter === 'photos' ? 'active' : ''}`}
                onClick={() => setDiaryFilter('photos')}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Camera size={14} />
                <span>ألبوم صور الموقع ({allSitePhotos.length})</span>
              </button>
              <button
                className={`filter-pill ${diaryFilter === 'reports' ? 'active' : ''}`}
                onClick={() => setDiaryFilter('reports')}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <ClipboardList size={14} />
                <span>تقارير ويوميات الموقع ({project?.dailyLogs?.length || 0})</span>
              </button>
            </div>

            {/* Section A: Live Site Photos Gallery */}
            {(diaryFilter === 'all' || diaryFilter === 'photos') && (
              <div className="panel" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Camera size={20} color={isEngineerRestricted ? "#2563EB" : primaryColor} />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>معرض وألبوم صور الموقع الحية</h3>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{allSitePhotos.length} صورة مسجلة</span>
                </div>

                {allSitePhotos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 36, color: "var(--muted)", background: "rgba(0,0,0,0.01)", borderRadius: 12, border: "1px dashed var(--border)" }}>
                    <ImageIcon size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>لم يتم رفع صور للموقع بعد</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                    {allSitePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          cursor: "pointer",
                          position: "relative",
                          transition: "transform 0.15s, box-shadow 0.15s",
                        }}
                      >
                        <div style={{ height: 130, position: "relative", background: "#f1f5f9" }}>
                          <MediaThumbnail
                            item={photo}
                            style={{ width: "100%", height: "100%", borderRadius: 0 }}
                          />
                          <div style={{
                            position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)",
                            opacity: 0, transition: "opacity 0.2s",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                          >
                            <ZoomIn size={22} />
                          </div>
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {photo.caption}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, display: "flex", justifyContent: "space-between" }}>
                            <span>{photo.date}</span>
                            <span>{photo.source}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section B: Daily Site Reports & Logs */}
            {(diaryFilter === 'all' || diaryFilter === 'reports') && (
              <div className="panel" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                  <ClipboardList size={20} color={isEngineerRestricted ? "#2563EB" : primaryColor} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>سجل تقارير ويوميات الموقع الميدانية</h3>
                </div>

                {(!project?.dailyLogs || project.dailyLogs.length === 0) ? (
                  <div style={{ textAlign: "center", padding: 36, color: "var(--muted)", background: "rgba(0,0,0,0.01)", borderRadius: 12, border: "1px dashed var(--border)" }}>
                    <ClipboardList size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>لم يتم إضافة تقارير يومية للموقع بعد</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {project.dailyLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: "18px 20px",
                          borderRadius: 14,
                          background: "rgba(0,0,0,0.015)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: isEngineerRestricted ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.08)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: isEngineerRestricted ? "#2563EB" : "var(--ink)",
                            }}>
                              <Calendar size={16} />
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 800, fontSize: 14 }}>تقرير يوم: {fmtDate(log.date)}</span>
                                {(log.time || log.timestamp) && (
                                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1877F2", background: "rgba(24,119,242,0.08)", padding: "2px 7px", borderRadius: 6 }}>
                                    ⏰ {fmtTime(log.time, log.timestamp)}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>المشرف: {log.author || project?.engineer}</div>
                            </div>
                          </div>

                          {log.workers && (
                            <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "rgba(0,0,0,0.05)", color: "var(--muted)", fontWeight: 700 }}>
                              👷 عمالة الموقع: {log.workers} فني
                            </span>
                          )}
                        </div>

                        {/* Report Details */}
                        <div style={{ fontSize: 13.5, lineHeight: 1.8, color: "var(--ink)", whiteSpace: "pre-line" }}>
                          {log.work}
                        </div>

                        {/* Issues / Snags notes */}
                        {log.issues && log.issues !== "لا يوجد" && (
                          <div style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: "rgba(245,158,11,0.09)", border: "1px solid rgba(245,158,11,0.2)", color: "#D97706", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                            <AlertTriangle size={14} />
                            <span>ملاحظة ميدانية: {log.issues}</span>
                          </div>
                        )}

                        {/* Attached Photos */}
                        {(() => {
                          const logPhotosList = [];
                          if (log.photos && Array.isArray(log.photos)) {
                            logPhotosList.push(...log.photos);
                          }
                          if (log.media && Array.isArray(log.media)) {
                            log.media.forEach(m => {
                              if (m && m.type !== 'video' && !logPhotosList.some(p => typeof p === 'object' && p.id && p.id === m.id)) {
                                logPhotosList.push(m);
                              }
                            });
                          }
                          if (logPhotosList.length === 0) return null;

                          return (
                            <div style={{ marginTop: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>الصور المرفقة بالتقرير:</div>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                {logPhotosList.map((lp, pIdx) => {
                                  const rawSrc = typeof lp === 'string' ? lp : lp?.src;
                                  const thumbnail = typeof lp === 'object' ? lp?.thumbnail : null;
                                  const bestSrc = getBestPortalImageSrc(rawSrc, thumbnail);

                                  const itemObj = typeof lp === 'string' 
                                    ? { src: bestSrc, thumbnail, caption: `يومية ${log.date}`, date: log.date } 
                                    : { ...lp, src: bestSrc, thumbnail, caption: lp.caption || `يومية ${log.date}`, date: log.date };
                                  return (
                                    <div
                                      key={pIdx}
                                      style={{ width: 75, height: 75, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}
                                    >
                                      <MediaThumbnail
                                        item={itemObj}
                                        onClick={setSelectedPhoto}
                                        style={{ width: "100%", height: "100%" }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: FINANCE & PAYMENTS (فقط للمدير / الإدارة) ─── */}
        {!isEngineerRestricted && safeTab === "finance" && (
          <div className="grid tab-fade" style={{ gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div className="kpi-card">
                <div className="label">إجمالي قيمة العقد</div>
                <div className="value">{totalBudget.toLocaleString("ar-EG")} {companySettings?.currency || getGlobalCurrency()}</div>
              </div>
              <div className="kpi-card">
                <div className="label">المسدد حتى الآن</div>
                <div className="value" style={{ color: "#10B981" }}>{totalPaid.toLocaleString("ar-EG")} {companySettings?.currency || getGlobalCurrency()}</div>
              </div>
              <div className="kpi-card">
                <div className="label">المتبقي المطلوب</div>
                <div className="value" style={{ color: "#F59E0B" }}>{remaining.toLocaleString("ar-EG")} {companySettings?.currency || getGlobalCurrency()}</div>
              </div>
            </div>

            <div className="panel">
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800 }}>سجل الدفعات المستلمة</h3>
              {clientPayments.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>
                  لم يتم تسجيل دفعات مسددة بعد.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم الدفعة / المرحلة</th>
                      <th>تاريخ السداد</th>
                      <th>طريقة الدفع</th>
                      <th>المبلغ</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientPayments.map((p, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{p.title || `الدفعة رقم ${idx + 1}`}</td>
                        <td className="font-mono">{p.date || "—"}</td>
                        <td>{p.method || "تحويل بنكي"}</td>
                        <td className="font-mono" style={{ fontWeight: 800, color: "#10B981" }}>
                          {Number(p.amount || 0).toLocaleString("ar-EG")} {companySettings?.currency || getGlobalCurrency()}
                        </td>
                        <td>
                          <span style={{ color: "#10B981", fontWeight: 700 }}>✓ تم التحصيل</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: CONTRACT & E-SIGNATURE (فقط للمدير / الإدارة) ─── */}
        {!isEngineerRestricted && safeTab === "contract" && (
          <div className="grid tab-fade" style={{ gap: 20 }}>
            <div className="panel" style={{ border: `1px solid ${primaryColor}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>اتفاقية اعتماد المقايسة ومواصفات التشطيب</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                    إقرار واعتماد بنود الأعمال والمواصفات المتفق عليها بين الطرفين
                  </p>
                </div>
                {isSigned && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.15)", color: "#10B981", padding: "6px 14px", borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                    <ShieldCheck size={16} /> معتمد وموقّع رسمياً
                  </div>
                )}
              </div>

              <div
                style={{
                  background: "rgba(0,0,0,0.02)",
                  padding: 20,
                  borderRadius: 14,
                  fontSize: 13,
                  lineHeight: 1.9,
                  border: "1px solid var(--border)",
                  marginBottom: 20,
                }}
              >
                <p><strong>الطرف الأول (الشركة المنفذة):</strong> {companyName}</p>
                <p><strong>الطرف الثاني (العميل):</strong> {project?.client}</p>
                <p><strong>محل التعاقد:</strong> {project?.name} - {project?.area}</p>
                <p><strong>القيمة الإجمالية المتفق عليها:</strong> {totalBudget.toLocaleString("ar-EG")} {companySettings?.currency || getGlobalCurrency()} لا غير.</p>
                <p style={{ color: "var(--muted)", marginTop: 8 }}>
                  * يقر الطرف الثاني بموافقته على جدول المراحل والتوصيف الفني وجودة الخامات المنصوص عليها، ويعتبر التوقيع أدناه إلكترونياً بمثابة موافقة نهائية على خطة التنفيذ المعتمدة.
                </p>
              </div>

              {/* Signature Area */}
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                  <PenTool size={15} color={primaryColor} /> توقيع العميل الرقمي (E-Signature)
                </h4>

                {isSigned && clientSignature ? (
                  <div style={{ padding: 16, background: "#fff", borderRadius: 14, border: "2px solid #10B981", display: "inline-block" }}>
                    <img src={clientSignature} alt="توقيع العميل" style={{ height: 70, display: "block" }} />
                    <div style={{ fontSize: 11, color: "#10B981", fontWeight: 700, marginTop: 4 }}>
                      ✓ تم التوقيع بتاريخ: {project?.clientApprovalDate || new Date().toISOString().slice(0, 10)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <SignaturePad onSave={handleSaveSignature} initialSignature={clientSignature} />
                    <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={handleConfirmApproval}
                        className="btn btn-primary"
                        style={{ padding: "10px 24px", fontSize: 14, gap: 8 }}
                      >
                        <CheckCircle2 size={16} /> اعتماد العقد وتثبيت التوقيع
                      </button>
                    </div>
                  </div>
                )}

                {saveSuccess && (
                  <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 10, background: "rgba(16,185,129,0.15)", color: "#10B981", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={16} /> تم اعتماد التوقيع بنجاح وحفظه في ملف المشروع!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Lightbox Modal for Photo Preview ─── */}
      {selectedPhoto && (
        <MediaLightbox
          item={selectedPhoto}
          items={allSitePhotos}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

    </div>
  );
}
