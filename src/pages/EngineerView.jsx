import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, Plus, Trash2, AlertTriangle, Camera, Image, Clock,
  FileText, ArrowRight, BarChart3, X, Save, Target, ClipboardList
} from 'lucide-react';
import { STAGES } from '../utils/constants';
import { fmtDate, todayISO } from '../utils/helpers';
import VoiceInput from '../components/VoiceInput';
import InteractiveGantt from '../components/InteractiveGantt';

/* helpers */
const SUBTABS = [
  { key: 'today',    label: 'يومية اليوم',    icon: ClipboardList },
  { key: 'plan',     label: 'خطة العمل',      icon: Target },
  { key: 'diary',    label: 'سجل اليوميات',   icon: CalendarDays },
  { key: 'photos',   label: 'صور الموقع',     icon: Image },
  { key: 'schedule', label: 'الجدول الزمني',  icon: BarChart3 },
  { key: 'overview', label: 'بيانات المشروع', icon: FileText },
];
const STATUS_META = {
  on_track: { label: 'على المسار',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  at_risk:  { label: 'يحتاج متابعة', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  delayed:  { label: 'متأخر',         color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};
function readImg(file, cb) {
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { alert('الصورة اكبر من 3 ميجا'); return; }
  const r = new FileReader();
  r.onload = e => cb(e.target.result);
  r.readAsDataURL(file);
}

/* ═══════════ MAIN ═══════════ */
export default function EngineerView({ project, currentUser, onUpdate, onBack }) {
  const [sub, setSub] = useState('today');
  const sm = STATUS_META[project.status] || STATUS_META.on_track;

  return (
    <div className="tab-fade" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* header */}
      <div style={{
        background: 'var(--card)', borderRadius: 16, padding: '20px 24px',
        border: '1px solid var(--border)', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
      }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none',
          border: 'none', color: 'var(--muted)', cursor: 'pointer',
          fontFamily: "'Cairo'", fontSize: 13
        }}><ArrowRight size={16} /> العودة</button>

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>{project.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {fmtDate(project.startDate)} &rarr; {fmtDate(project.dueDate)} &nbsp;|&nbsp; {currentUser?.name || project.engineer}
          </div>
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 99, fontWeight: 700, fontSize: 13, background: sm.bg, color: sm.color, border: '1px solid ' + sm.color + '44' }}>{sm.label}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>الانجاز</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>{project.progress}%</div>
        </div>
      </div>

      {/* tabs */}
      <div className="subtabs" style={{ marginBottom: 20 }}>
        {SUBTABS.map(t => (
          <div key={t.key} className={'subtab' + (sub === t.key ? ' active' : '')} onClick={() => setSub(t.key)}>
            <t.icon size={16} /> {t.label}
          </div>
        ))}
      </div>

      <div className="tab-fade">
        {sub === 'today'    && <TodayPanel    project={project} currentUser={currentUser} onUpdate={onUpdate} />}
        {sub === 'plan'     && <PlanPanel     project={project} onUpdate={onUpdate} />}
        {sub === 'diary'    && <DiaryPanel    project={project} />}
        {sub === 'photos'   && <PhotosPanel   project={project} onUpdate={onUpdate} />}
        {sub === 'schedule' && <SchedulePanel project={project} onUpdate={onUpdate} />}
        {sub === 'overview' && <OverviewPanel project={project} />}
      </div>
    </div>
  );
}

/* ═══════════ 1. يومية اليوم ═══════════ */
function TodayPanel({ project, currentUser, onUpdate }) {
  const logs = project.dailyLogs || [];
  const today = todayISO();
  const todayLog = logs.find(l => l.date === today);

  const [form, setForm] = useState({
    date: today, author: currentUser?.name || project.engineer || '',
    work: '', issues: '', workers: 5, photos: []
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const tl = (project.dailyLogs || []).find(l => l.date === today);
    setForm(f => ({
      ...f,
      author: currentUser?.name || project.engineer || '',
      work: tl?.work || '', issues: tl?.issues || '',
      workers: tl?.workers || 5, photos: tl?.photos || []
    }));
  }, [project.id]);

  function handlePhoto(e) {
    const file = e.target.files[0];
    readImg(file, src => setForm(f => ({ ...f, photos: [...f.photos, { src, caption: '', date: today }] })));
  }
  function removePhoto(i) {
    setForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }));
  }
  function handleSave(e) {
    e.preventDefault();
    if (!form.work.trim()) return;
    setSaving(true);
    const newLog = { ...form, id: todayLog?.id || ('d' + Date.now()), workers: Number(form.workers) };
    onUpdate({ dailyLogs: [newLog, ...logs.filter(l => l.date !== today)] });
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 400);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <ClipboardList size={18} color="#6366F1" />
          تقرير اليوم &mdash; {fmtDate(today)}
          {todayLog && <span style={{ fontSize: 12, background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>تم التسجيل</span>}
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* الاعمال */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 14 }}>
              الاعمال المنفذة اليوم <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                required value={form.work}
                onChange={e => setForm(f => ({ ...f, work: e.target.value }))}
                placeholder="مثال: محارة حوائط الصالة، توريد بلاط المطبخ..."
                style={{
                  flex: 1, minHeight: 100, padding: '10px 14px',
                  border: '1.5px solid var(--border)', borderRadius: 10,
                  background: 'transparent', color: 'var(--ink)',
                  fontFamily: "'Cairo'", fontSize: 14, resize: 'vertical'
                }}
              />
              <VoiceInput onResult={t => setForm(f => ({ ...f, work: f.work + (f.work ? ' ' : '') + t }))} />
            </div>
          </div>

          {/* العمالة والعوائق */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 14 }}>عدد العمالة بالموقع</label>
              <input type="number" min="0" value={form.workers}
                onChange={e => setForm(f => ({ ...f, workers: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'transparent', color: 'var(--ink)', fontFamily: "'Cairo'", fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 14 }}>عوائق او مشاكل</label>
              <input value={form.issues}
                onChange={e => setForm(f => ({ ...f, issues: e.target.value }))}
                placeholder="تاخر توريد، غياب عمالة..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'transparent', color: 'var(--ink)', fontFamily: "'Cairo'", fontSize: 14 }}
              />
            </div>
          </div>

          {/* الصور */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 14 }}>صور من الموقع</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {form.photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '2px solid var(--border)' }}>
                  <img src={p.src} alt="موقع" style={{ width: 80, height: 80, objectFit: 'cover', display: 'block' }} />
                  <button type="button" onClick={() => removePhoto(i)} style={{
                    position: 'absolute', top: 2, left: 2, width: 20, height: 20,
                    background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: '50%',
                    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}><X size={12} /></button>
                </div>
              ))}
              <label style={{
                width: 80, height: 80, borderRadius: 8, border: '2px dashed var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--muted)', fontSize: 11, gap: 4
              }}>
                <Camera size={20} />
                <span>اضف صورة</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{
            alignSelf: 'flex-end', padding: '12px 28px',
            background: saved ? '#10B981' : 'linear-gradient(135deg,#6366F1,#3B82F6)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontFamily: "'Cairo'", fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s'
          }}>
            <Save size={16} />
            {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ!' : 'حفظ التقرير'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════ 2. خطة العمل ═══════════ */
function PlanPanel({ project, onUpdate }) {
  const plan = project.workPlan || { tomorrow: [], thisWeek: [] };
  const [tmrInput, setTmrInput] = useState('');
  const [weekInput, setWeekInput] = useState('');

  function addItem(list, text, setInput) {
    if (!text.trim()) return;
    const updated = { ...plan, [list]: [...(plan[list] || []), { id: list[0] + Date.now(), text: text.trim(), done: false }] };
    onUpdate({ workPlan: updated });
    setInput('');
  }
  function toggleItem(list, id) {
    const updated = { ...plan, [list]: plan[list].map(i => i.id === id ? { ...i, done: !i.done } : i) };
    onUpdate({ workPlan: updated });
  }
  function removeItem(list, id) {
    const updated = { ...plan, [list]: plan[list].filter(i => i.id !== id) };
    onUpdate({ workPlan: updated });
  }

  const Col = ({ listKey, label, color, emoji, val, setVal }) => (
    <div className="panel">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color }}>
        <Target size={18} /> {emoji} {label}
        <span style={{ marginRight: 'auto', fontSize: 12, background: color + '18', color, padding: '2px 8px', borderRadius: 99 }}>
          {(plan[listKey] || []).filter(i => i.done).length}/{(plan[listKey] || []).length} منجز
        </span>
      </h3>
      <form onSubmit={e => { e.preventDefault(); addItem(listKey, val, setVal); }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="اضف مهمة..."
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'transparent', color: 'var(--ink)', fontFamily: "'Cairo'", fontSize: 14 }}
        />
        <button type="submit" style={{ padding: '10px 16px', background: color, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}><Plus size={16} /></button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(plan[listKey] || []).length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0', fontSize: 13 }}>لا توجد مهام بعد</div>}
        {(plan[listKey] || []).map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
            background: item.done ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.02)',
            border: '1px solid ' + (item.done ? 'rgba(16,185,129,0.2)' : 'var(--border)')
          }}>
            <button onClick={() => toggleItem(listKey, item.id)} style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: item.done ? '#10B981' : 'transparent',
              border: '2px solid ' + (item.done ? '#10B981' : '#94A3B8'),
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {item.done && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>}
            </button>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.6 : 1 }}>{item.text}</span>
            <button onClick={() => removeItem(listKey, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Col listKey="tomorrow" label="مهام بكرة" emoji="🌅" color="#6366F1" val={tmrInput} setVal={setTmrInput} />
      <Col listKey="thisWeek" label="مهام الاسبوع" emoji="📅" color="#F59E0B" val={weekInput} setVal={setWeekInput} />
    </div>
  );
}

/* ═══════════ 3. سجل اليوميات ═══════════ */
function DiaryPanel({ project }) {
  const logs = (project.dailyLogs || []).slice().sort((a, b) => a.date < b.date ? 1 : -1);
  return (
    <div className="panel">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <CalendarDays size={18} color="#3B82F6" /> سجل اليوميات ({logs.length})
      </h3>
      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
          <CalendarDays size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
          <div>سجل يومية اليوم من تبويب يومية اليوم</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {logs.map(l => (
            <div key={l.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', background: 'var(--card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1', padding: '4px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>{fmtDate(l.date)}</div>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{l.author} &bull; <span style={{ color: '#10B981', fontWeight: 700 }}>{l.workers} عامل</span></span>
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.7 }}>{l.work}</div>
              {l.issues && l.issues !== 'لا يوجد' && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: 13, color: '#92400E', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} color="#D97706" /> {l.issues}
                </div>
              )}
              {l.photos && l.photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {l.photos.map((p, i) => <img key={i} src={p.src} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════ 4. صور الموقع ═══════════ */
function PhotosPanel({ project, onUpdate }) {
  const photos = project.sitePhotos || [];
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    let done = 0;
    const newPhotos = [];
    files.forEach(file => {
      readImg(file, src => {
        newPhotos.push({ id: 'p' + Date.now() + Math.random(), src, caption, date: todayISO() });
        done++;
        if (done === files.length) { onUpdate({ sitePhotos: [...photos, ...newPhotos] }); setUploading(false); setCaption(''); }
      });
    });
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><Camera size={18} color="#F59E0B" /> رفع صور الموقع</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="وصف الصور (اختياري)"
            style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'transparent', color: 'var(--ink)', fontFamily: "'Cairo'", fontSize: 14 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#fff', borderRadius: 10, cursor: 'pointer', fontFamily: "'Cairo'", fontWeight: 700, fontSize: 14 }}>
            <Camera size={16} /> {uploading ? 'جاري الرفع...' : 'اختر صور'}
            <input type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>
      <div className="panel">
        <h3 style={{ marginBottom: 16 }}>معرض صور الموقع ({photos.length})</h3>
        {photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}><Image size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} /><div>لا توجد صور بعد</div></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {photos.slice().reverse().map(p => (
              <div key={p.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={p.src} alt={p.caption || 'موقع'} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 8px', background: 'var(--card)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDate(p.date)}</div>
                  {p.caption && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{p.caption}</div>}
                </div>
                <button onClick={() => onUpdate({ sitePhotos: photos.filter(x => x.id !== p.id) })} style={{
                  position: 'absolute', top: 6, left: 6, width: 24, height: 24, background: 'rgba(239,68,68,0.85)',
                  border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ 5. الجدول الزمني ═══════════ */
function SchedulePanel({ project, onUpdate }) {
  const tasks = useMemo(() => {
    const raw = project.tasks || [];
    if (!raw.length) return STAGES.map(s => ({ key: s.key, label: s.label, weight: s.weight, status: 'pending', startDate: '', endDate: '' }));
    return raw.map((t, i) => ({
      ...t, key: t.key || t.stage || ('task-' + i), label: t.label || t.title || '',
      startDate: t.startDate || t.start || '', endDate: t.endDate || t.end || '',
      weight: t.weight != null ? Number(t.weight) : 10, status: t.status || 'pending',
    }));
  }, [project.tasks]);

  const STATUS_CFG = {
    pending:     { label: 'لم يبدا',       color: '#94A3B8' },
    in_progress: { label: 'جاري التنفيذ', color: '#F59E0B' },
    done:        { label: 'مكتمل',         color: '#10B981' },
    delayed:     { label: 'متاخر',          color: '#EF4444' },
  };
  function resolveStatus(t) {
    if (t.status === 'done') return 'done';
    if (t.endDate) { const td = new Date(); td.setHours(0,0,0,0); const e = new Date(t.endDate); e.setHours(0,0,0,0); if (e < td) return 'delayed'; }
    return t.status || 'pending';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={18} color="#6366F1" /> مراحل المشروع</h3>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>{project.progress}%</div>
        </div>
        <div style={{ height: 10, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: project.progress + '%', background: 'linear-gradient(90deg,#6366F1,#10B981)', borderRadius: 99, transition: 'width 0.6s' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(t => {
            const st = resolveStatus(t); const cfg = STATUS_CFG[st] || STATUS_CFG.pending;
            return (
              <div key={t.key} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: st === 'done' ? 'rgba(16,185,129,0.05)' : st === 'delayed' ? 'rgba(239,68,68,0.05)' : 'transparent'
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: st === 'in_progress' ? 700 : 500, color: 'var(--ink)' }}>{t.label}</span>
                {t.startDate && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(t.startDate)}</span>}
                {t.endDate && <span style={{ fontSize: 12, color: 'var(--muted)' }}>&larr; {fmtDate(t.endDate)}</span>}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.color + '18', color: cfg.color }}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel">
        <h3 style={{ marginBottom: 16 }}>الجانت التفاعلي</h3>
        <InteractiveGantt project={project} onUpdate={onUpdate} readOnly={false} />
      </div>
    </div>
  );
}

/* ═══════════ 6. بيانات المشروع ═══════════ */
function OverviewPanel({ project }) {
  let cum = 0;
  return (
    <div className="panel">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}><FileText size={18} /> بيانات المشروع</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'اسم المشروع', value: project.name },
          { label: 'العميل', value: project.client },
          { label: 'المنطقة', value: project.area },
          { label: 'النوع', value: project.type },
          { label: 'تاريخ البداية', value: fmtDate(project.startDate) },
          { label: 'تاريخ التسليم', value: fmtDate(project.dueDate) },
        ].map(f => (
          <div key={f.label} style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{f.value || '...'}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>مراحل العمل</div>
        {STAGES.map(s => {
          const start = cum; cum += s.weight;
          const done = project.progress >= cum;
          const partial = !done && project.progress > start;
          const pct = done ? 100 : partial ? Math.round(((project.progress - start) / s.weight) * 100) : 0;
          const color = done ? '#10B981' : partial ? '#F59E0B' : '#CBD5E1';
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ width: 200, fontSize: 13, color: done || partial ? 'var(--ink)' : 'var(--muted)', fontWeight: done || partial ? 600 : 400 }}>{s.label}</span>
              <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color, width: 36, textAlign: 'left' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
