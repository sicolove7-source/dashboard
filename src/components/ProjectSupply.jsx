import React, { useState } from 'react';
import { Package, Plus, CheckCircle2, Truck, AlertTriangle } from 'lucide-react';
import { fmtDate, todayISO } from '../utils/helpers';
import { MATERIALS_LIST } from '../utils/constants';

export default function ProjectSupply({ project, onUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ 
    item: MATERIALS_LIST[0], 
    qty: '', 
    unit: 'وحدة', 
    dateRequested: todayISO(), 
    status: 'مطلوبة' // مطلوبة, جاري الشراء, تم التوريد
  });

  const materials = project.resources?.materials || [];

  const handleSave = () => {
    if (!formData.item || !formData.qty) return;
    
    const entry = { ...formData, id: "mat-" + Date.now() };
    const updatedMaterials = [entry, ...materials];
    
    onUpdate({ 
      resources: { 
        ...project.resources, 
        materials: updatedMaterials 
      } 
    });
    
    setShowAddForm(false);
    setFormData({ item: MATERIALS_LIST[0], qty: '', unit: 'وحدة', dateRequested: todayISO(), status: 'مطلوبة' });
  };

  const updateStatus = (id, newStatus) => {
    const updatedMaterials = materials.map(m => m.id === id ? { ...m, status: newStatus } : m);
    onUpdate({ 
      resources: { 
        ...project.resources, 
        materials: updatedMaterials 
      } 
    });
  };

  return (
    <div className="panel" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
          <Package size={20} color="var(--teal)" />
          إدارة التوريدات والخامات
        </h3>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}><Plus size={16} /> طلب خامات جديدة</button>
      </div>

      {showAddForm && (
        <div style={{ background: "var(--bg)", padding: 20, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: 2, minWidth: 200, marginBottom: 0 }}>
            <label>الخامة / البند</label>
            <input type="text" list="materials-list" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} placeholder="مثال: أسمنت، سيراميك..." />
            <datalist id="materials-list">
              {MATERIALS_LIST.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 100, marginBottom: 0 }}>
            <label>الكمية</label>
            <input type="number" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} placeholder="0" />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 100, marginBottom: 0 }}>
            <label>الوحدة</label>
            <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
              <option value="طن">طن</option>
              <option value="متر">متر</option>
              <option value="شيكارة">شيكارة</option>
              <option value="لفة">لفة</option>
              <option value="عدد">عدد</option>
              <option value="مقطوعية">مقطوعية</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
            <label>تاريخ الطلب</label>
            <input type="date" value={formData.dateRequested} onChange={e => setFormData({...formData, dateRequested: e.target.value})} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSave}>طلب</button>
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {materials.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
          <Package size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <p>لا توجد طلبات توريد مسجلة حتى الآن.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>تاريخ الطلب</th>
                <th>الخامة المطلوبة</th>
                <th>الكمية</th>
                <th>حالة التوريد</th>
                <th>إجراءات الإدارة</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => (
                <tr key={m.id}>
                  <td>{fmtDate(m.dateRequested)}</td>
                  <td style={{ fontWeight: 700 }}>{m.item || m.name}</td>
                  <td>{m.qty} {m.unit}</td>
                  <td>
                    {m.status === 'تم التوريد' ? (
                      <span className="badge badge-success"><CheckCircle2 size={12} /> تم التوريد للموقع</span>
                    ) : m.status === 'جاري الشراء' ? (
                      <span className="badge badge-warning"><Truck size={12} /> جاري الشراء والتوريد</span>
                    ) : (
                      <span className="badge badge-danger"><AlertTriangle size={12} /> مطلوبة (قيد الانتظار)</span>
                    )}
                  </td>
                  <td>
                    <select 
                      value={m.status} 
                      onChange={(e) => updateStatus(m.id, e.target.value)}
                      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", fontFamily: "Cairo", fontSize: 13 }}
                    >
                      <option value="مطلوبة">إعادة كـ (مطلوبة)</option>
                      <option value="جاري الشراء">تحديث: جاري الشراء</option>
                      <option value="تم التوريد">تأكيد: تم التوريد ✔️</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
