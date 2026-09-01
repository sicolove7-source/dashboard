import React, { useState } from "react";
import {
  Building2, CheckCircle2, Clock, ShieldCheck, FileText, Image as ImageIcon,
  CreditCard, MessageCircle, Phone, Calendar, ArrowRight, Check, AlertTriangle,
  Award, Sparkles, Download, PenTool
} from "lucide-react";
import { getGlobalCurrency } from "../utils/helpers";
import SignaturePad from "../components/SignaturePad";
import { openWhatsApp, WHATSAPP_TEMPLATES } from "../utils/whatsappTemplates";

export default function ClientPortal({ project, companySettings, onBack, onUpdateProject }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview | diary | finance | contract
  const [clientSignature, setClientSignature] = useState(project?.clientSignature || null);
  const [isSigned, setIsSigned] = useState(!!project?.clientSignature);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const companyName = companySettings?.companyName || "إدارة التشطيبات";
  const companyLogo = companySettings?.companyLogo || null;
  const primaryColor = companySettings?.primaryColor || "#6366F1";

  // Financial calculations
  const totalBudget = project?.budget || 0;
  const clientPayments = project?.clientPayments || [];
  const totalPaid = clientPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, totalBudget - totalPaid);
  const paidPercent = totalBudget > 0 ? Math.round((totalPaid / totalBudget) * 100) : 0;

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
    const text = `مرحباً مهندس ${project?.engineer || ""} 👋\nأنا ${project?.client || "العميل"} بخصوص مشروعي *(${project?.name})*. أود الاستفسار عن بعض التفاصيل.`;
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
          background: "var(--card, rgba(255,255,255,0.9))",
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              style={{ width: 40, height: 40, borderRadius: 10, objectFit: "contain", background: "#fff" }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${primaryColor}, #3B82F6)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Building2 size={22} />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{companyName}</div>
            <div style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>بوابة العميل التفاعلية الرسمية</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button
              onClick={onBack}
              className="btn"
              style={{ padding: "8px 14px", fontSize: 13, gap: 6, background: "rgba(0,0,0,0.05)" }}
            >
              <ArrowRight size={15} /> العودة للإدارة
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
      <div style={{ maxWidth: 1000, margin: "24px auto", padding: "0 16px" }}>
        <div
          className="panel"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}15, rgba(59,130,246,0.1))`,
            border: `1px solid ${primaryColor}30`,
            padding: "28px 32px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            borderRadius: 20,
          }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: `${primaryColor}20`, color: primaryColor, fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
              <Sparkles size={14} /> مشروع قيد المتابعة الحية
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
                  stroke={primaryColor}
                  strokeWidth="3.5"
                  strokeDasharray={`${project?.progress || 0}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: primaryColor }}>
                {project?.progress || 0}%
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>نسبة الإنجاز الكلية</div>
          </div>
        </div>

        {/* ─── Navigation Subtabs ─── */}
        <div style={{ display: "flex", gap: 8, margin: "24px 0", borderBottom: "1px solid var(--border)", overflowX: "auto", paddingBottom: 6 }}>
          {[
            { id: "overview", label: "مراحل التنفيذ", icon: CheckCircle2 },
            { id: "diary", label: "صور وتقارير الموقع", icon: ImageIcon },
            { id: "finance", label: "الحسابات والدفعات", icon: CreditCard },
            { id: "contract", label: "العقد والتوقيع الإلكتروني", icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Cairo', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  background: isActive ? primaryColor : "transparent",
                  color: isActive ? "#fff" : "var(--muted)",
                  boxShadow: isActive ? `0 4px 14px ${primaryColor}40` : "none",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW & STAGES ─── */}
        {activeTab === "overview" && (
          <div className="grid tab-fade" style={{ gap: 20 }}>
            <div className="panel">
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800 }}>جدول مراحل ومحطات التشطيب</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(project?.tasks || []).map((task, i) => {
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
                        background: isDone ? "rgba(16,185,129,0.06)" : inProgress ? "rgba(245,158,11,0.08)" : "rgba(0,0,0,0.02)",
                        border: `1px solid ${isDone ? "rgba(16,185,129,0.2)" : inProgress ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
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
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {task.start} ⬅️ {task.end}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "4px 10px",
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
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: SITE DIARY & PHOTOS ─── */}
        {activeTab === "diary" && (
          <div className="grid tab-fade" style={{ gap: 20 }}>
            <div className="panel">
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800 }}>تحديثات ويوميات التنفيذ الميدانية</h3>
              {(!project?.dailyLogs || project.dailyLogs.length === 0) ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  لم يتم إضافة يوميات للموقع بعد.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {project.dailyLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "18px",
                        borderRadius: 14,
                        background: "rgba(0,0,0,0.02)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Calendar size={15} color={primaryColor} />
                          <span style={{ fontWeight: 800, fontSize: 14 }}>{log.date}</span>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>بواسطة: {log.author}</span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
                        {log.work}
                      </div>
                      {log.issues && log.issues !== "لا يوجد" && (
                        <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", color: "#D97706", fontSize: 12 }}>
                          ⚠️ ملاحظة: {log.issues}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: FINANCE & PAYMENTS ─── */}
        {activeTab === "finance" && (
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

        {/* ─── TAB 4: CONTRACT & E-SIGNATURE ─── */}
        {activeTab === "contract" && (
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
                <p><strong>القيمة الإجمالية المتفق عليها:</strong> {totalBudget.toLocaleString("ar-EG")} جنيه مصري لا غير.</p>
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
    </div>
  );
}
