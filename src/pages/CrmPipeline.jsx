import React, { useState, useMemo } from "react";
import {
  Users, UserPlus, Phone, MapPin, DollarSign, Calendar, MessageCircle,
  ArrowRight, MoreVertical, Plus, CheckCircle2, XCircle, Clock, Search,
  Filter, Sparkles, Building, Layers, Eye, Trash2, Edit3, Share2, Copy, Check
} from "lucide-react";
import { openWhatsApp, WHATSAPP_TEMPLATES } from "../utils/whatsappTemplates";
import { getGlobalCurrency } from "../utils/helpers";
import { TYPES, AREAS } from "../utils/constants";

export const CRM_STAGES = [
  { id: "new_lead", label: "عميل جديد", color: "#3B82F6", bg: "rgba(59,130,246,0.1)", icon: Sparkles },
  { id: "inspection", label: "معاينة ومقاسات", color: "#F59E0B", bg: "rgba(245,158,11,0.1)", icon: Calendar },
  { id: "quotation", label: "إعداد المقايسة والـ 3D", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)", icon: Layers },
  { id: "negotiation", label: "مفاوضات وتعديلات", color: "#EC4899", bg: "rgba(236,72,153,0.1)", icon: Clock },
  { id: "won", label: "تم التعاقد 🏆", color: "#10B981", bg: "rgba(16,185,129,0.15)", icon: CheckCircle2 },
  { id: "lost", label: "ملغى / خسرنا الصفقة", color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: XCircle },
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
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isFormShareOpen, setIsFormShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const companyName = companySettings?.companyName || "إدارة التشطيبات";

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    area: AREAS[0] || "الحي الأول",
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
      area: AREAS[0] || "الحي الأول",
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
          <div className="value" style={{ color: "#3B82F6" }}>
            {totalPipelineValue.toLocaleString("ar-EG")} {getGlobalCurrency()}
          </div>
        </div>
        <div className="kpi-card">
          <div className="label">عقود تم إغلاقها بنجاح</div>
          <div className="value" style={{ color: "#10B981" }}>{wonCount} عقد</div>
        </div>
        <div className="kpi-card">
          <div className="label">معدل تحويل الصفقات (Win Rate)</div>
          <div className="value" style={{ color: "#F59E0B" }}>{winRate}%</div>
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
            style={{ gap: 8, fontSize: 13, background: "rgba(99,102,241,0.1)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.3)" }}
          >
            <Share2 size={16} /> رابط استقبال العملاء
          </button>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
            style={{ gap: 8, fontSize: 14 }}
          >
            <UserPlus size={16} /> إضافة عميل محتمل
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
                background: "var(--card, rgba(255,255,255,0.7))",
                backdropFilter: "blur(12px)",
                border: "1px solid var(--border)",
                borderRadius: 16,
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
                  borderBottom: `2px solid ${stage.color}`,
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
                        background: "rgba(0,0,0,0.02)",
                        padding: "6px 10px",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 800, color: "#10B981" }}>
                        💰 {Number(lead.budget || 0).toLocaleString("ar-EG")} {getGlobalCurrency()}
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
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--card)",
                          fontFamily: "'Cairo', sans-serif",
                          fontWeight: 600,
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
                          borderRadius: 8,
                          border: "none",
                          background: "#25D366",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <MessageCircle size={13} /> واتساب
                      </button>

                      {lead.stage !== "won" && (
                        <button
                          onClick={() => handleConvert(lead)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(16,185,129,0.3)",
                            background: "rgba(16,185,129,0.1)",
                            color: "#10B981",
                            fontSize: 11,
                            fontWeight: 700,
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
                  <select
                    className="filter-select"
                    style={{ width: "100%" }}
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
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
              maxWidth: 520,
              background: "var(--card)",
              borderRadius: 20,
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 900 }}>
              🌐 نموذج استقبال طلبات التشطيب (Lead Capture)
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, margin: "0 0 16px" }}>
              شارك هذا الرابط في حملاتك الإعلانية على فيسبوك/إنستغرام أو بموقعك الإلكتروني ليستقبل السيستم بيانات العملاء مباشرة في خانة (عميل جديد)!
            </p>

            <div
              style={{
                background: "rgba(0,0,0,0.03)",
                padding: "12px 16px",
                borderRadius: 12,
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
                value={`${window.location.origin}/#request-quote`}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: "monospace",
                  fontSize: 13,
                  direction: "ltr",
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/#request-quote`);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="btn btn-primary"
                style={{ padding: "6px 14px", fontSize: 12, gap: 6 }}
              >
                {copiedLink ? <><Check size={14} /> تم النسخ</> : <><Copy size={14} /> نسخ الرابط</>}
              </button>
            </div>

            <button
              onClick={() => setIsFormShareOpen(false)}
              className="btn btn-ghost"
              style={{ width: "100%" }}
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
