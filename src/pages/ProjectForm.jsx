import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { AREAS, TYPES, ENGINEERS } from '../utils/constants';
import { todayISO } from '../utils/helpers';

export default function ProjectForm({ initial, team, areas, onSave, onCancel }) {
  const engineerList = team?.engineers?.length ? team.engineers : ENGINEERS;
  const initialEngineer = initial?.engineer || engineerList[0] || "";

  const [data, setData] = useState(() => initial ? { ...initial } : {
    name: "", client: "", area: initial?.area || "", 
    plotNumber: "", apartmentNumber: "", type: TYPES[0],
    engineer: initialEngineer,
    progress: 0, status: "on_track",
    startDate: todayISO(), dueDate: todayISO(),
  });

  const engineerOptions = Array.from(new Set([...engineerList, data.engineer].filter(Boolean)));

  function set(field, value) { setData((d) => ({ ...d, [field]: value })); }

  function submit(e) {
    e.preventDefault();
    if (!data.name.trim() || !data.client.trim()) return;
    onSave({ ...data, progress: Number(data.progress) });
  }

  return (
    <div className="tab-fade" style={{ display: "flex", justifyContent: "center" }}>
      <form className="panel" onSubmit={submit} style={{ width: "100%", maxWidth: 800 }}>
        <h3 style={{ marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          {initial ? "تعديل بيانات الموقع" : "تسجيل موقع جديد"}
        </h3>
        
        <div className="grid" style={{ gap: 32 }}>
          {/* Basic Info */}
          <div>
            <h4 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>البيانات الأساسية</h4>
            <div className="form-grid">
              <div className="form-field"><label>اسم الموقع (المشروع)</label><input required value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: تشطيب فيلا الياسمين" /></div>
              <div className="form-field"><label>اسم العميل / المالك</label><input required value={data.client} onChange={(e) => set("client", e.target.value)} placeholder="مثال: م. خالد" /></div>
      
              <div className="form-field"><label>رقم القطعة</label><input value={data.plotNumber || ''} onChange={(e) => set("plotNumber", e.target.value)} placeholder="مثال: 125" /></div>
              <div className="form-field"><label>رقم الشقة</label><input value={data.apartmentNumber || ''} onChange={(e) => set("apartmentNumber", e.target.value)} placeholder="مثال: 12" /></div>
              
              <div className="form-field"><label>نوع الوحدة</label>
                <select value={data.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="form-field"><label>المنطقة / الموقع</label>
                <input 
                  value={data.area || ""} 
                  onChange={(e) => set("area", e.target.value)} 
                  placeholder="اكتب اسم المنطقة أو المدينة بحرية (مثال: التجمع، زايد، دمياط...)" 
                  required
                />
              </div>
            </div>
          </div>

          {/* Team Info */}
          <div>
            <h4 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>طاقم الإشراف</h4>
            <div className="form-grid">
              <div className="form-field"><label>مهندس الموقع المسؤول</label>
                <select value={data.engineer} onChange={(e) => set("engineer", e.target.value)}>
                  {engineerOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h4 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>حالة التنفيذ</h4>
            <div className="form-grid">
              <div className="form-field"><label>تقييم حالة الموقع</label>
                <select value={data.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="on_track">على المسار</option>
                  <option value="at_risk">يحتاج متابعة</option>
                  <option value="delayed">متأخر</option>
                </select>
              </div>
      
              <div className="form-field"><label>نسبة الإنجاز المبدئية (%)</label><input type="number" min="0" max="100" value={data.progress} onChange={(e) => set("progress", e.target.value)} /></div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h4 style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>الجدول الزمني</h4>
            <div className="form-grid">
              <div className="form-field"><label>تاريخ استلام الموقع</label><input type="date" value={data.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
              <div className="form-field"><label>تاريخ التسليم للعميل</label><input type="date" value={data.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
            </div>
          </div>
        </div>
  
        <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}><Save size={18} /> {initial ? "حفظ التعديلات" : "تسجيل الموقع"}</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, justifyContent: "center", background: "rgba(0,0,0,0.05)" }}><X size={18} /> إلغاء</button>
        </div>
      </form>
    </div>
  );
}
