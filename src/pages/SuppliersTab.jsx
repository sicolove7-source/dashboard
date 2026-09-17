import React, { useState, useMemo } from 'react';
import {
  Truck, Package, Wrench, Plus, Search, X, Phone, MapPin,
  Star, Trash2, Pencil, CheckCircle2, AlertTriangle,
  Clock, Users, ChevronDown, ChevronUp, TrendingUp, FileText, HardHat
} from 'lucide-react';
import { getGlobalCurrency } from '../utils/helpers';
import CraftsmanContractModal from '../components/CraftsmanContractModal';
import {
  syncWorkersToCloud,
  syncSuppliersToCloud,
  subscribeToCloudCompanyField,
} from '../services/cloudSync';
import { getActiveTenantId } from '../services/tenantsManager';

const STORE_SUPPLIERS = 'db-suppliers-v1';
const STORE_WORKERS   = 'db-workers-v1';

const SEED_SUPPLIERS = [
  { id:'s1', name:'شركة الدلتا للسيراميك', category:'أرضيات وتكسيات', phone:'010-11223344', address:'المنطقة الصناعية', rating:5, status:'موثوق', notes:'سعر جيد، توريد منتظم', materials:['سيراميك أرضيات','بورسلين حوائط'] },
  { id:'s2', name:'مورد الدهانات المتحدة',  category:'دهانات',          phone:'012-55667788', address:'الحي التجاري',    rating:4, status:'موثوق', notes:'',                       materials:['دهانات بلاستيك','معجون'] },
  { id:'s3', name:'مصنع الغراء واللاصقة',  category:'مواد بناء',       phone:'011-99887766', address:'منطقة النوادي',  rating:3, status:'عادي',  notes:'أسعار مرتفعة أحياناً',   materials:['غراء بلاط','أسمنت'] },
  { id:'s4', name:'شركة كنوف للجبس',       category:'جيبس وأسقف',     phone:'010-22334455', address:'المنطقة المركزية',rating:5, status:'موثوق', notes:'منتجات أصلية 100%',      materials:['جيبس بورد','ألواح جيبس'] },
];

const SEED_WORKERS = [
  { id:'w1', name:'أبو محمد المحارجي',     trade:'عمال محارة',   phone:'010-33445566', rating:5, dailyRate:350, status:'متاح',     experience:10, notes:'متميز في المحارة والتلبيس' },
  { id:'w2', name:'عم حسن السباك',         trade:'سباك',         phone:'011-77889900', rating:4, dailyRate:400, status:'مشغول',    experience:15, notes:'خبير في PPR والنحاس' },
  { id:'w3', name:'مصطفى فني السيراميك',  trade:'فنيين سيراميك',phone:'012-11223344', rating:5, dailyRate:380, status:'متاح',     experience:8,  notes:'دقيق في الفواصل والتسوية' },
  { id:'w4', name:'حسام الكهربائي',        trade:'كهربائي',      phone:'010-99887766', rating:4, dailyRate:450, status:'متاح',     experience:12, notes:'معتمد من الهيئة القومية' },
  { id:'w5', name:'أحمد نجار الديكور',     trade:'نجار ديكور',   phone:'011-44556677', rating:3, dailyRate:320, status:'غير متاح', experience:5,  notes:'' },
];

const CATEGORIES      = ['أرضيات وتكسيات','دهانات','مواد بناء','جيبس وأسقف','أجهزة صحية','كهرباء','نجارة','حديد وصلب','عزل','أخرى'];
const TRADES          = ['عمال محارة','فنيين سيراميك','كهربائي','سباك','نجار ديكور','عمال دهانات','حداد','نجار خشب','عازل','عامل عام'];
const SUPPLIER_STATUS = ['موثوق','عادي','تحت المراجعة','محظور'];
const WORKER_STATUS   = ['متاح','مشغول','غير متاح'];
const MAT_HINTS       = ['سيراميك أرضيات','بورسلين حوائط','دهانات بلاستيك','جيبس بورد','أسمنت','رمل','غراء بلاط','أسلاك كهرباء','مواسير صحي'];

function loadOrSeed(key, seed) {
  try { const v = localStorage.getItem(key); if (v) return JSON.parse(v); localStorage.setItem(key,JSON.stringify(seed)); return seed; } catch { return seed; }
}
function saveLS(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }

function StarRating({ value, onChange, size = 18 }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={onChange ? () => onChange(n) : undefined}
          style={{ cursor: onChange ? 'pointer' : 'default', color: n <= value ? '#F59E0B' : 'var(--border)', transition:'color .15s' }}>
          <Star size={size} fill={n <= value ? '#F59E0B' : 'none'} />
        </span>
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const m = {
    'موثوق':        ['rgba(16,185,129,.12)','#10B981'],
    'عادي':         ['rgba(245,158,11,.12)','#F59E0B'],
    'تحت المراجعة':['rgba(59,130,246,.12)','#3B82F6'],
    'محظور':        ['rgba(239,68,68,.12)','#EF4444'],
    'متاح':         ['rgba(16,185,129,.12)','#10B981'],
    'مشغول':        ['rgba(245,158,11,.12)','#F59E0B'],
    'غير متاح':     ['rgba(239,68,68,.12)','#EF4444'],
  };
  const [bg, color] = m[status] || ['rgba(100,116,139,.12)','var(--muted)'];
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, background:bg, color, fontSize:12, fontWeight:700 }}>{status}</span>;
}

function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
      <Icon size={48} style={{ opacity:.2, marginBottom:16 }} />
      <h3 style={{ fontFamily:'Tajawal', marginBottom:8, color:'var(--ink)' }}>{title}</h3>
      <p style={{ fontSize:14 }}>{sub}</p>
    </div>
  );
}

/* ── Suppliers ─────────────────────────────────────── */
function SuppliersSection({ activeCompanyId }) {
  const [items, setItems] = useState(() => loadOrSeed(STORE_SUPPLIERS, SEED_SUPPLIERS));
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterSt, setFilterSt]     = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [expanded, setExpanded]     = useState(null);
  const blank = { name:'', category:CATEGORIES[0], phone:'', address:'', rating:3, status:'عادي', notes:'', materials:[] };
  const [form, setForm]             = useState(blank);
  const [matInput, setMatInput]     = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i =>
      (!q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.phone.includes(q)) &&
      (!filterCat || i.category === filterCat) &&
      (!filterSt  || i.status   === filterSt)
    );
  }, [items, search, filterCat, filterSt]);

  const commit = (next) => {
    setItems(next);
    saveLS(STORE_SUPPLIERS, next);
    const cId = activeCompanyId || getActiveTenantId() || 'comp_alain';
    syncSuppliersToCloud(cId, next);
  };

  React.useEffect(() => {
    const cId = activeCompanyId || getActiveTenantId() || 'comp_alain';
    const unsub = subscribeToCloudCompanyField(cId, 'suppliers', (cloudSuppliers) => {
      if (Array.isArray(cloudSuppliers)) {
        setItems(cloudSuppliers);
        saveLS(STORE_SUPPLIERS, cloudSuppliers);
      }
    });
    return () => unsub();
  }, [activeCompanyId]);
  const openAdd  = () => { setEditing(null); setForm(blank); setMatInput(''); setShowForm(true); };
  const openEdit = (it) => { setEditing(it.id); setForm({...it}); setMatInput(''); setShowForm(true); };
  const del      = (id) => commit(items.filter(i => i.id !== id));
  const save     = () => {
    if (!form.name.trim()) return;
    editing ? commit(items.map(i => i.id === editing ? {...i,...form} : i))
            : commit([{...form, id:'sup-'+Date.now()}, ...items]);
    setShowForm(false);
  };
  const addMat = () => {
    if (!matInput.trim() || form.materials.includes(matInput.trim())) return;
    setForm({...form, materials:[...form.materials, matInput.trim()]});
    setMatInput('');
  };

  const trusted   = items.filter(i => i.status === 'موثوق').length;
  const avgRating = items.length ? (items.reduce((a,b) => a+b.rating, 0)/items.length).toFixed(1) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* KPIs */}
      <div className="grid kpi-grid suppliers-kpi-grid">
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Truck size={18}/></div>
          <div className="label">إجمالي الموردين</div><div className="value">{items.length}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><CheckCircle2 size={18}/></div>
          <div className="label">موردون موثوقون</div><div className="value">{trusted}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Star size={18}/></div>
          <div className="label">متوسط التقييم</div><div className="value">{avgRating} ★</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box" style={{ flex:1 }}>
          <Search size={18} color="var(--muted)"/>
          <input placeholder="ابحث باسم المورد أو التصنيف..." value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <X size={18} style={{ cursor:'pointer' }} onClick={() => setSearch('')}/>}
        </div>
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filterSt} onChange={e => setFilterSt(e.target.value)}>
          <option value="">كل الحالات</option>
          {SUPPLIER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> إضافة مورد</button>
      </div>

      {/* Suppliers List: Desktop Table + Mobile Cards */}
      {filtered.length === 0
        ? <div className="panel"><EmptyState icon={Truck} title="لا يوجد موردون" sub="لم يتم العثور على موردين بهذه المعايير"/></div>
        : (
        <div>
          {/* ── Desktop Table ── */}
          <div className="panel desktop-only-table" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table" style={{ width:'100%' }}>
                <thead>
                  <tr>
                    <th>المورد</th><th>التصنيف</th><th>الهاتف</th>
                    <th>التقييم</th><th>الحالة</th><th>المواد</th><th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(it => (
                    <React.Fragment key={it.id}>
                      <tr style={{ cursor:'pointer' }} onClick={() => setExpanded(expanded === it.id ? null : it.id)}>
                        <td>
                          <div style={{ fontWeight:700, color:'var(--ink)' }}>{it.name}</div>
                          {it.address && <div style={{ fontSize:12, color:'var(--muted)', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><MapPin size={12}/> {it.address}</div>}
                        </td>
                        <td><span style={{ background:'rgba(59,130,246,.1)', color:'#3B82F6', padding:'4px 10px', borderRadius:12, fontSize:12, fontWeight:700 }}>{it.category}</span></td>
                        <td>
                          <a href={`tel:${it.phone}`} style={{ color:'var(--teal)', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}
                             onClick={e => e.stopPropagation()}><Phone size={14}/> {it.phone}</a>
                        </td>
                        <td><StarRating value={it.rating}/></td>
                        <td><StatusPill status={it.status}/></td>
                        <td>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                            {(it.materials||[]).slice(0,2).map(m => <span key={m} style={{ background:'rgba(245,158,11,.1)', color:'var(--amber)', padding:'2px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>{m}</span>)}
                            {(it.materials||[]).length > 2 && <span style={{ fontSize:11, color:'var(--muted)' }}>+{it.materials.length-2}</span>}
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <button className="btn btn-ghost" style={{ padding:'6px 10px' }} onClick={() => openEdit(it)}><Pencil size={15}/></button>
                            <button className="btn btn-ghost" style={{ padding:'6px 10px', color:'var(--danger)' }} onClick={() => del(it.id)}><Trash2 size={15}/></button>
                            {expanded === it.id ? <ChevronUp size={18} color="var(--muted)"/> : <ChevronDown size={18} color="var(--muted)"/>}
                          </div>
                        </td>
                      </tr>
                      {expanded === it.id && (
                        <tr>
                          <td colSpan={7} style={{ background:'rgba(0,0,0,.02)', padding:'16px 24px' }}>
                            <div style={{ display:'flex', gap:32, flexWrap:'wrap' }}>
                              <div>
                                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8, fontWeight:700 }}>جميع المواد</div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                  {(it.materials||[]).length===0
                                    ? <span style={{ color:'var(--muted)', fontSize:13 }}>—</span>
                                    : it.materials.map(m => <span key={m} style={{ background:'rgba(245,158,11,.1)', color:'var(--amber)', padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:700 }}>{m}</span>)}
                                </div>
                              </div>
                              {it.notes && <div>
                                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8, fontWeight:700 }}>ملاحظات</div>
                                <div style={{ fontSize:14, color:'var(--ink)', maxWidth:400 }}>{it.notes}</div>
                              </div>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="mobile-only-cards" style={{ flexDirection:'column', gap:10 }}>
            {filtered.map(it => (
              <div key={it.id} style={{
                background:'var(--card)', border:'1px solid var(--border)',
                borderRadius:14, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10,
                boxShadow:'0 2px 8px rgba(0,0,0,0.04)'
              }}>
                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:14, color:'var(--ink)', marginBottom:3 }}>{it.name}</div>
                    {it.address && <div style={{ fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:4 }}><MapPin size={11}/> {it.address}</div>}
                  </div>
                  <StatusPill status={it.status}/>
                </div>

                {/* Info row */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
                  <span style={{ background:'rgba(59,130,246,.1)', color:'#3B82F6', padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:700 }}>{it.category}</span>
                  <a href={`tel:${it.phone}`} style={{ color:'var(--teal)', fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                    <Phone size={13}/>{it.phone}
                  </a>
                </div>

                {/* Rating + Materials */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                  <StarRating value={it.rating} size={15}/>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {(it.materials||[]).slice(0,2).map(m => <span key={m} style={{ background:'rgba(245,158,11,.1)', color:'var(--amber)', padding:'2px 7px', borderRadius:8, fontSize:10, fontWeight:700 }}>{m}</span>)}
                    {(it.materials||[]).length > 2 && <span style={{ fontSize:10, color:'var(--muted)' }}>+{it.materials.length-2}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:8, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                  <button className="btn btn-ghost" style={{ flex:1, padding:'7px', fontSize:12, justifyContent:'center' }} onClick={() => openEdit(it)}>
                    <Pencil size={14}/> تعديل
                  </button>
                  <button
                    style={{ flex:1, padding:'7px', fontSize:12, background:'rgba(239,68,68,0.08)', color:'var(--danger)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
                    onClick={() => del(it.id)}
                  >
                    <Trash2 size={14}/> حذف
                  </button>
                  <button
                    style={{ flex:1, padding:'7px', fontSize:12, background:'rgba(16,185,129,0.08)', color:'#10B981', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
                    onClick={() => setExpanded(expanded === it.id ? null : it.id)}
                  >
                    {expanded === it.id ? <><ChevronUp size={14}/> إخفاء</> : <><ChevronDown size={14}/> التفاصيل</>}
                  </button>
                </div>

                {/* Expanded details */}
                {expanded === it.id && (
                  <div style={{ background:'var(--bg)', borderRadius:10, padding:12, border:'1px solid var(--border)' }}>
                    {it.notes && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>📝 {it.notes}</div>}
                    {(it.materials||[]).length > 0 && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--amber)', marginBottom:6 }}>المواد المتاحة:</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {it.materials.map(m => <span key={m} style={{ background:'rgba(245,158,11,.1)', color:'var(--amber)', padding:'3px 10px', borderRadius:10, fontSize:11, fontWeight:700 }}>{m}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth:620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Truck size={20}/> {editing ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="form-group">
                  <label>اسم المورد / الشركة *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="مثال: شركة الدلتا للسيراميك"/>
                </div>
                <div className="form-group">
                  <label>التصنيف</label>
                  <select value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="010-..."/>
                </div>
                <div className="form-group">
                  <label>العنوان</label>
                  <input type="text" value={form.address} onChange={e => setForm({...form, address:e.target.value})} placeholder="المنطقة، الحي..."/>
                </div>
                <div className="form-group">
                  <label>الحالة</label>
                  <select value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                    {SUPPLIER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>التقييم</label>
                  <StarRating value={form.rating} onChange={r => setForm({...form, rating:r})} size={24}/>
                </div>
              </div>
              <div className="form-group">
                <label>المواد التي يوردها</label>
                <div style={{ display:'flex', gap:8 }}>
                  <input list="sup-mats" value={matInput} onChange={e => setMatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addMat()}
                    placeholder="اكتب مادة واضغط إضافة..." style={{ flex:1 }}/>
                  <datalist id="sup-mats">{MAT_HINTS.map(m => <option key={m} value={m}/>)}</datalist>
                  <button className="btn btn-primary" style={{ padding:'10px 16px' }} onClick={addMat}><Plus size={16}/></button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
                  {form.materials.map(m => (
                    <span key={m} style={{ background:'rgba(245,158,11,.12)', color:'var(--amber)', padding:'4px 12px', borderRadius:12, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                      {m} <X size={12} style={{ cursor:'pointer' }} onClick={() => setForm({...form, materials:form.materials.filter(x => x!==m)})}/>
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>ملاحظات</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes:e.target.value})}
                  placeholder="أي ملاحظات مهمة..."
                  style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1px solid var(--border)', fontFamily:'Cairo', fontSize:14, resize:'vertical', background:'var(--card)', color:'var(--ink)', outline:'none' }}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>حفظ المورد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Workers ───────────────────────────────────────── */
function WorkersSection({ activeCompanyId }) {
  const [items, setItems]             = useState(() => loadOrSeed(STORE_WORKERS, SEED_WORKERS));
  const [search, setSearch]           = useState('');
  const [filterTrade, setFilterTrade] = useState('');
  const [filterSt, setFilterSt]       = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [confirmDel, setConfirmDel]   = useState(null);
  const [contractWorker, setContractWorker] = useState(null);

  const blank = {
    name: '', trade: TRADES[0], phone: '', rating: 3,
    dailyRate: 0, status: 'متاح', experience: 0, notes: '',
    lastProject: '', specialties: []
  };
  const [form, setForm]               = useState(blank);
  const [specInput, setSpecInput]     = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i =>
      (!q || i.name.toLowerCase().includes(q) || i.trade.toLowerCase().includes(q) || i.phone.includes(q)) &&
      (!filterTrade || i.trade  === filterTrade) &&
      (!filterSt    || i.status === filterSt)
    );
  }, [items, search, filterTrade, filterSt]);

  const commit = (next) => {
    setItems(next);
    saveLS(STORE_WORKERS, next);
    const cId = activeCompanyId || getActiveTenantId() || 'comp_alain';
    syncWorkersToCloud(cId, next);
  };

  React.useEffect(() => {
    const cId = activeCompanyId || getActiveTenantId() || 'comp_alain';
    const unsub = subscribeToCloudCompanyField(cId, 'workers', (cloudWorkers) => {
      if (Array.isArray(cloudWorkers)) {
        setItems(cloudWorkers);
        saveLS(STORE_WORKERS, cloudWorkers);
      }
    });
    return () => unsub();
  }, [activeCompanyId]);
  const openAdd  = () => { setEditing(null); setForm(blank); setSpecInput(''); setShowForm(true); };
  const openEdit = (it) => { setEditing(it.id); setForm({ ...it, specialties: it.specialties || [] }); setSpecInput(''); setShowForm(true); };
  const del      = (id) => { commit(items.filter(i => i.id !== id)); setConfirmDel(null); };
  const save     = () => {
    if (!form.name.trim()) return;
    editing ? commit(items.map(i => i.id === editing ? { ...i, ...form } : i))
            : commit([{ ...form, id: 'wrk-' + Date.now() }, ...items]);
    setShowForm(false);
  };
  const addSpec = () => {
    if (!specInput.trim() || form.specialties.includes(specInput.trim())) return;
    setForm({ ...form, specialties: [...form.specialties, specInput.trim()] });
    setSpecInput('');
  };
  const quickStatus = (id, newStatus) => {
    commit(items.map(i => i.id === id ? { ...i, status: newStatus } : i));
  };

  const available = items.filter(i => i.status === 'متاح').length;
  const avgRate   = items.length ? Math.round(items.reduce((a, b) => a + Number(b.dailyRate), 0) / items.length) : 0;
  const topRated  = items.filter(i => i.rating >= 4).length;

  const STATUS_NEXT = { 'متاح': 'مشغول', 'مشغول': 'غير متاح', 'غير متاح': 'متاح' };
  const STATUS_COLORS = { 'متاح': '#10B981', 'مشغول': '#F59E0B', 'غير متاح': '#EF4444' };
  const STATUS_BG    = { 'متاح': 'rgba(16,185,129,.1)', 'مشغول': 'rgba(245,158,11,.1)', 'غير متاح': 'rgba(239,68,68,.1)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPIs */}
      <div className="grid kpi-grid">
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Users size={18}/></div>
          <div className="label">إجمالي الصنايعية</div><div className="value">{items.length}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><CheckCircle2 size={18}/></div>
          <div className="label">متاحون الآن</div><div className="value">{available}</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><TrendingUp size={18}/></div>
          <div className="label">متوسط اليومية</div><div className="value">{avgRate.toLocaleString()} ج</div>
        </div>
        <div className="kpi-card">
          <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Star size={18}/></div>
          <div className="label">تقييم 4 نجوم+</div><div className="value">{topRated}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box" style={{ flex: 1 }}>
          <Search size={18} color="var(--muted)"/>
          <input placeholder="ابحث بالاسم أو المهنة أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <X size={18} style={{ cursor: 'pointer' }} onClick={() => setSearch('')}/>}
        </div>
        <select className="filter-select" value={filterTrade} onChange={e => setFilterTrade(e.target.value)}>
          <option value="">كل المهن</option>
          {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={filterSt} onChange={e => setFilterSt(e.target.value)}>
          <option value="">كل الحالات</option>
          {WORKER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button 
          className="btn" 
          onClick={() => setContractWorker({})} 
          style={{ background: '#0F172A', color: '#fff', border: '1px solid #1E293B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FileText size={15}/> صياغة عقد صنايعي
        </button>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> إضافة صنايعي</button>
      </div>

      {/* Cards */}
      {filtered.length === 0
        ? <div className="panel"><EmptyState icon={Wrench} title="لا يوجد صنايعية" sub="لم يتم العثور على صنايعية بهذه المعايير"/></div>
        : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
          {filtered.map(it => (
            <div key={it.id} style={{
              background: 'var(--card)', backdropFilter: 'var(--blur)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column', gap: 14, transition: 'all .3s ease'
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Tajawal', fontWeight: 800, fontSize: 17, color: 'var(--ink)', marginBottom: 4, lineHeight: 1.3 }}>{it.name}</div>
                  <span style={{ background: 'rgba(139,92,246,.1)', color: '#8B5CF6', padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                    <Wrench size={11} style={{ display: 'inline', marginLeft: 3 }}/>{it.trade}
                  </span>
                </div>
                {/* Quick status toggle button */}
                <button
                  onClick={() => quickStatus(it.id, STATUS_NEXT[it.status] || 'متاح')}
                  title="اضغط لتغيير الحالة"
                  style={{
                    background: STATUS_BG[it.status], color: STATUS_COLORS[it.status],
                    border: `1px solid ${STATUS_COLORS[it.status]}40`, borderRadius: 20,
                    padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                    transition: 'all .2s'
                  }}
                >
                  {it.status === 'متاح' ? <CheckCircle2 size={12}/> : it.status === 'مشغول' ? <Clock size={12}/> : <AlertTriangle size={12}/>}
                  {it.status}
                </button>
              </div>

              {/* Stars */}
              <StarRating value={it.rating} size={15}/>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(16,185,129,.07)', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(16,185,129,.15)' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, fontWeight: 600 }}>اليومية</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--teal)' }}>{Number(it.dailyRate).toLocaleString()} {getGlobalCurrency()}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,.03)', padding: '10px 12px', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, fontWeight: 600 }}>الخبرة</div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>{it.experience} سنوات</div>
                </div>
              </div>

              {/* Specialties tags */}
              {(it.specialties || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {it.specialties.map(s => (
                    <span key={s} style={{ background: 'rgba(245,158,11,.1)', color: 'var(--amber)', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              )}

              {/* Last project */}
              {it.lastProject && (
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={12}/> آخر موقع: <strong style={{ color: 'var(--ink)' }}>{it.lastProject}</strong>
                </div>
              )}

              {/* Notes */}
              {it.notes && (
                <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,.06)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', borderRight: '3px solid var(--amber)' }}>
                  {it.notes}
                </div>
              )}

              {/* ── ACTION FOOTER ── always visible */}
              <div style={{ display: 'flex', gap: 6, borderTop: '1px dashed var(--border)', paddingTop: 14, marginTop: 'auto', flexWrap: 'wrap' }}>
                {/* Contract button */}
                <button 
                  onClick={() => setContractWorker(it)}
                  title="صياغة عقد اتفاق فني ومشارطة لهذا الصنايعي"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: 'rgba(99,102,241,.12)', color: '#6366F1', borderRadius: 10,
                    border: '1px solid rgba(99,102,241,.25)', cursor: 'pointer', padding: '6px 10px', fontSize: 12, fontWeight: 700
                  }}
                >
                  <FileText size={14}/> عقد 📜
                </button>

                {/* Phone */}
                <a href={`tel:${it.phone}`}
                   style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                     background: 'rgba(16,185,129,.1)', color: 'var(--teal)', fontSize: 13, fontWeight: 700,
                     textDecoration: 'none', padding: '6px 0', borderRadius: 10, border: '1px solid rgba(16,185,129,.2)', minWidth: 80 }}>
                  <Phone size={14}/> {it.phone || 'اتصال'}
                </a>
                {/* WhatsApp */}
                {it.phone && (
                  <a href={`https://wa.me/2${it.phone.replace(/-/g, '')}`} target="_blank" rel="noreferrer"
                     style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                       background: 'rgba(37,211,102,.1)', color: '#25D366', borderRadius: 10,
                       border: '1px solid rgba(37,211,102,.2)', textDecoration: 'none', fontSize: 16 }}>
                    💬
                  </a>
                )}
                {/* Edit */}
                <button onClick={() => openEdit(it)}
                  style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(59,130,246,.1)', color: '#3B82F6', borderRadius: 10,
                    border: '1px solid rgba(59,130,246,.2)', cursor: 'pointer' }}>
                  <Pencil size={14}/>
                </button>
                {/* Delete with confirm */}
                {confirmDel === it.id ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => del(it.id)}
                      style={{ padding: '6px 10px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      تأكيد
                    </button>
                    <button onClick={() => setConfirmDel(null)}
                      style={{ padding: '6px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--muted)' }}>
                      <X size={13}/>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(it.id)}
                    style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(239,68,68,.1)', color: 'var(--danger)', borderRadius: 10,
                      border: '1px solid rgba(239,68,68,.2)', cursor: 'pointer' }}>
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Craftsman Contract Modal ── */}
      {contractWorker && (
        <CraftsmanContractModal 
          initialWorker={contractWorker} 
          onClose={() => setContractWorker(null)} 
        />
      )}

      {/* ── Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Wrench size={20}/> {editing ? 'تعديل بيانات الصنايعي' : 'إضافة صنايعي جديد'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}><X size={20}/></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Full name */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>الاسم الكامل *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: أبو محمد المحارجي"/>
                </div>
                {/* Trade */}
                <div className="form-group">
                  <label>المهنة / الحرفة</label>
                  <select value={form.trade} onChange={e => setForm({ ...form, trade: e.target.value })}>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* Status */}
                <div className="form-group">
                  <label>الحالة الحالية</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {WORKER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Phone */}
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="010-..."/>
                </div>
                {/* Daily rate */}
                <div className="form-group">
                  <label>أجر اليوم (ج.م)</label>
                  <input type="number" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} placeholder="0" min="0"/>
                </div>
                {/* Experience */}
                <div className="form-group">
                  <label>سنوات الخبرة</label>
                  <input type="number" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="0" min="0"/>
                </div>
                {/* Rating */}
                <div className="form-group">
                  <label>التقييم العام</label>
                  <StarRating value={form.rating} onChange={r => setForm({ ...form, rating: r })} size={26}/>
                </div>
                {/* Last project */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>آخر موقع عمل عليه</label>
                  <input type="text" value={form.lastProject || ''} onChange={e => setForm({ ...form, lastProject: e.target.value })} placeholder="مثال: تشطيب فيلا - الحي الأول"/>
                </div>
              </div>

              {/* Specialties */}
              <div className="form-group">
                <label>التخصصات والمهارات (اختياري)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={specInput} onChange={e => setSpecInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSpec()}
                    placeholder="مثال: أعمال الشانيل، المحارة الرقيقة..." style={{ flex: 1 }}/>
                  <button className="btn btn-primary" style={{ padding: '10px 16px' }} onClick={addSpec}><Plus size={16}/></button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {(form.specialties || []).map(s => (
                    <span key={s} style={{ background: 'rgba(245,158,11,.12)', color: 'var(--amber)', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setForm({ ...form, specialties: form.specialties.filter(x => x !== s) })}/>
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label>ملاحظات</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="أي معلومات مهمة عن الصنايعي..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 14, resize: 'vertical', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>
                {editing ? 'تحديث البيانات' : 'إضافة الصنايعي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────── */
export default function SuppliersTab({ projects = [], companySettings, userRole, currentUser, activeCompanyId }) {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const target = p.get('subtab') || p.get('tab');
      if (target === 'workers') return target;
    } catch {}
    return 'suppliers';
  });
  const tabs = [
    { key:'suppliers',      label:'الموردون والمواد',          shortLabel:'الموردون',        icon:Truck },
    { key:'workers',        label:'الصنايعية والعمالة',         shortLabel:'الصنايعية',       icon:Wrench },
  ];
  return (
    <div className="tab-fade suppliers-page-container" style={{ display: 'flex', flexDirection: 'column', gap:20, paddingBottom:60, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Banner */}
      <div className="panel suppliers-banner" style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 24, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div className="banner-icon-wrap" style={{ width: 44, height: 44, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={22} color="#0F172A"/>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="banner-title" style={{ margin: 0, fontFamily: 'Tajawal', fontSize: 20, color: 'var(--ink)', lineHeight: 1.3 }}>إدارة الموردين والصنايعية</h2>
            <div className="banner-sub" style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>سجل موردي الخامات والمواد وفنيي وعمالة التشطيبات والمصنعيات</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs: 2 equal columns on mobile */}
      <div className="subtabs suppliers-main-subtabs" style={{ marginBottom:0, width: '100%', boxSizing: 'border-box' }}>
        {tabs.map(t => (
          <div key={t.key} className={`subtab ${activeTab===t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <t.icon size={16}/>
            <span className="desktop-tab-label">{t.label}</span>
            <span className="mobile-tab-label">{t.shortLabel}</span>
          </div>
        ))}
      </div>

      <div className="tab-fade" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        {activeTab==='suppliers' && <SuppliersSection activeCompanyId={activeCompanyId}/>}
        {activeTab==='workers'   && <WorkersSection activeCompanyId={activeCompanyId}/>}
      </div>
    </div>
  );
}

