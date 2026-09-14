import React, { useState, useMemo } from "react";
import {
  Users, UserPlus, Phone, MapPin, DollarSign, Calendar, MessageCircle,
  ArrowRight, MoreVertical, Plus, CheckCircle2, XCircle, Clock, Search,
  Filter, Sparkles, Building, Layers, Eye, Trash2, Edit3, Share2, Copy, Check, ExternalLink
} from "lucide-react";
import { openWhatsApp, WHATSAPP_TEMPLATES } from "../utils/whatsappTemplates";
import { getGlobalCurrency } from "../utils/helpers";
import { TYPES, AREAS } from "../utils/constants";

export const CRM_STAGES = [
  { id: "new_lead",    label: "عميل جديد",            color: "#0F172A", bg: "#F1F5F9", icon: Sparkles },
  { id: "inspection",  label: "معاينة ومقاسات",       color: "#334155", bg: "#F1F5F9", icon: Calendar },
  { id: "quotation",   label: "إعداد المقايسة والـ 3D",color: "#334155", bg: "#F1F5F9", icon: Layers },
  { id: "negotiation", label: "مفاوضات وتعديلات",     color: "#475569", bg: "#F8FAFC", icon: Clock },
  { id: "won",         label: "تم التعاقد",          color: "#0F172A", bg: "#F1F5F9", icon: CheckCircle2 },
  { id: "lost",        label: "ملغى / غير مناسب",     color: "#94A3B8", bg: "#F8FAFC", icon: XCircle },
];

export const LEAD_SOURCES = [
  { id: "facebook", label: "إعلانات فيسبوك" },
  { id: "instagram", label: "إنستغرام" },
  { id: "referral", label: "ترشيح من عميل سابق" },
  { id: "website", label: "الموقع الإلكتروني" },
  { id: "direct_call", label: "اتصال مباشر / يافطة" },
];

export default function CrmPipeline({
  leads = [],
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onConvertToProject,
  companySettings,
  userRole,
  activeCompanyId = "comp_alain",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isFormShareOpen, setIsFormShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareChannel, setShareChannel] = useState("all");

  const companyName = companySettings?.companyName || "إدارة التشطيبات";
  const intakeCompanyId = activeCompanyId || "comp_alain";
  const channelParam = shareChannel !== "all" ? `&source=${shareChannel}` : "";
  const publicIntakeUrl = `${window.location.origin}/#request-quote?c=${intakeCompanyId}${channelParam}`;

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    area: "",
    type: TYPES[0] || "شقة سكنية",
    budget: 250000,
    source: "facebook",
    notes: "",
    stage: "new_lead",
    inspectionDate: "",
  });

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !searchQuery ||
        l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone?.includes(searchQuery) ||
        l.area?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSource = filterSource === "all" || l.source === filterSource;
      return matchSearch && matchSource;
    });
  }, [leads, searchQuery, filterSource]);

  // Metrics
  const totalLeads = leads.length;
  const totalPipelineValue = leads
    .filter((l) => l.stage !== "lost")
    .reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  const wonCount = leads.filter((l) => l.stage === "won").length;
  const winRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

  function openAddModal() {
    setEditingLead(null);
    setFormData({
      name: "",
      phone: "",
      area: "",
      type: TYPES[0] || "شقة سكنية",
      budget: 250000,
      source: "facebook",
      notes: "",
      stage: "new_lead",
      inspectionDate: "",
    });
    setIsModalOpen(true);
  }

  function openEditModal(lead) {
    setEditingLead(lead);
    setFormData({ ...lead });
    setIsModalOpen(true);
  }

  function handleSaveLead(e) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("الاسم ورقم الهاتف مطلوبان!");
      return;
    }

    if (editingLead) {
      onUpdateLead(editingLead.id, formData);
    } else {
      const newLead = {
        ...formData,
        id: "lead_" + Date.now(),
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onAddLead(newLead);
    }
    setIsModalOpen(false);
  }

  function handleStageChange(leadId, nextStage) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    onUpdateLead(leadId, { ...lead, stage: nextStage });
  }

  function handleSendWhatsApp(lead, actionType) {
    let msg = "";
    if (actionType === "inspection") {
      msg = WHATSAPP_TEMPLATES.siteInspection(lead.name, companyName, lead.inspectionDate, lead.area);
    } else if (actionType === "quotation") {
      msg = WHATSAPP_TEMPLATES.quotationReady(lead.name, companyName, lead.budget, lead.type);
    } else {
      msg = `مرحباً أستاذ ${lead.name} 🌸\nتحياتنا من فريق *${companyName}*. نتشرف بمتابعة طلب تشطيب عقاركم بمنطقة (${lead.area}). هل ناسبكم موعد للمناقشة؟`;
    }
    openWhatsApp(lead.phone, msg);
  }

  function handleConvert(lead) {
    if (onConvertToProject) {
      onConvertToProject({
        name: `تشطيب ${lead.type} - ${lead.clientName || lead.name}`,
        client: lead.name,
        clientPhone: lead.phone,
        area: lead.area,
        type: lead.type,
        budget: Number(lead.budget) || 300000,
        progress: 5,
        status: "on_track",
        startDate: new Date().toISOString().slice(0, 10),
      });
      // Move lead to won
      handleStageChange(lead.id, "won");
    }
  }

  return (
    <div className="tab-fade" style={{ display: "flex", flexDirection: "column", gap: 24 }} dir="rtl">
      {/* ─── Top Metrics Bar ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div className="kpi-card">
          <div className="label">إجمالي العملاء المحتملين</div>
          <div className="value">{totalLeads} عميل</div>
        </div>
        <div className="kpi-card">
          <div className="label">القيمة المتوقعة للصفقات</div>
          <div className="value">
            {totalPipelineValue.toLocaleString("ar-EG")} {getGlobalCurrency()}
          </div>
        </div>
        <div className="kpi-card">
          <div className="label">عقود تم إغلاقها بنجاح</div>
          <div className="value">{wonCount} عقد</div>
        </div>
        <div className="kpi-card">
          <div className="label">معدل تحويل الصفقات (Win Rate)</div>
          <div className="value">{winRate}%</div>
        </div>
      </div>

      {/* ─── Control Bar ─── */}
      <div
        className="panel"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 280 }}>
          <div className="search-box" style={{ flex: 1 }}>
            <Search size={16} color="var(--muted)" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الهاتف، أو المنطقة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">جميع مصادر العملاء</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setIsFormShareOpen(true)}
            className="btn"
            style={{ gap: 8, fontSize: 13, background: "#F8FAFC", color: "var(--ink)", border: "1px solid #E2E8F0" }}
          >
            <Share2 size={15} color="#64748B" /> رابط استقبال العملاء
          </button>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
            style={{ gap: 8, fontSize: 13 }}
          >
            <UserPlus size={15} /> إضافة عميل محتمل
          </button>
        </div>
      </div>

      {/* ─── KANBAN BOARD ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${CRM_STAGES.length}, minmax(280px, 1fr))`,
          gap: 16,
          overflowX: "auto",
          paddingBottom: 16,
        }}
      >
        {CRM_STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
          const stageValue = stageLeads.reduce((s, l) => s + (Number(l.budget) || 0), 0);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 480,
              }}
            >
              {/* Stage Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 12,
                  borderBottom: `1px solid var(--border)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: stage.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} color={stage.color} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{stage.label}</span>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
                      {stageValue > 0 ? `${(stageValue / 1000).toLocaleString()} ألف ${getGlobalCurrency()}` : "—"}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    background: stage.bg,
                    color: stage.color,
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      background: "var(--card-hover, #ffffff)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "14px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>{lead.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <MapPin size={12} /> {lead.area} • {lead.type}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => openEditModal(lead)}
                          style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
                          title="تعديل"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteLead && onDeleteLead(lead.id)}
                          style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer", padding: 4 }}
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Budget & Date */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#F8FAFC",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #E2E8F0",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                        {Number(lead.budget || 0).toLocaleString("ar-EG")} {getGlobalCurrency()}
                      </span>
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>{lead.createdAt || "اليوم"}</span>
                    </div>

                    {/* Stage Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>المرحلة:</span>
                      <select
                        value={lead.stage}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        style={{
                          flex: 1,
                          fontSize: 12,
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          fontFamily: "'Cairo', sans-serif",
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {CRM_STAGES.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleSendWhatsApp(lead, lead.stage)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #E2E8F0",
                          background: "#F8FAFC",
                          color: "#1E293B",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <MessageCircle size={13} color="#64748B" /> واتساب
                      </button>

                      {lead.stage !== "won" && (
                        <button
                          onClick={() => handleConvert(lead)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #0F172A",
                            background: "#0F172A",
                            color: "#FFFFFF",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title="تحويل مباشر لمشروع نشط في المواقع"
                        >
                          <CheckCircle2 size={13} /> تحويل لمشروع
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)", fontSize: 12, border: "2px dashed var(--border)", borderRadius: 12 }}>
                    لا يوجد عملاء في هذه المرحلة
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── ADD / EDIT MODAL ─── */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: 500,
              background: "var(--card)",
              borderRadius: 20,
              padding: 24,
              animation: "slideUpFade 0.3s ease",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 900 }}>
              {editingLead ? "تعديل بيانات العميل المحتمل" : "إضافة عميل محتمل جديد"}
            </h3>

            <form onSubmit={handleSaveLead} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>اسم العميل *</label>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: "100%" }}
                  placeholder="مثال: أ. طارق سعيد"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>رقم الهاتف / واتساب *</label>
                  <input
                    type="tel"
                    className="filter-input"
                    style={{ width: "100%", direction: "ltr", textAlign: "right" }}
                    placeholder="01012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>الميزانية التقديرية (ج.م)</label>
                  <input
                    type="number"
                    className="filter-input"
                    style={{ width: "100%" }}
                    placeholder="250000"
                    value={formData.budget || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value === "" ? "" : Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>نوع الوحدة</label>
                  <select
                    className="filter-select"
                    style={{ width: "100%" }}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>المنطقة / الموقع</label>
                  <input
                    type="text"
                    className="filter-input"
                    style={{ width: "100%" }}
                    placeholder="اكتب اسم المنطقة أو المدينة بحرية..."
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>مصدر العميل</label>
                  <select
                    className="filter-select"
                    style={{ width: "100%" }}
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>المرحلة الحالية</label>
                  <select
                    className="filter-select"
                    style={{ width: "100%" }}
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  >
                    {CRM_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>ملاحظات العميل والتفضيلات</label>
                <textarea
                  className="filter-input"
                  style={{ width: "100%", height: 70, resize: "none" }}
                  placeholder="مثال: يفضل أسلوب المودرن مع باركيه في غرف النوم وبورسلين بالريسبشن..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editingLead ? "حفظ التعديلات" : "إضافة العميل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LEAD CAPTURE FORM SHARE MODAL ─── */}
      {isFormShareOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            className="panel"
            style={{
              width: "100%",
              maxWidth: 580,
              background: "var(--card)",
              borderRadius: 20,
              padding: 26,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900 }}>
                  🌐 رابط استمارة استقبال العملاء (Lead Capture)
                </h3>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
                  شارك هذا الرابط في حملاتك الإعلانية؛ ليقوم العميل بطلب مقايسة وتصل بياناته فورياً هنا في عمود (عميل جديد)!
                </p>
              </div>
              <button
                onClick={() => setIsFormShareOpen(false)}
                className="btn btn-ghost"
                style={{ padding: 6, borderRadius: "50%" }}
              >
                ✕
              </button>
            </div>

            {/* Campaign Channels Tabs */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                تخصيص الرابط حسب منصة النشر (تتبع المصدر تلقائياً):
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { id: "all", label: "🌐 رابط عام" },
                  { id: "facebook", label: "📘 إعلانات فيسبوك" },
                  { id: "instagram", label: "📸 إنستغرام" },
                  { id: "tiktok", label: "🎵 تيك توك" },
                  { id: "whatsapp", label: "💬 واتساب" },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setShareChannel(ch.id)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: shareChannel === ch.id ? 800 : 600,
                      background: shareChannel === ch.id ? "var(--ink, #0F172A)" : "rgba(0,0,0,0.04)",
                      color: shareChannel === ch.id ? "#FFFFFF" : "var(--muted)",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* URL Input Box */}
            <div
              style={{
                background: "rgba(0,0,0,0.03)",
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <input
                type="text"
                readOnly
                value={publicIntakeUrl}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "monospace",
                  fontSize: 13,
                  direction: "ltr",
                  color: "var(--ink)",
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(publicIntakeUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="btn btn-primary"
                style={{ padding: "7px 16px", fontSize: 12.5, gap: 6, whiteSpace: "nowrap" }}
              >
                {copiedLink ? <><Check size={14} /> تم النسخ</> : <><Copy size={14} /> نسخ الرابط</>}
              </button>
            </div>

            {/* Action Buttons: Preview & WhatsApp Share */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => window.open(publicIntakeUrl, "_blank")}
                className="btn"
                style={{
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  color: "var(--ink)",
                  justifyContent: "center",
                }}
              >
                <ExternalLink size={15} /> معاينة وتجربة النموذج
              </button>

              <button
                type="button"
                onClick={() => {
                  const shareMsg = encodeURIComponent(
                    `مرحباً، يسعدنا في *${companyName}* استقبال طلب معاينة عقاركم وتقديم المقايسة المبدئية مباشرة من خلال الرابط:\n${publicIntakeUrl}`
                  );
                  window.open(`https://wa.me/?text=${shareMsg}`, "_blank");
                }}
                className="btn"
                style={{
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  color: "#059669",
                  justifyContent: "center",
                }}
              >
                <MessageCircle size={15} /> مشاركة إعلان عبر واتساب
              </button>
            </div>

            <div style={{
              background: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.15)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 12,
              color: "#2563EB",
              lineHeight: 1.6,
            }}>
              💡 <strong>تحديث فوري تلقائي:</strong> أي عميل يقوم بتعبئة النموذج من هاتفه، ستظهر بياناته فورياً وتلقائياً في بطاقة عميل جديد في هذا الجدول مع إشعار بالطلب.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
