import React, { useState } from 'react';
import { Save, X, AlertCircle, Phone, DollarSign, Building2, User, Calendar, MapPin } from 'lucide-react';
import { AREAS, TYPES, ENGINEERS } from '../utils/constants';
import { todayISO, getGlobalCurrency } from '../utils/helpers';

export default function ProjectForm({ initial, team, areas, onSave, onCancel }) {
  const engineerList = team?.engineers?.length ? team.engineers : ENGINEERS;
  const initialEngineer = initial?.engineer || engineerList[0] || "";

  const [data, setData] = useState(() => initial ? {
    ...initial,
    budget: initial?.budget || initial?.contractValue || "",
    clientPhone: initial?.clientPhone || initial?.phone || "",
  } : {
    name: "",
    client: "",
    clientPhone: "",
    budget: "",
    area: "", 
    plotNumber: "",
    apartmentNumber: "",
    type: TYPES[0],
    engineer: initialEngineer,
    progress: 0,
    status: "on_track",
    startDate: todayISO(),
    dueDate: todayISO(),
  });

  const [error, setError] = useState(null);

  const engineerOptions = Array.from(new Set([...engineerList, data.engineer].filter(Boolean)));

  function set(field, value) {
    if (error) setError(null);
    setData((d) => ({ ...d, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!data.name.trim()) {
      setError("يرجى إدخال اسم الموقع أو المشروع.");
      return;
    }
    if (!data.client.trim()) {
      setError("يرجى إدخال اسم العميل أو المالك.");
      return;
    }

    const numericBudget = data.budget ? Number(data.budget) : 0;
    const numericProgress = Number(data.progress) || 0;

    onSave({
      ...data,
      name: data.name.trim(),
      client: data.client.trim(),
      clientPhone: data.clientPhone ? data.clientPhone.trim() : "",
      budget: numericBudget,
      contractValue: numericBudget,
      progress: Math.min(100, Math.max(0, numericProgress)),
    });
  }

  const currency = getGlobalCurrency();

  return (
    <div className="tab-fade" style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
      <form className="panel" onSubmit={submit} style={{ width: "100%", maxWidth: 840, borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              {initial ? "تعديل بيانات موقع العمل" : "تسجيل وإضافة موقع عمل جديد"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
              أدخل بيانات المشروع والعميل والميزانية لإنشاء ملف الموقع ومتابعة مراحله
            </p>
          </div>
          <button type="button" onClick={onCancel} className="icon-btn" title="إغلاق" style={{ width: 34, height: 34 }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px", borderRadius: 10,
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#DC2626", fontSize: 13, fontWeight: 700,
            marginBottom: 20
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        <div className="grid" style={{ gap: 28 }}>
          {/* Basic Info */}
          <div>
            <h4 style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Building2 size={16} /> البيانات الأساسية للوحدة
            </h4>
            <div className="form-grid">
              <div className="form-field">
                <label>اسم الموقع (المشروع) <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  required
                  value={data.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="مثال: تشطيب فيلا الياسمين"
                />
              </div>

              <div className="form-field">
                <label>نوع الوحدة</label>
                <select value={data.type} onChange={(e) => set("type", e.target.value)}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label>المنطقة / المدينة</label>
                <input 
                  value={data.area || ""} 
                  onChange={(e) => set("area", e.target.value)} 
                  placeholder="مثال: التجمع الخامس، زايد، المعادي..." 
                />
              </div>

              <div className="form-field">
                <label>رقم القطعة / العمارة</label>
                <input
                  value={data.plotNumber || ''}
                  onChange={(e) => set("plotNumber", e.target.value)}
                  placeholder="مثال: قطعة 125"
                />
              </div>

              <div className="form-field">
                <label>رقم الشقة / الدور</label>
                <input
                  value={data.apartmentNumber || ''}
                  onChange={(e) => set("apartmentNumber", e.target.value)}
                  placeholder="مثال: شقة 4 دور 2"
                />
              </div>
            </div>
          </div>

          {/* Client & Financial Info */}
          <div>
            <h4 style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <User size={16} /> بيانات العميل والتعاقد
            </h4>
            <div className="form-grid">
              <div className="form-field">
                <label>اسم العميل / المالك <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  required
                  value={data.client}
                  onChange={(e) => set("client", e.target.value)}
                  placeholder="مثال: د. حسام عبد العزيز"
                />
              </div>

              <div className="form-field">
                <label>رقم هاتف العميل (للتواصل والواتساب)</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="tel"
                    dir="ltr"
                    value={data.clientPhone || ''}
                    onChange={(e) => set("clientPhone", e.target.value)}
                    placeholder="010XXXXXXXX"
                    style={{ paddingLeft: 34, textAlign: 'left' }}
                  />
                  <Phone size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                </div>
              </div>

              <div className="form-field">
                <label>قيمة التعاقد / الميزانية ({currency})</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={data.budget || ''}
                    onChange={(e) => set("budget", e.target.value)}
                    placeholder="مثال: 350000"
                  />
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
                    {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Team Info */}
          <div>
            <h4 style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              طاقم الإشراف والمسؤولية
            </h4>
            <div className="form-grid">
              <div className="form-field">
                <label>مهندس الموقع المسؤول</label>
                <select value={data.engineer} onChange={(e) => set("engineer", e.target.value)}>
                  {engineerOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label>تقييم حالة الموقع</label>
                <select value={data.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="on_track">على المسار الطبيعي</option>
                  <option value="at_risk">يحتاج متابعة وتدخل</option>
                  <option value="delayed">متأخر عن الجدول</option>
                </select>
              </div>

              <div className="form-field">
                <label>نسبة الإنجاز المبدئية (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={data.progress}
                  onChange={(e) => set("progress", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h4 style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={16} /> الجدول الزمني ومواعيد التسليم
            </h4>
            <div className="form-grid">
              <div className="form-field">
                <label>تاريخ استلام الموقع</label>
                <input type="date" value={data.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div className="form-field">
                <label>تاريخ التسليم للعميل</label>
                <input type="date" value={data.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
  
        <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: "center", padding: "12px 24px", fontSize: 14, fontWeight: 800 }}>
            <Save size={18} /> {initial ? "حفظ التعديلات" : "تسجيل الموقع وحفظ البيانات"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, justifyContent: "center", background: "rgba(0,0,0,0.05)" }}>
            <X size={18} /> إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
