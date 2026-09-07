import React, { useState } from 'react';
import {
  Package, Plus, CheckCircle2, Truck, AlertTriangle, Clock,
  MessageSquare, Trash2, Check, Wrench, Layers, Tag
} from 'lucide-react';
import { fmtDate, todayISO } from '../utils/helpers';
import { MATERIALS_LIST, EQUIPMENT_LIST } from '../utils/constants';
import { openWhatsApp } from '../utils/whatsappTemplates';

export default function ProjectSupply({ project, currentUser, userRole, onUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [supplyType, setSupplyType] = useState('material'); // 'material' | 'equipment'
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const defaultRequester = currentUser?.name || currentUser?.engineerName || project.engineer || 'مهندس الموقع';

  const [formData, setFormData] = useState({
    type: 'material',
    item: MATERIALS_LIST[0] || 'أسمنت',
    qty: '',
    unit: 'شيكارة',
    priority: 'normal', // 'normal' | 'urgent' | 'critical'
    dateRequested: todayISO(),
    requiredByDate: '',
    requester: defaultRequester,
    notes: '',
    status: 'مطلوبة', // مطلوبة | جاري الشراء | تم التوريد
  });

  const materials = project.resources?.materials || [];

  // KPI Calculations
  const totalCount = materials.length;
  const pendingCount = materials.filter(m => m.status === 'مطلوبة').length;
  const inProgressCount = materials.filter(m => m.status === 'جاري الشراء').length;
  const deliveredCount = materials.filter(m => m.status === 'تم التوريد').length;

  const handleSave = (e) => {
    if (e) e.preventDefault();
    if (!formData.item || !formData.qty) return;

    const entry = {
      ...formData,
      id: 'supply-' + Date.now(),
      requester: formData.requester || defaultRequester,
      dateRequested: formData.dateRequested || todayISO(),
    };

    const updatedMaterials = [entry, ...materials];

    onUpdate({
      resources: {
        ...project.resources,
        materials: updatedMaterials,
      },
    });

    setShowAddForm(false);
    setFormData({
      type: supplyType,
      item: supplyType === 'material' ? (MATERIALS_LIST[0] || 'أسمنت') : (EQUIPMENT_LIST[0] || 'سقالات معدنية'),
      qty: '',
      unit: supplyType === 'material' ? 'شيكارة' : 'عدد',
      priority: 'normal',
      dateRequested: todayISO(),
      requiredByDate: '',
      requester: defaultRequester,
      notes: '',
      status: 'مطلوبة',
    });
  };

  const updateStatus = (id, newStatus) => {
    const updatedMaterials = materials.map(m => {
      if (m.id === id) {
        return {
          ...m,
          status: newStatus,
          deliveredAt: newStatus === 'تم التوريد' ? todayISO() : m.deliveredAt,
        };
      }
      return m;
    });

    onUpdate({
      resources: {
        ...project.resources,
        materials: updatedMaterials,
      },
    });
  };

  const removeEntry = (id) => {
    const updatedMaterials = materials.filter(m => m.id !== id);
    onUpdate({
      resources: {
        ...project.resources,
        materials: updatedMaterials,
      },
    });
    setConfirmDeleteId(null);
  };

  // WhatsApp Dispatch Helper
  const shareWhatsApp = (item) => {
    const priorityLabel = item.priority === 'critical' ? '🚨 طارئ جداً (يوقف العمل)' : item.priority === 'urgent' ? '⚠️ عاجل' : 'عادي';
    const text = `📋 *إذن طلب توريد مواد / مهمات للموقع*
🏗️ *الموقع / المشروع:* ${project.name}
📍 *المنطقة:* ${project.area || 'الموقع'}
👷‍♂️ *المهندس الطالب:* ${item.requester || project.engineer || 'مهندس الموقع'}

📦 *البند / الخامة المطلوبة:* ${item.item || item.name}
🔢 *الكمية المطلوبة:* ${item.qty} ${item.unit || 'وحدة'}
⚡ *الأولوية:* ${priorityLabel}
📅 *تاريخ الطلب:* ${fmtDate(item.dateRequested)}
${item.requiredByDate ? `⏳ *مطلوب التوريد قبل:* ${fmtDate(item.requiredByDate)}\n` : ''}${item.notes ? `📝 *مواصفات وملاحظات:* ${item.notes}\n` : ''}
برجاء التوجيه بالتعميد والشراء وإرسال الخامات للموقع.`;

    openWhatsApp('', text);
  };

  return (
    <div className="panel" style={{ padding: '20px 24px', borderRadius: 16 }}>
      {/* ─── Header & KPIs ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', fontSize: 18, fontWeight: 800 }}>
            <Package size={22} color="var(--brand-primary, #6366F1)" />
            إدارة طلبات التوريد والخامات الميدانية
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            يتيح للمهندس بالموقع طلب خامات التشطيب ومعدات العمل ومتابعة وصولها فوراً
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ gap: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700 }}
          onClick={() => setShowAddForm(prev => !prev)}
        >
          <Plus size={16} /> طلب خامات / مهمات للموقع
        </button>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border)', padding: '12px 14px', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>إجمالي البنود</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginTop: 2 }}>{totalCount}</div>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 14px', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>خامات مطلوبة ⏳</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626', marginTop: 2 }}>{pendingCount}</div>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 14px', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>جاري الشراء 🚚</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706', marginTop: 2 }}>{inProgressCount}</div>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 14px', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>تم التوريد للموقع ✅</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#16A34A', marginTop: 2 }}>{deliveredCount}</div>
        </div>
      </div>

      {/* ─── Add Supply Requisition Form ─── */}
      {showAddForm && (
        <form
          onSubmit={handleSave}
          className="tab-fade"
          style={{
            background: 'var(--bg-color)',
            padding: 20,
            borderRadius: 14,
            border: '1px solid var(--border)',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} color="var(--brand-primary, #6366F1)" />
              تسجيل إذن طلب توريد جديد
            </div>

            {/* Type Switcher: Material vs Equipment */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--card)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
              <button
                type="button"
                className={`btn btn-xs ${supplyType === 'material' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setSupplyType('material');
                  setFormData(prev => ({ ...prev, type: 'material', item: MATERIALS_LIST[0] || 'أسمنت', unit: 'شيكارة' }));
                }}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                🧱 مواد وخامات تشطيب
              </button>
              <button
                type="button"
                className={`btn btn-xs ${supplyType === 'equipment' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setSupplyType('equipment');
                  setFormData(prev => ({ ...prev, type: 'equipment', item: EQUIPMENT_LIST[0] || 'سقالات معدنية', unit: 'عدد' }));
                }}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                🚜 معدات وآلات موقع
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {/* Item / Material Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                {supplyType === 'material' ? 'الخامة / المادة المطلوبة *' : 'المعدة / الآلة المطلوبة *'}
              </label>
              <input
                type="text"
                list="supply-items-list"
                className="filter-input"
                style={{ width: '100%', fontWeight: 700 }}
                value={formData.item}
                onChange={e => setFormData({ ...formData, item: e.target.value })}
                placeholder={supplyType === 'material' ? 'مثال: أسمنت، سيراميك، جبس بورد...' : 'مثال: سقالات، ماكينة قص، مولد...'}
                required
              />
              <datalist id="supply-items-list">
                {(supplyType === 'material' ? MATERIALS_LIST : EQUIPMENT_LIST).map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* Quantity */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                الكمية المطلوبة *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                className="filter-input"
                style={{ width: '100%', fontWeight: 700 }}
                value={formData.qty}
                onChange={e => setFormData({ ...formData, qty: e.target.value })}
                placeholder="مثال: 50"
                required
              />
            </div>

            {/* Unit */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                الوحدة *
              </label>
              <select
                className="filter-select"
                style={{ width: '100%', fontWeight: 600 }}
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="شيكارة">شيكارة (كيس)</option>
                <option value="طن">طن</option>
                <option value="متر">متر (طولي/مربع)</option>
                <option value="كرتونة">كرتونة / صندوق</option>
                <option value="لفة">لفة (أسلاك/عزل)</option>
                <option value="جالون">جالون / بستلة دهان</option>
                <option value="عدد">عدد (قطعة)</option>
                <option value="مقطوعية">مقطوعية</option>
              </select>
            </div>

            {/* Priority */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                درجة الأهمية والاستعجال *
              </label>
              <select
                className="filter-select"
                style={{ width: '100%', fontWeight: 700 }}
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="normal">عادي (خلال أيام)</option>
                <option value="urgent">⚠️ عاجل (ضروري لسير العمل)</option>
                <option value="critical">🚨 طارئ جداً (العمل متوقف بالموقع)</option>
              </select>
            </div>

            {/* Requester (Engineer) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                المهندس الطالب *
              </label>
              <input
                type="text"
                className="filter-input"
                style={{ width: '100%' }}
                value={formData.requester}
                onChange={e => setFormData({ ...formData, requester: e.target.value })}
                placeholder="اسم المهندس"
              />
            </div>

            {/* Required By Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
                تاريخ الحاجة للمادة بالموقع
              </label>
              <input
                type="date"
                className="filter-input"
                style={{ width: '100%' }}
                value={formData.requiredByDate}
                onChange={e => setFormData({ ...formData, requiredByDate: e.target.value })}
              />
            </div>
          </div>

          {/* Notes / Specs */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>
              مواصفات خاصة أو ملاحظات للتوريد (الماركة، اللون، مكان التنزيل بالموقع)
            </label>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%' }}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="مثال: مطلوب أسمنت مقاوم للكبريتات - التوريد للدور الثالث - شركة معتمدة"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddForm(false)}>
              إلغاء
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 24px', gap: 6, fontWeight: 700 }}>
              <Check size={16} /> تأكيد وحفظ طلب التوريد
            </button>
          </div>
        </form>
      )}

      {/* ─── Supply Requests List ─── */}
      {materials.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)', background: 'var(--bg-color)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <Package size={48} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 6px', color: 'var(--ink)', fontWeight: 700 }}>لا توجد طلبات توريد مسجلة حتى الآن</h4>
          <p style={{ margin: 0, fontSize: 13 }}>
            يمكن لمهندس الموقع الضغط على زر "طلب خامات / مهمات للموقع" لإرسال احتياجات الموقع للإدارة والمشتريات فوراً
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="data-table" style={{ width: '100%', minWidth: 640 }}>
            <thead>
              <tr>
                <th>الخامة / البند المطلوب</th>
                <th>الكمية</th>
                <th>الأهمية</th>
                <th>تاريخ الطلب</th>
                <th>المهندس الطالب</th>
                <th>حالة التوريد</th>
                <th style={{ textAlign: 'left' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => {
                const isDelivered = m.status === 'تم التوريد';
                const isInProgress = m.status === 'جاري الشراء';

                return (
                  <tr key={m.id} style={{ background: isDelivered ? 'rgba(16,185,129,0.02)' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: 6,
                          background: m.type === 'equipment' ? '#FEF3C7' : '#EFF6FF',
                          color: m.type === 'equipment' ? '#D97706' : '#2563EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                        }}>
                          {m.type === 'equipment' ? '🚜' : '🧱'}
                        </span>
                        {m.item || m.name}
                      </div>
                      {m.notes && (
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, paddingRight: 32 }}>
                          📝 {m.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {m.qty} <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>{m.unit || 'وحدة'}</span>
                    </td>
                    <td>
                      {m.priority === 'critical' ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 6 }}>
                          🚨 طارئ جداً
                        </span>
                      ) : m.priority === 'urgent' ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 6 }}>
                          ⚠️ عاجل
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>عادي</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{fmtDate(m.dateRequested)}</div>
                      {m.requiredByDate && (
                        <div style={{ fontSize: 10.5, color: '#D97706', marginTop: 2 }}>
                          مطلوب قبل: {fmtDate(m.requiredByDate)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5, fontWeight: 600 }}>
                      {m.requester || project.engineer || 'مهندس الموقع'}
                    </td>
                    <td>
                      {isDelivered ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={13} /> تم التوريد والاستلام
                        </span>
                      ) : isInProgress ? (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Truck size={13} /> جاري الشراء والتوريد
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={13} /> مطلوبة (قيد الانتظار)
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* WhatsApp Dispatch Button */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => shareWhatsApp(m)}
                          title="مشاركة إذن التوريد عبر الواتساب"
                          style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 8px' }}
                        >
                          <MessageSquare size={13} />
                          <span>واتساب</span>
                        </button>

                        {/* Quick Confirm Delivery Button for Site Engineer */}
                        {!isDelivered ? (
                          <button
                            type="button"
                            className="btn btn-xs"
                            onClick={() => updateStatus(m.id, 'تم التوريد')}
                            style={{
                              background: '#10B981', color: '#fff', border: 'none',
                              fontSize: 11, padding: '4px 10px', borderRadius: 6,
                              display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700
                            }}
                            title="تأكيد وصول واستلام المواد في الموقع"
                          >
                            <Check size={13} />
                            <span>تأكيد الاستلام بالموقع</span>
                          </button>
                        ) : (
                          <select
                            value={m.status}
                            onChange={e => updateStatus(m.id, e.target.value)}
                            style={{
                              padding: '3px 8px', borderRadius: 6,
                              border: '1px solid var(--border)',
                              fontFamily: 'Cairo', fontSize: 11, background: 'var(--card)'
                            }}
                          >
                            <option value="تم التوريد">الحالة: مستلمة ✅</option>
                            <option value="جاري الشراء">جاري الشراء ⏳</option>
                            <option value="مطلوبة">إعادة كـ (مطلوبة) ❌</option>
                          </select>
                        )}

                        {/* Delete Button */}
                        {confirmDeleteId === m.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              style={{ padding: '3px 6px', fontSize: 10 }}
                              onClick={() => removeEntry(m.id)}
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              style={{ padding: '3px 6px', fontSize: 10 }}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ padding: 4 }}
                            onClick={() => setConfirmDeleteId(m.id)}
                            title="حذف هذا الطلب"
                          >
                            <Trash2 size={13} color="var(--muted)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
