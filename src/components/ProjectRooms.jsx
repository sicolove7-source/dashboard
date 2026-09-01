import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Home, MessageCircle, X, Pencil, Check, Settings, Layers, Zap } from 'lucide-react';
import { todayISO } from '../utils/helpers';

// ─── Category templates per room type ──────────────────────────────────────
const CAT_ICONS = ['🧱', '🪟', '📐', '🪵', '🚿', '💡', '🎨', '🪜', '🔩', '🚪', '🪣', '🛠️', '🧹', '🏗️', '🔌', '🚽', '🪞', '🏠', '🍳', '🪴'];

const STANDARD_CATS = [
  { key: 'plaster', label: 'محارة حوائط', icon: '🧱', steps: ['طرطشة الحوائط', 'وضع البوج (الخشن)', 'ملو المحارة (الناعم)', 'تشطيب الزوايا والتسوية النهائية'] },
  { key: 'floor', label: 'تشطيبات الأرضيات', icon: '🪟', steps: ['بياض خشن للأرضية', 'فرش اللاصق (البيكادو)', 'تركيب السيراميك أو البورسلين', 'تسوية الدروز والتنظيف'] },
  { key: 'ceiling', label: 'أسقف', icon: '📐', steps: ['أعمال الجيبس بورد (الهيكل)', 'تشطيب الأسقف ومعالجة الوصلات', 'دهان الأسقف'] },
  { key: 'cladding', label: 'تجاليد حوائط', icon: '🪵', steps: ['أعمال البرايمر', 'تركيب التجاليد أو الرخام', 'تسوية الدروز بالروزيه', 'التلميع والتنظيف النهائي'] },
  { key: 'paint', label: 'دهانات', icon: '🎨', steps: ['معالجة الشقوق والفراغات', 'أول وجه أبيض', 'ثاني وجه نهائي', 'دهان التشطيب والنهاية'] },
  { key: 'elec', label: 'كهرباء', icon: '🔌', steps: ['تمديد الأسلاك والأنابيب', 'تركيب لوحة الكهرباء', 'تركيب المفاتيح والمقابس', 'اختبار وتشغيل الدوائر'] },
  { key: 'plumbing', label: 'سباكة', icon: '🚿', steps: ['تمديد مواسير المياه', 'تمديد مواسير الصرف', 'تركيب الوحدات الصحية', 'اختبار التسرب والضغط'] },
  { key: 'carpentry', label: 'نجارة وديكور', icon: '🪵', steps: ['تركيب إطارات الأبواب', 'تركيب الأبواب وإكسساراتها', 'أعمال الديكور الخشبي', 'الطلاء والتشطيب النهائي'] },
  { key: 'kitchen_units', label: 'وحدات مطبخ', icon: '🍳', steps: ['تركيب الوحدات السفلية', 'تركيب الوحدات العلوية', 'تركيب الكاونتر تاب', 'تركيب سينك وخلاط المياه'] },
];

function getCatsForType(type) {
  switch (type) {
    case 'bedroom':
      return ['plaster', 'floor', 'ceiling', 'paint', 'elec', 'carpentry'];
    case 'bathroom':
      return ['plaster', 'floor', 'cladding', 'plumbing', 'elec'];
    case 'kitchen':
      return ['plaster', 'floor', 'cladding', 'plumbing', 'elec', 'kitchen_units'];
    case 'living':
      return ['plaster', 'floor', 'ceiling', 'paint', 'elec'];
    case 'corridor':
      return ['plaster', 'floor', 'paint'];
    case 'balcony':
      return ['floor', 'cladding', 'paint'];
    default:
      return ['plaster', 'floor', 'ceiling', 'cladding'];
  }
}

// ─── Single Room Templates ────────────────────────────────────────────────
const ROOM_TEMPLATES = [
  { key: 'bedroom', icon: '🛏️', label: 'غرفة نوم', catKeys: getCatsForType('bedroom') },
  { key: 'bathroom', icon: '🚿', label: 'حمام', catKeys: getCatsForType('bathroom') },
  { key: 'kitchen', icon: '🍳', label: 'مطبخ', catKeys: getCatsForType('kitchen') },
  { key: 'living', icon: '🛋️', label: 'صالة / معيشة', catKeys: getCatsForType('living') },
  { key: 'corridor', icon: '🚶', label: 'ممر / مدخل', catKeys: getCatsForType('corridor') },
  { key: 'balcony', icon: '🌿', label: 'تراس / بلكونة', catKeys: getCatsForType('balcony') },
  { key: 'custom', icon: '✏️', label: 'مخصص (فارغ)', catKeys: [] },
];

// ─── Full Project Templates ──────────────────────────────────────────────
const PROJECT_TEMPLATES = [
  {
    key: 'apt2', icon: '🏢', label: 'شقة 2 غرفة نوم',
    rooms: [
      { name: 'غرفة النوم الرئيسية', type: 'bedroom' },
      { name: 'غرفة النوم الثانية', type: 'bedroom' },
      { name: 'الصالة والمعيشة', type: 'living' },
      { name: 'الحمام الرئيسي', type: 'bathroom' },
      { name: 'حمام الضيوف', type: 'bathroom' },
      { name: 'المطبخ', type: 'kitchen' },
      { name: 'المدخل والممر', type: 'corridor' },
    ],
  },
  {
    key: 'apt3', icon: '🏢', label: 'شقة 3 غرف نوم',
    rooms: [
      { name: 'غرفة النوم الرئيسية', type: 'bedroom' },
      { name: 'غرفة النوم الثانية', type: 'bedroom' },
      { name: 'غرفة النوم الثالثة', type: 'bedroom' },
      { name: 'الصالة والمعيشة', type: 'living' },
      { name: 'الحمام الرئيسي', type: 'bathroom' },
      { name: 'حمام الضيوف', type: 'bathroom' },
      { name: 'المطبخ', type: 'kitchen' },
      { name: 'المدخل والممر', type: 'corridor' },
    ],
  },
  {
    key: 'villa', icon: '🏡', label: 'فيلا / دوبلكس',
    rooms: [
      { name: 'غرفة النوم الرئيسية', type: 'bedroom' },
      { name: 'غرفة النوم الثانية', type: 'bedroom' },
      { name: 'غرفة النوم الثالثة', type: 'bedroom' },
      { name: 'غرفة الأطفال', type: 'bedroom' },
      { name: 'الصالة الرئيسية', type: 'living' },
      { name: 'صالة الطعام', type: 'living' },
      { name: 'الحمام الرئيسي', type: 'bathroom' },
      { name: 'حمام الضيوف', type: 'bathroom' },
      { name: 'حمام الأطفال', type: 'bathroom' },
      { name: 'المطبخ', type: 'kitchen' },
      { name: 'المدخل', type: 'corridor' },
      { name: 'التراس', type: 'balcony' },
    ],
  },
  {
    key: 'office', icon: '🏢', label: 'مكتب إداري',
    rooms: [
      { name: 'المكتب الرئيسي', type: 'living' },
      { name: 'قاعة الاجتماعات', type: 'living' },
      { name: 'الاستقبال والمدخل', type: 'corridor' },
      { name: 'دورة المياه', type: 'bathroom' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label: 'لم يبدأ',      color: 'var(--muted)',  bg: 'rgba(0,0,0,0.05)',     icon: '⬜' },
  in_progress: { label: 'جاري التنفيذ', color: 'var(--amber)',  bg: 'rgba(245,158,11,0.1)', icon: '⏳' },
  done:        { label: 'مكتمل',        color: 'var(--teal)',   bg: 'rgba(16,185,129,0.1)', icon: '✅' },
};

function nextStatus(s) { return s === 'pending' ? 'in_progress' : s === 'in_progress' ? 'done' : 'pending'; }

function buildCatsFromKeys(catKeys, ts, ri) {
  return catKeys.map((key, ci) => {
    const def = STANDARD_CATS.find(c => c.key === key) || { key, label: key, icon: '🛠️', steps: [] };
    return {
      key: def.key + '-' + ts + ri,
      label: def.label, icon: def.icon,
      steps: def.steps.map((s, si) => ({ id: `s${ts}${ri}${ci}${si}`, label: s, status: 'pending' })),
    };
  });
}

function buildRoom(name, catKeys = []) {
  const ts = Date.now();
  const ri = Math.random().toString(36).slice(2, 6);
  return {
    id: 'room-' + ts + ri, name, createdAt: todayISO(),
    categories: buildCatsFromKeys(catKeys.length > 0 ? catKeys : getCatsForType('default'), ts, ri),
  };
}

function buildFromTemplate(tpl) {
  return tpl.rooms.map((r, ri) => {
    const ts = Date.now() + ri;
    const riKey = Math.random().toString(36).slice(2, 6);
    return {
      id: 'room-' + ts + riKey, name: r.name, createdAt: todayISO(),
      categories: buildCatsFromKeys(getCatsForType(r.type), ts, riKey),
    };
  });
}

function roomProgress(room) {
  let t = 0, d = 0;
  room.categories.forEach(c => c.steps.forEach(s => { t++; if (s.status === 'done') d++; }));
  return t === 0 ? 0 : Math.round(d / t * 100);
}

function catProgress(cat) {
  const t = cat.steps.length, d = cat.steps.filter(s => s.status === 'done').length;
  return { done: d, total: t, pct: t === 0 ? 0 : Math.round(d / t * 100) };
}

function MiniBar({ pct, color = 'var(--teal)' }) {
  return (
    <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function ProjectRooms({ project, onUpdate }) {
  const rooms = project.rooms || [];
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [expandedCat, setExpandedCat] = useState({});
  const [newStepInputs, setNewStepInputs] = useState({});
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null);
  const [addCatForRoom, setAddCatForRoom] = useState(null);
  const [newCat, setNewCat] = useState({ label: '', icon: '🛠️' });
  const [editingCat, setEditingCat] = useState(null);

  // Add mode: 'none' | 'single' | 'project-tpl'
  const [addMode, setAddMode] = useState('none');
  const [selectedRoomTpl, setSelectedRoomTpl] = useState(null);
  const [customRoomName, setCustomRoomName] = useState('');

  function save(r) { onUpdate({ rooms: r }); }

  // ── Add single room from template ────────────────────────────────────────
  function addSingleRoom(e) {
    e.preventDefault();
    if (!selectedRoomTpl) return;
    const tpl = ROOM_TEMPLATES.find(t => t.key === selectedRoomTpl);
    const name = customRoomName.trim() || tpl.label;
    const catKeys = tpl.catKeys;
    const room = buildRoom(name, catKeys);
    save([...rooms, room]);
    setExpandedRoom(room.id);
    setAddMode('none');
    setSelectedRoomTpl(null);
    setCustomRoomName('');
  }

  // ── Apply full project template ──────────────────────────────────────────
  function applyProjectTemplate(tplKey) {
    const tpl = PROJECT_TEMPLATES.find(t => t.key === tplKey);
    if (!tpl) return;
    if (rooms.length > 0 && !window.confirm('هذا سيضيف ' + tpl.rooms.length + ' غرفة للقائمة الحالية. هل تريد المتابعة؟')) return;
    const newRooms = buildFromTemplate(tpl);
    save([...rooms, ...newRooms]);
    setAddMode('none');
  }

  // ── Category operations ──────────────────────────────────────────────────
  function addCategory(e, roomId) {
    e.preventDefault();
    if (!newCat.label.trim()) return;
    const obj = { key: 'cat-' + Date.now(), label: newCat.label.trim(), icon: newCat.icon, steps: [] };
    save(rooms.map(r => r.id !== roomId ? r : ({ ...r, categories: [...r.categories, obj] })));
    setNewCat({ label: '', icon: '🛠️' });
    setAddCatForRoom(null);
    setExpandedCat(p => ({ ...p, [roomId + '-' + obj.key]: true }));
  }

  function deleteCategory(roomId, catKey) {
    save(rooms.map(r => r.id !== roomId ? r : ({ ...r, categories: r.categories.filter(c => c.key !== catKey) })));
    setConfirmDeleteCat(null);
    setExpandedCat(p => ({ ...p, [roomId + '-' + catKey]: false }));
  }

  function saveEditCat() {
    if (!editingCat || !editingCat.label.trim()) return;
    save(rooms.map(r => r.id !== editingCat.roomId ? r : ({
      ...r, categories: r.categories.map(c => c.key !== editingCat.catKey ? c : ({ ...c, label: editingCat.label.trim(), icon: editingCat.icon }))
    })));
    setEditingCat(null);
  }

  function deleteRoom(id) {
    save(rooms.filter(r => r.id !== id));
    setConfirmDeleteRoom(null);
    if (expandedRoom === id) setExpandedRoom(null);
  }

  function cycleStep(roomId, catKey, stepId) {
    save(rooms.map(r => r.id !== roomId ? r : ({
      ...r, categories: r.categories.map(c => c.key !== catKey ? c : ({
        ...c, steps: c.steps.map(s => s.id === stepId ? { ...s, status: nextStatus(s.status) } : s)
      }))
    })));
  }

  function deleteStep(roomId, catKey, stepId) {
    save(rooms.map(r => r.id !== roomId ? r : ({
      ...r, categories: r.categories.map(c => c.key !== catKey ? c : ({ ...c, steps: c.steps.filter(s => s.id !== stepId) }))
    })));
  }

  function addStep(e, roomId, catKey) {
    e.preventDefault();
    const mk = roomId + '-' + catKey;
    const label = (newStepInputs[mk] || '').trim();
    if (!label) return;
    save(rooms.map(r => r.id !== roomId ? r : ({
      ...r, categories: r.categories.map(c => c.key !== catKey ? c : ({
        ...c, steps: [...c.steps, { id: 's' + Date.now(), label, status: 'pending' }]
      }))
    })));
    setNewStepInputs(p => ({ ...p, [mk]: '' }));
  }

  function shareWA() {
    if (!rooms.length) { alert('لا توجد أحياز!'); return; }
    let t = '📋 *تقرير - ' + project.name + '*\n\n';
    rooms.forEach(r => {
      t += '🏠 *' + r.name + '* — ' + roomProgress(r) + '% مكتمل\n';
      r.categories.forEach(c => {
        const { done, total } = catProgress(c);
        t += '  ' + c.icon + ' ' + c.label + ' (' + done + '/' + total + ')\n';
        c.steps.forEach(s => { t += '    ' + STATUS_CONFIG[s.status].icon + ' ' + s.label + '\n'; });
      });
      t += '\n';
    });
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(t), '_blank');
  }

  const totalPct = rooms.length === 0 ? 0 : Math.round(rooms.reduce((s, r) => s + roomProgress(r), 0) / rooms.length);

  return (
    <div className="grid" style={{ gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'conic-gradient(var(--teal) ' + (totalPct * 3.6) + 'deg, rgba(0,0,0,0.08) 0deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'var(--teal)' }}>{totalPct}%</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>تتبع الأحياز والغرف <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>({rooms.length} حيز)</span></div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>تتبع تفصيلي لخطوات التشطيب في كل غرفة بالمشروع</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }} onClick={shareWA}><MessageCircle size={16} /> واتساب</button>
          {addMode === 'none' && (
            <>
              <button className="btn btn-primary" onClick={() => setAddMode('single')}><Plus size={16} /> إضافة حيز</button>
              <button className="btn" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }} onClick={() => setAddMode('project-tpl')}><Zap size={16} /> قالب مشروع كامل</button>
            </>
          )}
        </div>
      </div>

      {/* ── Add Single Room ─────────────────────────────────────────────── */}
      {addMode === 'single' && (
        <div className="panel" style={{ border: '1px dashed var(--teal)', background: 'rgba(16,185,129,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Home size={18} color="var(--teal)" /> إضافة حيز — اختر القالب</h4>
            <button className="icon-btn" onClick={() => { setAddMode('none'); setSelectedRoomTpl(null); setCustomRoomName(''); }}><X size={18} /></button>
          </div>

          {/* Template picker */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {ROOM_TEMPLATES.map(tpl => (
              <div key={tpl.key}
                onClick={() => setSelectedRoomTpl(tpl.key)}
                style={{ flex: '1 1 110px', padding: '12px 10px', borderRadius: 10, textAlign: 'center', cursor: 'pointer', border: selectedRoomTpl === tpl.key ? '2px solid var(--teal)' : '1px solid var(--border)', background: selectedRoomTpl === tpl.key ? 'rgba(16,185,129,0.08)' : 'var(--bg)', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{tpl.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{tpl.label}</div>
                {tpl.catKeys.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{tpl.catKeys.length} فئات</div>
                )}
              </div>
            ))}
          </div>

          {/* Show included categories preview */}
          {selectedRoomTpl && selectedRoomTpl !== 'custom' && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>الفئات المضمنة:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(ROOM_TEMPLATES.find(t => t.key === selectedRoomTpl)?.catKeys || []).map(key => {
                  const cat = STANDARD_CATS.find(c => c.key === key);
                  return cat ? (
                    <span key={key} style={{ fontSize: 12, background: 'var(--card)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 99, color: 'var(--ink)', fontWeight: 600 }}>
                      {cat.icon} {cat.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Room name input + submit */}
          {selectedRoomTpl && (
            <form onSubmit={addSingleRoom} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                <label>اسم الحيز</label>
                <input
                  autoFocus
                  value={customRoomName}
                  onChange={e => setCustomRoomName(e.target.value)}
                  placeholder={ROOM_TEMPLATES.find(t => t.key === selectedRoomTpl)?.label + ' (الاسم الافتراضي)'}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}><Plus size={16} /> إضافة</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setAddMode('none'); setSelectedRoomTpl(null); setCustomRoomName(''); }}>إلغاء</button>
            </form>
          )}
        </div>
      )}

      {/* ── Full Project Template ────────────────────────────────────────── */}
      {addMode === 'project-tpl' && (
        <div className="panel" style={{ border: '1px dashed #3B82F6', background: 'rgba(59,130,246,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#3B82F6' }}><Zap size={18} /> تطبيق قالب مشروع كامل</h4>
            <button className="icon-btn" onClick={() => setAddMode('none')}><X size={18} /></button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>اختر نوع المشروع وسيتم إضافة جميع الغرف المناسبة دفعة واحدة مع فئات العمل الخاصة بكل غرفة.</p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {PROJECT_TEMPLATES.map(tpl => (
              <div key={tpl.key}
                onClick={() => applyProjectTemplate(tpl.key)}
                style={{ flex: '1 1 180px', padding: '20px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)'; }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{tpl.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>{tpl.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tpl.rooms.length} غرفة • {tpl.rooms.reduce((acc, r) => acc + getCatsForType(r.type).length, 0)} فئة عمل</div>
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                  {tpl.rooms.slice(0, 5).map((r, i) => (
                    <span key={i} style={{ fontSize: 10, background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 99, color: 'var(--muted)' }}>{r.name}</span>
                  ))}
                  {tpl.rooms.length > 5 && <span style={{ fontSize: 10, color: 'var(--muted)' }}>+{tpl.rooms.length - 5} أخرى</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────── */}
      {rooms.length === 0 && addMode === 'none' && (
        <div className="panel" style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <Home size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>لا توجد أحياز مضافة بعد</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>ابدأ بإضافة حيز يدوياً أو استخدم قالب جاهز</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setAddMode('single')}><Plus size={16} /> إضافة حيز</button>
            <button className="btn" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }} onClick={() => setAddMode('project-tpl')}><Zap size={16} /> قالب جاهز</button>
          </div>
        </div>
      )}

      {/* ── Rooms ────────────────────────────────────────────────────────── */}
      {rooms.map(room => {
        const pct = roomProgress(room);
        const isOpen = expandedRoom === room.id;
        const pctColor = pct === 100 ? 'var(--teal)' : pct > 50 ? 'var(--amber)' : 'var(--primary)';
        return (
          <div key={room.id} className="panel" style={{ border: pct === 100 ? '1px solid var(--teal)' : '1px solid var(--border)', background: pct === 100 ? 'rgba(16,185,129,0.04)' : 'var(--card)', transition: 'all 0.3s ease' }}>

            {/* Room Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setExpandedRoom(isOpen ? null : room.id)}>
              <span style={{ fontSize: 24 }}>🏠</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>{room.name}</span>
                  {pct === 100 && <span style={{ fontSize: 12, background: 'rgba(16,185,129,0.15)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>مكتمل 🎉</span>}
                  <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>{room.categories.length} فئة</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MiniBar pct={pct} color={pctColor} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: pctColor, minWidth: 36 }}>{pct}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {confirmDeleteRoom === room.id ? (
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => deleteRoom(room.id)}>تأكيد الحذف</button>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setConfirmDeleteRoom(null)}>إلغاء</button>
                  </div>
                ) : (
                  <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setConfirmDeleteRoom(room.id); }}><Trash2 size={15} /></button>
                )}
                {isOpen ? <ChevronDown size={20} color="var(--teal)" /> : <ChevronRight size={20} color="var(--muted)" />}
              </div>
            </div>

            {/* Expanded */}
            {isOpen && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Category Cards */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {room.categories.map(cat => {
                    const { done, total, pct: cp } = catProgress(cat);
                    const cc = cp === 100 ? 'var(--teal)' : cp > 0 ? 'var(--amber)' : 'var(--muted)';
                    const mk = room.id + '-' + cat.key;
                    return (
                      <div key={cat.key}
                        style={{ flex: '1 1 110px', padding: '10px 12px', borderRadius: 10, background: expandedCat[mk] ? 'rgba(16,185,129,0.07)' : 'var(--bg)', border: expandedCat[mk] ? '1px solid var(--teal)' : '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => setExpandedCat(p => ({ ...p, [mk]: !p[mk] }))}>
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{cat.icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, lineHeight: 1.3 }}>{cat.label}</div>
                        <MiniBar pct={cp} color={cc} />
                        <div style={{ fontSize: 11, color: cc, fontWeight: 700, marginTop: 4 }}>{done}/{total}</div>
                      </div>
                    );
                  })}
                  {/* + Add Category */}
                  <div style={{ flex: '1 1 110px', padding: '10px 12px', borderRadius: 10, background: 'var(--bg)', border: '1px dashed var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 80, color: 'var(--muted)', transition: 'all 0.2s' }}
                    onClick={() => { setAddCatForRoom(room.id); setNewCat({ label: '', icon: '🛠️' }); }}>
                    <Plus size={20} />
                    <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center' }}>إضافة فئة</span>
                  </div>
                </div>

                {/* Add Category Form */}
                {addCatForRoom === room.id && (
                  <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--teal)', borderRadius: 10, padding: 16 }}>
                    <h5 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={14} color="var(--teal)" /> إضافة فئة عمل مخصصة</h5>
                    <form onSubmit={e => addCategory(e, room.id)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div className="form-field" style={{ marginBottom: 0 }}>
                        <label>الأيقونة</label>
                        <select value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 20, background: 'var(--card)' }}>
                          {CAT_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                        </select>
                      </div>
                      <div className="form-field" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                        <label>اسم الفئة</label>
                        <input required autoFocus value={newCat.label} onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))} placeholder="مثال: كهرباء، سباكة، دهانات..." />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}><Plus size={14} /> إضافة</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setAddCatForRoom(null)}>إلغاء</button>
                    </form>
                  </div>
                )}

                {/* Expanded Category Detail */}
                {room.categories.map(cat => {
                  const mk = room.id + '-' + cat.key;
                  if (!expandedCat[mk]) return null;
                  const { done, total } = catProgress(cat);
                  const isEditingThis = editingCat && editingCat.roomId === room.id && editingCat.catKey === cat.key;
                  const isConfirmDel = confirmDeleteCat && confirmDeleteCat.roomId === room.id && confirmDeleteCat.catKey === cat.key;
                  return (
                    <div key={cat.key} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                        {isEditingThis ? (
                          <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                            <select value={editingCat.icon} onChange={e => setEditingCat(p => ({ ...p, icon: e.target.value }))} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 18, background: 'var(--card)' }}>
                              {CAT_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                            </select>
                            <input autoFocus value={editingCat.label} onChange={e => setEditingCat(p => ({ ...p, label: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') saveEditCat(); if (e.key === 'Escape') setEditingCat(null); }} style={{ flex: 1, minWidth: 140, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--teal)', fontWeight: 700, fontSize: 14 }} />
                            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={saveEditCat}><Check size={14} /> حفظ</button>
                            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setEditingCat(null)}>إلغاء</button>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontSize: 20, cursor: 'pointer' }} onClick={() => setExpandedCat(p => ({ ...p, [mk]: false }))}>{cat.icon}</span>
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedCat(p => ({ ...p, [mk]: false }))}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{cat.label}</span>
                              <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 8 }}> — {done} من {total} مكتمل</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <button className="icon-btn" style={{ padding: 6 }} title="تعديل اسم الفئة" onClick={e => { e.stopPropagation(); setEditingCat({ roomId: room.id, catKey: cat.key, label: cat.label, icon: cat.icon }); }}><Pencil size={13} /></button>
                              {isConfirmDel ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => deleteCategory(room.id, cat.key)}>حذف</button>
                                  <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setConfirmDeleteCat(null)}>إلغاء</button>
                                </div>
                              ) : (
                                <button className="icon-btn" style={{ padding: 6, color: 'var(--danger)' }} title="حذف الفئة" onClick={e => { e.stopPropagation(); setConfirmDeleteCat({ roomId: room.id, catKey: cat.key }); }}><Trash2 size={13} /></button>
                              )}
                              <ChevronDown size={16} color="var(--teal)" style={{ cursor: 'pointer' }} onClick={() => setExpandedCat(p => ({ ...p, [mk]: false }))} />
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cat.steps.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>لا توجد خطوات. أضف خطوة جديدة أدناه.</div>}
                        {cat.steps.map(step => {
                          const cfg = STATUS_CONFIG[step.status];
                          return (
                            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: cfg.bg, border: '1px solid rgba(0,0,0,0.06)', transition: 'all 0.2s' }}>
                              <button type="button" onClick={() => cycleStep(room.id, cat.key, step.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }} title="اضغط لتغيير الحالة">{cfg.icon}</button>
                              <span style={{ flex: 1, fontSize: 14, fontWeight: step.status === 'done' ? 500 : 600, color: step.status === 'done' ? 'var(--muted)' : 'var(--ink)', textDecoration: step.status === 'done' ? 'line-through' : 'none' }}>{step.label}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 99 }}>{cfg.label}</span>
                              <button type="button" className="icon-btn" style={{ color: 'var(--danger)', padding: 4 }} onClick={() => deleteStep(room.id, cat.key, step.id)}><X size={14} /></button>
                            </div>
                          );
                        })}
                        <form onSubmit={e => addStep(e, room.id, cat.key)} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <input placeholder={'إضافة خطوة لـ ' + cat.label + '...'} value={newStepInputs[mk] || ''} onChange={e => setNewStepInputs(p => ({ ...p, [mk]: e.target.value }))} style={{ flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 6, border: '1px dashed var(--border)', background: 'var(--card)' }} />
                          <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}><Plus size={14} /> إضافة</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
