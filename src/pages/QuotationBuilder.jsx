import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator, FileSpreadsheet, Plus, Trash2, Pencil, Check, X, Printer,
  Building2, User, Phone, CheckCircle2, ArrowRight, Download, Sparkles, Copy, RefreshCw, Layers
} from 'lucide-react';
import { fmtDate, getGlobalCurrency } from '../utils/helpers';

const STORE_QUOTATIONS = 'db-quotations-v1';

// Default templates according to finishing levels (EGP per sqm estimates)
const FINISHING_LEVELS = {
  economic: { label: 'اقتصادي / تجاري', baseCostPerSqm: 2800, margin: 12 },
  lux:       { label: 'تشطيب لوكس',      baseCostPerSqm: 4200, margin: 15 },
  super_lux: { label: 'سوبر لوكس',        baseCostPerSqm: 6500, margin: 18 },
  ultra_lux: { label: 'ألترا لوكس / ديلوكس', baseCostPerSqm: 9500, margin: 20 },
};

const DEFAULT_ITEMS_TEMPLATE = [
  { id: 'q1', category: 'تأسيس', label: 'تأسيس الكهرباء (شبكات، مواسير، أسلاك، علب)', unit: 'م²', qtyFactor: 1, rate: 450, notes: 'أسلاك السويدي معتمد + مواسير مصطفى محمود' },
  { id: 'q2', category: 'تأسيس', label: 'تأسيس السباكة والصرف والعزل المائي', unit: 'حمام/مطبخ', qtyFactor: 0.04, rate: 8500, notes: 'مواسير BPR شريف مع الضمان + عزل إنسومات' },
  { id: 'q3', category: 'بناء ومحارة', label: 'أعمال المحارة والتلبيس الداخلي بالبؤج واللواد', unit: 'م²', qtyFactor: 2.8, rate: 110, notes: 'أسمنت ممتاز مع إضافة مواد ربط ورمل مغسول' },
  { id: 'q4', category: 'أسقف وجبس', label: 'توريد وتركيب أسقف جيبس بورد وديكورات إضاءة', unit: 'م²', qtyFactor: 0.6, rate: 280, notes: 'أبواح كناوف أصلية مقاومة للرطوبة بالحسامات' },
  { id: 'q5', category: 'أرضيات وتكسيات', label: 'توريد وتركيب سيراميك/بورسلين الأرضيات', unit: 'م²', qtyFactor: 1, rate: 380, notes: 'سيراميك فرز أول مع مادة لاصقة ممتازة' },
  { id: 'q6', category: 'أرضيات وتكسيات', label: 'توريد وتركيب سيراميك الحوائط للمطابخ والحمامات', unit: 'م²', qtyFactor: 0.8, rate: 320, notes: 'تشمل الوزرات والفواصل الديكورية' },
  { id: 'q7', category: 'دهانات وتشطيب', label: 'أعمال الدهانات والتأسيس والتشطيب النهائي (3 سكين معجون + دهان)', unit: 'م²', qtyFactor: 2.8, rate: 160, notes: 'دهانات جوتن أو سايبس بلاستيك قابل للغسيل' },
  { id: 'q8', category: 'أبواب وشبابيك', label: 'توريد وتركيب الأبواب الخشبية والشبابيك الألوميتال', unit: 'بند مقطوع', qtyFactor: 0.01, rate: 25000, notes: 'أبواب قشرة أرو + ألوميتال قطاع جامبو مع زجاج دبل' },
  { id: 'q9', category: 'تشطيب كهربائي وصحي', label: 'تركيب اللوازم الكهربائية والأدوات الصحية النهائية', unit: 'مقطوعية', qtyFactor: 0.01, rate: 18000, notes: 'لقم فينوس/سانشي + أطقم صحي إيديال ستاندارد' },
];

function loadQuotations() {
  try {
    const v = localStorage.getItem(STORE_QUOTATIONS);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

function saveQuotations(data) {
  try { localStorage.setItem(STORE_QUOTATIONS, JSON.stringify(data)); } catch {}
}

export default function QuotationBuilder({ onConvertToProject }) {
  const curr = getGlobalCurrency();
  const [quotations, setQuotations] = useState(loadQuotations);
  const [activeView, setActiveView] = useState('list'); // 'list' | 'editor' | 'print'
  const [activeQuotation, setActiveQuotation] = useState(null);

  // Form State
  const [form, setForm] = useState({
    id: '',
    clientName: '',
    clientPhone: '',
    propertyType: 'شقة سكنية',
    area: 120,
    finishingLevel: 'super_lux',
    profitMargin: 18,
    validDays: 15,
    notes: 'العرض يشمل التوريد والتركيب والشوائب والمصناعيات. مدة التنفيذ 90 يوماً من تاريخ التوقيع.',
    items: []
  });

  const [newItem, setNewItem] = useState({ category: 'عام', label: '', unit: 'م²', qty: 1, rate: 0, notes: '' });

  // Generate initial default items calculated for area
  const generateItemsForArea = (areaVal, levelKey) => {
    const level = FINISHING_LEVELS[levelKey] || FINISHING_LEVELS.super_lux;
    return DEFAULT_ITEMS_TEMPLATE.map(t => {
      let calcQty = Math.round(t.qtyFactor * areaVal);
      if (calcQty < 1) calcQty = 1;
      let calcRate = t.rate;
      if (levelKey === 'ultra_lux') calcRate = Math.round(t.rate * 1.5);
      else if (levelKey === 'lux') calcRate = Math.round(t.rate * 0.85);
      else if (levelKey === 'economic') calcRate = Math.round(t.rate * 0.65);

      return {
        id: 'item-' + Math.random().toString(36).substr(2, 6),
        category: t.category,
        label: t.label,
        unit: t.unit,
        qty: calcQty,
        rate: calcRate,
        notes: t.notes
      };
    });
  };

  const openNewEditor = () => {
    const initArea = 120;
    const initLevel = 'super_lux';
    const initItems = generateItemsForArea(initArea, initLevel);
    const newQ = {
      id: 'q-' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      clientName: '',
      clientPhone: '',
      propertyType: 'شقة سكنية',
      area: initArea,
      finishingLevel: initLevel,
      profitMargin: FINISHING_LEVELS[initLevel].margin,
      validDays: 15,
      notes: 'العرض يشمل الخامات والمصناعيات طبقاً للتواصف المقترح. التصفية النهائية حسب الكميات المنفذة على الطبيعة.',
      items: initItems
    };
    setForm(newQ);
    setActiveQuotation(newQ);
    setActiveView('editor');
  };

  const openEditEditor = (q) => {
    setForm({ ...q });
    setActiveQuotation(q);
    setActiveView('editor');
  };

  const handleRecalculateTemplate = () => {
    if (window.confirm('هل تريد إعادة حساب بنود المقايسة تلقائياً حسب المساحة ومستوى التشطيب الحالي؟')) {
      const regenerated = generateItemsForArea(Number(form.area) || 100, form.finishingLevel);
      setForm(f => ({
        ...f,
        profitMargin: FINISHING_LEVELS[f.finishingLevel]?.margin || 15,
        items: regenerated
      }));
    }
  };

  // Subtotals & Total calculation
  const subtotalCost = useMemo(() => {
    return (form.items || []).reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  }, [form.items]);

  const profitAmount = useMemo(() => {
    return Math.round(subtotalCost * (Number(form.profitMargin || 0) / 100));
  }, [subtotalCost, form.profitMargin]);

  const grandTotal = useMemo(() => {
    return subtotalCost + profitAmount;
  }, [subtotalCost, profitAmount]);

  const costPerSqm = useMemo(() => {
    const a = Number(form.area) || 1;
    return Math.round(grandTotal / a);
  }, [grandTotal, form.area]);

  // Save Quotation
  const handleSaveQuotation = () => {
    if (!form.clientName.trim()) {
      alert('يرجى كتابة اسم العميل أولاً');
      return;
    }
    const qData = { ...form, subtotalCost, profitAmount, grandTotal, costPerSqm, date: form.date || new Date().toISOString().slice(0, 10) };
    const existingIndex = quotations.findIndex(q => q.id === qData.id);
    let nextList;
    if (existingIndex >= 0) {
      nextList = quotations.map((q, i) => i === existingIndex ? qData : q);
    } else {
      nextList = [qData, ...quotations];
    }
    setQuotations(nextList);
    saveQuotations(nextList);
    setActiveQuotation(qData);
    alert('تم حفظ المقايسة بنجاح!');
  };

  const handleDeleteQuotation = (id) => {
    if (window.confirm('هل أنت تأكد من حذف هذه المقايسة؟')) {
      const nextList = quotations.filter(q => q.id !== id);
      setQuotations(nextList);
      saveQuotations(nextList);
      if (activeQuotation?.id === id) {
        setActiveView('list');
      }
    }
  };

  // Add Item to Quotation
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.label.trim()) return;
    const itemToAdd = {
      ...newItem,
      id: 'item-' + Date.now(),
      qty: Number(newItem.qty) || 1,
      rate: Number(newItem.rate) || 0
    };
    setForm(f => ({ ...f, items: [...f.items, itemToAdd] }));
    setNewItem({ category: 'عام', label: '', unit: 'م²', qty: 1, rate: 0, notes: '' });
  };

  const handleRemoveItem = (itemId) => {
    setForm(f => ({ ...f, items: f.items.filter(it => it.id !== itemId) }));
  };

  const handleItemChange = (itemId, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map(it => it.id === itemId ? { ...it, [field]: value } : it)
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConvertProject = () => {
    if (!onConvertToProject) {
      alert('يرجى الانتقال لصفحة المشاريع لإضافة مشروع جديد بهذه المقايسة.');
      return;
    }
    onConvertToProject({
      name: `تشطيب ${form.propertyType} - ${form.clientName}`,
      client: form.clientName,
      area: `${form.area} م²`,
      type: form.propertyType,
      budget: grandTotal,
      startDate: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="grid tab-fade" style={{ gap: 24, paddingBottom: 40 }}>
      {/* Top Banner */}
      <div className="panel print-hide" style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F1F5F9', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'Tajawal', fontSize: 22, color: 'var(--ink)' }}>حاسبة المقايسات وعروض الأسعار</h2>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>حساب تكاليف التشطيب تقديرياً، توليد عرض سعر رسمي للعميل، وتحويله لموقع عمل</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {activeView !== 'list' && (
              <button className="btn" onClick={() => setActiveView('list')}>
                <ArrowRight size={16} /> العودة للمقايسات
              </button>
            )}
            <button className="btn btn-primary" onClick={openNewEditor} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} /> مقايسة جديدة
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: QUOTATIONS LIST */}
      {activeView === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI Cards */}
          <div className="grid kpi-grid">
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><FileSpreadsheet size={18} /></div>
              <div className="label">إجمالي المقايسات المحفوظة</div>
              <div className="value">{quotations.length}</div>
            </div>
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Calculator size={18} /></div>
              <div className="label">إجمالي قيم العروض التقديرية</div>
              <div className="value">{quotations.reduce((s, q) => s + Number(q.grandTotal || 0), 0).toLocaleString()} {curr}</div>
            </div>
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Building2 size={18} /></div>
              <div className="label">متوسط سعر المتر التشطيب</div>
              <div className="value">
                {quotations.length ? Math.round(quotations.reduce((s, q) => s + Number(q.costPerSqm || 0), 0) / quotations.length).toLocaleString() : 0} {curr}/م²
              </div>
            </div>
          </div>

          {/* List Table / Cards */}
          {quotations.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <Calculator size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3 style={{ fontFamily: 'Tajawal', marginBottom: 8, color: 'var(--ink)' }}>لا توجد مقايسات محفوظة حتى الآن</h3>
              <p style={{ fontSize: 14, marginBottom: 20 }}>انقر على "مقايسة جديدة" لحساب تكلفة تشطيب عقار وتوليد عرض سعر للعميل.</p>
              <button className="btn btn-primary" onClick={openNewEditor}><Plus size={16} /> إنشاء أول مقايسة</button>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>العميل والمعاينة</th>
                    <th>نوع العقار والمساحة</th>
                    <th>مستوى التشطيب</th>
                    <th>التكلفة التقديرية</th>
                    <th>سعر المتر</th>
                    <th>التاريخ</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => (
                    <tr key={q.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--ink)' }}>{q.clientName || 'عميل بدون اسم'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} /> {q.clientPhone || '—'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{q.propertyType}</span>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{q.area} م²</div>
                      </td>
                      <td>
                        <span style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                          {FINISHING_LEVELS[q.finishingLevel]?.label || q.finishingLevel}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--teal)' }}>{Number(q.grandTotal || 0).toLocaleString()} {curr}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>شامل {q.profitMargin}% هامش</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{Number(q.costPerSqm || 0).toLocaleString()} {curr}/م²</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(q.date)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => openEditEditor(q)} title="تعديل الحسابات">
                            <Pencil size={15} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 10px', color: 'var(--teal)' }} onClick={() => { setActiveQuotation(q); setForm(q); setActiveView('print'); }} title="عرض وطباعة العرض الرسمي">
                            <Printer size={15} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 10px', color: 'var(--danger)' }} onClick={() => handleDeleteQuotation(q.id)} title="حذف المقايسة">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: EDITOR (Interactive Quotation Calculator) */}
      {activeView === 'editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header Action Bar */}
          <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '16px 24px' }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={20} color="var(--amber)" /> حاسبة ومحرر المقايسة
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={handleRecalculateTemplate} style={{ border: '1px solid var(--border)', fontSize: 13 }}>
                <RefreshCw size={14} /> إعادة توليد البنود آلياً
              </button>
              <button className="btn btn-ghost" onClick={() => setActiveView('print')} style={{ border: '1px solid var(--teal)', color: 'var(--teal)', fontSize: 13 }}>
                <Printer size={14} /> المعاينة والطباعة
              </button>
              <button className="btn btn-primary" onClick={handleSaveQuotation} style={{ padding: '8px 20px', fontSize: 13 }}>
                <Check size={16} /> حفظ المقايسة
              </button>
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="panel">
            <h4 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--teal)" /> البيانات الأساسية للعميل والعقار
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label>اسم العميل *</label>
                <input type="text" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="مثال: أ. محمد أحمد" />
              </div>
              <div className="form-group">
                <label>رقم هاتف العميل</label>
                <input type="tel" value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} placeholder="010-..." />
              </div>
              <div className="form-group">
                <label>نوع العقار</label>
                <select value={form.propertyType} onChange={e => setForm({ ...form, propertyType: e.target.value })}>
                  <option value="شقة سكنية">شقة سكنية</option>
                  <option value="فيلا / توين هاوس">فيلا / توين هاوس</option>
                  <option value="مكتب تجاري / إداري">مكتب تجاري / إداري</option>
                  <option value="عيادة / مركز طبي">عيادة / مركز طبي</option>
                  <option value="معرض / محل تجاري">معرض / محل تجاري</option>
                </select>
              </div>
              <div className="form-group">
                <label>مساحة العقار (م²) *</label>
                <input type="number" min="10" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="120" />
              </div>
              <div className="form-group">
                <label>مستوى التشطيب المقترح</label>
                <select value={form.finishingLevel} onChange={e => setForm({ ...form, finishingLevel: e.target.value })}>
                  {Object.entries(FINISHING_LEVELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>نسبة هامش ربح المكتب (%)</label>
                <input type="number" min="0" max="50" value={form.profitMargin} onChange={e => setForm({ ...form, profitMargin: e.target.value })} placeholder="15" />
              </div>
            </div>
          </div>

          {/* Live Calculation Summary Banner */}
          <div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="kpi-card" style={{ background: 'rgba(0,0,0,0.02)' }}>
              <div className="label">التكلفة المباشرة (التوريد والمصنعيات)</div>
              <div className="value" style={{ fontSize: 20 }}>{subtotalCost.toLocaleString()} {curr}</div>
            </div>
            <div className="kpi-card" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="label">إشراف وهوامش المكتب ({form.profitMargin}%)</div>
              <div className="value" style={{ fontSize: 20, color: 'var(--amber)' }}>+{profitAmount.toLocaleString()} {curr}</div>
            </div>
            <div className="kpi-card" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="label">إجمالي عرض السعر التقديري</div>
              <div className="value" style={{ fontSize: 22, color: 'var(--teal)' }}>{grandTotal.toLocaleString()} {curr}</div>
            </div>
            <div className="kpi-card" style={{ background: 'rgba(59,130,246,0.05)' }}>
              <div className="label">معدل سعر المتر النهائي</div>
              <div className="value" style={{ fontSize: 20, color: '#3B82F6' }}>{costPerSqm.toLocaleString()} {curr} / م²</div>
            </div>
          </div>

          {/* Items Table Editor */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 15, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="var(--teal)" /> تفاصيل بنود المقايسة والكميات
              </h4>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>عدد البنود: {form.items.length}</span>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 20 }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>التصنيف</th>
                    <th>بيان البند والمواصفة</th>
                    <th style={{ width: 90 }}>الكمية</th>
                    <th style={{ width: 90 }}>الوحدة</th>
                    <th style={{ width: 120 }}>سعر الوحدة ({curr})</th>
                    <th style={{ width: 130 }}>الإجمالي ({curr})</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => {
                    const itemTotal = Number(item.qty || 0) * Number(item.rate || 0);
                    return (
                      <tr key={item.id}>
                        <td>
                          <input value={item.category || ''} onChange={e => handleItemChange(item.id, 'category', e.target.value)}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 12 }} />
                        </td>
                        <td>
                          <input value={item.label || ''} onChange={e => handleItemChange(item.id, 'label', e.target.value)}
                            style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13, fontWeight: 700 }} />
                          <input value={item.notes || ''} onChange={e => handleItemChange(item.id, 'notes', e.target.value)} placeholder="ملاحظات المواصفة..."
                            style={{ width: '100%', padding: '2px 6px', borderRadius: 6, border: '1px dashed var(--border)', fontFamily: 'Cairo', fontSize: 11, color: 'var(--muted)', marginTop: 4 }} />
                        </td>
                        <td>
                          <input type="number" min="0.1" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', e.target.value)}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13, fontWeight: 700 }} />
                        </td>
                        <td>
                          <input value={item.unit || ''} onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 12 }} />
                        </td>
                        <td>
                          <input type="number" min="0" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13, fontWeight: 700, color: 'var(--teal)' }} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{itemTotal.toLocaleString()} {curr}</div>
                        </td>
                        <td>
                          <button onClick={() => handleRemoveItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Form to Add Custom Item */}
            <form onSubmit={handleAddItem} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(0,0,0,0.02)', padding: 14, borderRadius: 10, border: '1px dashed var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>التصنيف</label>
                <input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="عام / إضافي" style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13 }} />
              </div>
              <div style={{ flex: '3 1 240px' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>بيان البند الجديد</label>
                <input value={newItem.label} onChange={e => setNewItem({ ...newItem, label: e.target.value })} placeholder="مثال: توريد وتركيب بيوت نور بالأسقف..." style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13 }} />
              </div>
              <div style={{ flex: '1 1 80px' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>الكمية</label>
                <input type="number" min="0.1" value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13 }} />
              </div>
              <div style={{ flex: '1 1 80px' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>الوحدة</label>
                <input value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13 }} />
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>سعر الوحدة ({curr})</label>
                <input type="number" min="0" value={newItem.rate} onChange={e => setNewItem({ ...newItem, rate: e.target.value })} placeholder="0" style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13 }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13, height: 38 }}>
                <Plus size={16} /> إضافة بند
              </button>
            </form>
          </div>

          {/* Notes & Terms */}
          <div className="panel">
            <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink)' }}>ملاحظات ومحددات عرض السعر</h4>
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 13, background: 'var(--card)', color: 'var(--ink)', resize: 'vertical' }} />
          </div>
        </div>
      )}

      {/* VIEW 3: PRINTABLE OFFICIAL QUOTATION */}
      {activeView === 'print' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Action Bar */}
          <div className="panel print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
            <button className="btn btn-ghost" onClick={() => setActiveView('editor')} style={{ border: '1px solid var(--border)' }}>
              <ArrowRight size={16} /> تعديل المقايسة
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={16} /> طباعة / تصدير PDF
              </button>
              <button className="btn btn-ghost" onClick={handleConvertProject} style={{ border: '1px solid var(--teal)', color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={16} /> تحويل إلى مشروع جديد
              </button>
            </div>
          </div>

          {/* Official Printable Sheet Container */}
          <div className="panel printable-sheet" style={{ background: '#fff', color: '#0F172A', padding: 40, borderRadius: 12, border: '1px solid #CBD5E1', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontFamily: 'Cairo' }}>
            {/* Document Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0F172A', paddingBottom: 20, marginBottom: 24 }}>
              <div>
                <h1 style={{ margin: 0, fontFamily: 'Tajawal', fontSize: 26, color: '#0F172A', fontWeight: 900 }}>مكتب التشطيبات والديكور المعماري</h1>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>عرض سعر وتفاصيل مقايسة تشطيب مبدئية</div>
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>QUOTATION #{form.id.slice(-6).toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>تاريخ العرض: {fmtDate(form.date)}</div>
                <div style={{ fontSize: 12, color: '#0F172A', fontWeight: 700, marginTop: 2 }}>صلاحية العرض: {form.validDays} يوماً</div>
              </div>
            </div>

            {/* Client Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#F8FAFC', padding: 18, borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>السادة المحترمون / العميل:</div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#0F172A' }}>{form.clientName || 'أ. عميل محترم'}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>الهاتف: {form.clientPhone || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>بيانات العقار والتشطيب:</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A' }}>{form.propertyType} — مساحة {form.area} م²</div>
                <div style={{ fontSize: 13, color: '#059669', fontWeight: 700, marginTop: 2 }}>مستوى التشطيب: {FINISHING_LEVELS[form.finishingLevel]?.label || form.finishingLevel}</div>
              </div>
            </div>

            {/* Items Printable Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#0F172A', color: '#fff' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 6px 6px 0' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>بيان الأعمال والمواصفات المقترحة</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: 70 }}>الكمية</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: 70 }}>الوحدة</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', width: 110 }}>سعر الوحدة</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', width: 120, borderRadius: '6px 0 0 6px' }}>الإجمالي (ج.م)</th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => {
                  const lineTot = Number(it.qty || 0) * Number(it.rate || 0);
                  return (
                    <tr key={it.id} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{it.label}</div>
                        {it.notes && <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{it.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{it.qty}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{it.unit}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, direction: 'ltr' }}>{Number(it.rate || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#0F172A', direction: 'ltr' }}>{lineTot.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary Total Calculation Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30 }}>
              <div style={{ width: 340, background: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                  <span>صافي تكلفة الأعمال والمصناعيات:</span>
                  <span style={{ fontWeight: 700, direction: 'ltr' }}>{subtotalCost.toLocaleString()} {curr}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#D97706' }}>
                  <span>نسبة الإشراف والمتابعة المكتبية ({form.profitMargin}%):</span>
                  <span style={{ fontWeight: 700, direction: 'ltr' }}>+{profitAmount.toLocaleString()} {curr}</span>
                </div>
                <div style={{ borderTop: '2px solid #0F172A', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: '#0F172A' }}>
                  <span>إجمالي عرض السعر النهائي:</span>
                  <span style={{ color: '#059669', direction: 'ltr' }}>{grandTotal.toLocaleString()} {curr}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                  (متوسط سعر متر التشطيب النهائي: {costPerSqm.toLocaleString()} {curr} / م²)
                </div>
              </div>
            </div>

            {/* Terms & Signatures */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 20, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#0F172A', marginBottom: 4 }}>الشروط والأحكام العامّة:</div>
                <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>{form.notes}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 40 }}>توقيع وتأكيد العميل</div>
                <div style={{ borderTop: '1px dashed #94A3B8', paddingTop: 4, fontSize: 11, color: '#64748B' }}>التوقيع والقبول</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 40 }}>اعتماد مكتب التشطيبات</div>
                <div style={{ borderTop: '1px dashed #94A3B8', paddingTop: 4, fontSize: 11, color: '#64748B' }}>الختم والتوقيع</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
