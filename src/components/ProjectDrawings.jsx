import React, { useState, useMemo } from 'react';
import {
  Image, Plus, Trash2, Edit3, Eye, Download, MessageCircle,
  CheckCircle2, Clock, AlertTriangle, Layers, Maximize2, X,
  FileText, Sparkles, Filter, Search, Share2, Upload, ZoomIn, ZoomOut, RotateCw, ExternalLink
} from 'lucide-react';
import { todayISO, fmtDate } from '../utils/helpers';

// Helper to convert base64 Data URLs into direct Blob URLs to bypass browser iframe/object security blocks
function dataUrlToBlobUrl(dataUrl) {
  if (!dataUrl) return '';
  if (dataUrl.startsWith('blob:') || (dataUrl.startsWith('http') && !dataUrl.startsWith('data:'))) return dataUrl;
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const b64 = parts[1];
    const byteCharacters = atob(b64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Blob conversion fallback:', err);
    return dataUrl;
  }
}

const DRAWING_CATEGORIES = [
  { key: 'all',          label: 'كافة الرسومات والمناظير', icon: Layers },
  { key: '3d',           label: 'مناظير وتصميمات 3D',     icon: Sparkles, color: '#8B5CF6' },
  { key: 'architecture', label: 'مخططات معمارية وفرش',    icon: FileText, color: '#3B82F6' },
  { key: 'electricity',  label: 'كهرباء وإنارة',          icon: FileText, color: '#F59E0B' },
  { key: 'plumbing',     label: 'سباكة وصحي',             icon: FileText, color: '#06B6D4' },
  { key: 'ceilings',     label: 'جبس بورد وأسقف (RCP)',   icon: FileText, color: '#EC4899' },
  { key: 'flooring',     label: 'تكسيات وأرضيات ورخام',   icon: FileText, color: '#10B981' },
  { key: 'joinery',      label: 'تفاصيل نجارة وتجاليد',   icon: FileText, color: '#F97316' },
  { key: 'comparison',   label: 'مقارنة 3D بالواقع المنفذ', icon: Eye,     color: '#6366F1' },
];

const DEFAULT_DRAWINGS = [
  {
    id: 'drw-1',
    title: 'منظور 3D - الصالة والريسبشن الرئيسي',
    category: '3d',
    status: 'approved',
    revision: 'Rev 2.0 (معتمد)',
    room: 'الريسبشن',
    description: 'توزيع الإضاءة المخفية، تجليد الحائط الخشبي لشاشة التلفزيون، وتناسق درجات البورسلين مع الأثاث.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    realityImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    date: '2026-08-10',
  },
  {
    id: 'drw-2',
    title: 'مخطط شِرب وتوزيع علب الكهرباء والإنارة',
    category: 'electricity',
    status: 'approved',
    revision: 'Rev 1.0 (معتمد للتنفيذ)',
    room: 'كامل الوحدة',
    description: 'تحديد مناسيب المفاتيح على شِرب 120 سم، ومخارج التكييفات 6 مم والبرايز الأرضية.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
    date: '2026-08-05',
  },
  {
    id: 'drw-3',
    title: 'مخطط الأسقف الساقطة وتفاصيل بيت النور (RCP)',
    category: 'ceilings',
    status: 'approved',
    revision: 'Rev 1.0',
    room: 'غرفة النوم والريسبشن',
    description: 'تفصيلة خلوص بيت النور (15 سم)، وأبعاد السقوط (12 سم) ومسارات فتحات التكييف الكونسيلد.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    date: '2026-08-08',
  },
  {
    id: 'drw-4',
    title: 'منظور 3D - المطبخ الحديث والأجهزة المدمجة',
    category: '3d',
    status: 'approved',
    revision: 'Rev 1.0',
    room: 'المطبخ',
    description: 'مثلث الحركة المطبخي، وتنسيق رخام الكوارتز مع خشب البولي لاك والمخارج الكهربائية.',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
    realityImage: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?auto=format&fit=crop&w=1200&q=80',
    date: '2026-08-12',
  },
  {
    id: 'drw-5',
    title: 'مخطط تغذية وصرف الحمام الماستر والكراسي الدفن',
    category: 'plumbing',
    status: 'approved',
    revision: 'Rev 2.0',
    room: 'حمام الماستر',
    description: 'مناسيب تغذية الدش المدفون (Smart Shower)، وتثبيت شاسيه جروهي المعلق وخلاط الدفن.',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    date: '2026-08-07',
  }
];

export default function ProjectDrawings({ project, onUpdate }) {
  const rawDrawings = Array.isArray(project?.drawingsData) && project.drawingsData.length > 0 
    ? project.drawingsData 
    : DEFAULT_DRAWINGS;
  const drawings = useMemo(() => rawDrawings.filter(Boolean), [rawDrawings]);

  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedViewerItem, setSelectedViewerItem] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewerRotation, setViewerRotation] = useState(0); // 0, 90, 180, 270
  const [viewerTab, setViewerTab] = useState('split'); // 'split' | 'design' | 'reality'

  function openViewer(item) {
    setSelectedViewerItem(item);
    setZoomLevel(1);
    setViewerRotation(0);
    setViewerTab('split');
  }

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '3d',
    status: 'approved',
    revision: 'Rev 1.0 (معتمد)',
    room: '',
    description: '',
    image: '',
    realityImage: '',
  });

  const filteredDrawings = useMemo(() => {
    return drawings.filter(d => {
      if (!d) return false;
      const matchCat = activeCat === 'all'
        ? true
        : activeCat === 'comparison'
          ? (d.image && d.realityImage)
          : d.category === activeCat;
      const q = (search || '').toLowerCase().trim();
      const titleStr = String(d.title || '').toLowerCase();
      const roomStr = String(d.room || '').toLowerCase();
      const descStr = String(d.description || '').toLowerCase();
      const matchSearch = !q
        ? true
        : (titleStr.includes(q) || roomStr.includes(q) || descStr.includes(q));
      return matchCat && matchSearch;
    });
  }, [drawings, activeCat, search]);

  function handleSaveDrawing() {
    if (!formData.title.trim()) {
      alert('يرجى كتابة اسم الرسم أو المنظور');
      return;
    }
    if (!formData.image) {
      alert('يرجى إرفاق صورة أو مخطط');
      return;
    }

    const newDrawing = {
      ...formData,
      id: 'drw-' + Date.now(),
      date: todayISO(),
    };

    const updated = [newDrawing, ...drawings];
    onUpdate({ drawingsData: updated });
    setShowAddModal(false);
    setFormData({
      title: '',
      category: '3d',
      status: 'approved',
      revision: 'Rev 1.0 (معتمد)',
      room: '',
      description: '',
      image: '',
      realityImage: '',
    });
  }

  function handleDeleteDrawing(id, e) {
    e.stopPropagation();
    if (confirm('هل تريد بالتأكيد حذف هذا المخطط/المنظور؟')) {
      const updated = drawings.filter(d => d.id !== id);
      onUpdate({ drawingsData: updated });
    }
  }

  function handleFileUpload(e, field = 'image') {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('حجم الملف كبير جداً (أقصى حجم 25 ميجابايت).');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(prev => ({
        ...prev,
        [field]: ev.target.result,
        ...(field === 'image' ? {
          fileType: isPdf ? 'pdf' : 'image',
          fileName: file.name,
          title: prev.title || file.name.replace(/\.[^/.]+$/, "")
        } : {})
      }));
    };
    reader.readAsDataURL(file);
  }

  function openWhatsAppShare(d) {
    const text = encodeURIComponent(
      `📐 *مخطط / منظور هندسي معتمد - شركة أملاك*\n` +
      `📍 *الموقع:* ${project.name}\n` +
      `📌 *اللوحة:* ${d.title}\n` +
      `🏷️ *الإصدار:* ${d.revision || 'معتمد للتنفيذ'}\n` +
      `🏢 *الحيز:* ${d.room || 'عام'}\n` +
      `📝 *ملاحظات المهندس:* ${d.description || 'يرجى الالتزام بالأبعاد والمواصفات المعتمدة.'}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  const STATUS_CFG = {
    approved: { label: 'معتمد للتنفيذ ✅', bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
    review:   { label: 'قيد المراجعة ⏳',  bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    draft:    { label: 'مسودة تصميم ✏️',  bg: 'rgba(99,102,241,0.15)', color: '#6366F1' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Top Banner */}
      <div style={{
        background: 'var(--card)', color: 'var(--ink)',
        borderRadius: 12, padding: '22px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 16, border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: '#F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>مكتبة المناظير ثلاثية الأبعاد (3D) والرسومات التنفيذية</h3>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              المخططات التفصيلية المعتمدة ومطابقة التصميم 3D بالواقع الفعلي المنفذ
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
              fontSize: 13.5
            }}
          >
            <Plus size={18} /> إضافة رسم أو منظور 3D
          </button>
        </div>
      </div>

      {/* Search & Categories Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Categories Pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, flex: 1 }}>
          {DRAWING_CATEGORIES.map(cat => {
            const count = cat.key === 'all'
              ? drawings.length
              : cat.key === 'comparison'
                ? drawings.filter(d => d.image && d.realityImage).length
                : drawings.filter(d => d.category === cat.key).length;
            const isSelected = activeCat === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCat(cat.key)}
                style={{
                  padding: '8px 14px', borderRadius: 20, border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--amber)' : 'var(--card)',
                  color: isSelected ? '#fff' : 'var(--ink)',
                  fontWeight: isSelected ? 800 : 600, fontSize: 12, cursor: 'pointer',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                <span>{cat.label}</span>
                <span style={{
                  background: isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)',
                  padding: '1px 6px', borderRadius: 10, fontSize: 10
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: 220 }}>
          <input
            type="text"
            placeholder="بحث في المخططات والمناظير..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 36px 8px 14px', borderRadius: 20,
              border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: 12
            }}
          />
          <Search size={15} color="var(--muted)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {/* Grid of Drawings & Perspectives */}
      {filteredDrawings.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px', background: 'var(--card)',
          borderRadius: 16, border: '1px dashed var(--border)'
        }}>
          <Image size={48} color="var(--muted)" style={{ opacity: 0.4, marginBottom: 12 }} />
          <h4 style={{ margin: 0, color: 'var(--ink)' }}>لا توجد رسومات أو مناظير في هذا القسم</h4>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>اضغط على "إضافة رسم أو منظور 3D" لرفع التصميمات والمخططات المعتمدة للموقع</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredDrawings.map((d) => {
            const st = STATUS_CFG[d.status] || STATUS_CFG.approved;
            const hasReality = Boolean(d.realityImage);

            return (
              <div
                key={d.id}
                onClick={() => openViewer(d)}
                style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
                  overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s', display: 'flex', flexDirection: 'column',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'; }}
              >
                {/* Image or PDF Container */}
                <div style={{ position: 'relative', height: 210, background: '#0F172A', overflow: 'hidden' }}>
                  {(() => {
                    const isPdf = d.fileType === 'pdf' || d.image?.startsWith('data:application/pdf') || d.image?.toLowerCase().endsWith('.pdf');
                    if (isPdf) {
                      return (
                        <div style={{
                          height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          background: '#0F172A', padding: 20, textAlign: 'center', color: '#fff'
                        }}>
                          <div style={{
                            width: 58, height: 58, borderRadius: 16, background: 'rgba(239,68,68,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, border: '1px solid rgba(239,68,68,0.3)'
                          }}>
                            <FileText size={30} color="#EF4444" />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: '#F8FAFC', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.fileName || d.title}
                          </span>
                          <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginTop: 4, background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                            ملف مخططات PDF هندسي 📄
                          </span>
                        </div>
                      );
                    }
                    if (hasReality && activeCat === 'comparison') {
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
                          <div style={{ position: 'relative', height: '100%', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                            <img src={d.image} alt="3D" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#FCD34D', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                              تصميم 3D ✨
                            </span>
                          </div>
                          <div style={{ position: 'relative', height: '100%' }}>
                            <img src={d.realityImage} alt="الواقع" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(16,185,129,0.85)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                              التنفيذ الفعلي 📸
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <img
                        src={d.image}
                        alt={d.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                      />
                    );
                  })()}

                  {/* Badges Over Image */}
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
                    <span style={{
                      background: st.bg, color: st.color, padding: '3px 8px', borderRadius: 6,
                      fontSize: 10, fontWeight: 800, backdropFilter: 'blur(4px)'
                    }}>
                      {st.label}
                    </span>
                    {d.revision && (
                      <span style={{
                        background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '3px 8px', borderRadius: 6,
                        fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)'
                      }}>
                        {d.revision}
                      </span>
                    )}
                  </div>

                  {hasReality && activeCat !== 'comparison' && (
                    <span style={{
                      position: 'absolute', bottom: 10, left: 10, background: '#2563EB',
                      color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      <Eye size={12} /> مقارنة بالواقع
                    </span>
                  )}

                  <div style={{
                    position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)',
                    color: '#fff', borderRadius: 20, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Maximize2 size={13} />
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', lineHeight: 1.3 }}>
                      {d.title}
                    </div>
                  </div>

                  {d.room && (
                    <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>
                      📍 الحيز / الغرفة: {d.room}
                    </div>
                  )}

                  {d.description && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>
                      {d.description}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: 10, marginTop: 'auto', borderTop: '1px dashed var(--border)'
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.date ? fmtDate(d.date) : ''}</span>

                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => window.open(dataUrlToBlobUrl(d.image), '_blank')}
                        title="فتح المخطط في نافذة مستقلة كاملة"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                          background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <ExternalLink size={13} /> فتح
                      </button>

                      <button
                        onClick={() => openWhatsAppShare(d)}
                        title="مشاركة تفاصيل المخطط على واتساب"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                          background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        <MessageCircle size={13} /> واتساب
                      </button>

                      <a
                        href={dataUrlToBlobUrl(d.image)}
                        download={d.fileName || d.title}
                        title="تحميل الملف بدقة عالية"
                        style={{
                          padding: '5px 8px', borderRadius: 6, background: 'var(--bg)', color: 'var(--ink)',
                          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', textDecoration: 'none'
                        }}
                      >
                        <Download size={13} />
                      </a>

                      <button
                        onClick={(e) => handleDeleteDrawing(d.id, e)}
                        title="حذف"
                        style={{
                          padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                          border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD DRAWING / PERSPECTIVE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)} style={{ zIndex: 1000, background: 'rgba(15, 23, 42, 0.8)' }}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 640, width: '95%', borderRadius: 16, background: 'var(--card)', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} color="var(--amber)" /> إضافة رسم هندسي أو منظور 3D
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>عنوان الرسم / المنظور *</label>
                <input
                  type="text"
                  placeholder="مثال: منظور 3D لغرفة الماستر أو مخطط الصرف الصحي"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>التصنيف الهندسي</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }}
                  >
                    {DRAWING_CATEGORIES.filter(c => c.key !== 'all' && c.key !== 'comparison').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>الحيز / الغرفة</label>
                  <input
                    type="text"
                    placeholder="مثال: الريسبشن، المطبخ، الحمام..."
                    value={formData.room}
                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>حالة الاعتماد</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }}
                  >
                    <option value="approved">معتمد للتنفيذ ✅</option>
                    <option value="review">قيد المراجعة ⏳</option>
                    <option value="draft">مسودة تصميم ✏️</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>رقم الإصدار (Revision)</label>
                  <input
                    type="text"
                    placeholder="Rev 1.0 أو معتمد نهائي"
                    value={formData.revision}
                    onChange={e => setFormData({ ...formData, revision: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              {/* Upload Main Drawing / 3D Render / PDF Document */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                  ملف المخطط التنفيذي (PDF) أو صورة المنظور 3D *
                </label>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '20px', border: '2px dashed var(--teal)', borderRadius: 12, background: 'rgba(16,185,129,0.04)',
                  cursor: 'pointer', gap: 8
                }}>
                  <Upload size={26} color="var(--teal)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>
                    {formData.image
                      ? (formData.fileType === 'pdf' ? `تم اختيار ملف PDF: ${formData.fileName || 'مخطط هندسي'} ✅` : 'تم اختيار الصورة ✅ (اضغط للتغيير)')
                      : 'اضغط لاختيار ملف المخطط (PDF أو صورة JPG / PNG)'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>يدعم ملفات PDF الهندسية والصور حتى 25 ميجابايت</span>
                  <input type="file" accept="image/*,application/pdf,.pdf" onChange={e => handleFileUpload(e, 'image')} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Upload Reality Image (Optional for comparison) */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  صورة الواقع الفعلي المنفذ في الموقع (اختياري لمقارنة التنفيذ بالتصميم)
                </label>
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', border: '1px dashed var(--border)', borderRadius: 10, background: 'var(--bg)',
                  cursor: 'pointer'
                }}>
                  <Image size={18} color="var(--muted)" />
                  <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
                    {formData.realityImage ? 'تم إرفاق صورة الواقع ✅' : 'إرفاق صورة ما تم تنفيذه للمقارنة'}
                  </span>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'realityImage')} style={{ display: 'none' }} />
                </label>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>ملاحظات ومواصفات هندسية إضافية</label>
                <textarea
                  rows={2}
                  placeholder="مثال: الالتزام بكود اللون وتوزيع الإسبوتات بمسافة 80 سم..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'Cairo', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={handleSaveDrawing} style={{ padding: '10px 24px' }}>
                  حفظ الرسم بالمكتبة ✅
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN SMART LIGHTBOX & HIGH-RES VIEWER */}
      {selectedViewerItem && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedViewerItem(null)}
          style={{
            zIndex: 2000,
            background: 'rgba(7, 12, 22, 0.94)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px'
          }}
        >
          {/* Ambient Glow Backdrop (خلفية ضبابية مضيئة مستوحاة من الصورة لتوديع الفراغ والشريط الأسود) */}
          {selectedViewerItem.image && !selectedViewerItem.image.startsWith('data:application/pdf') && (
            <div
              style={{
                position: 'fixed',
                inset: -40,
                backgroundImage: `url(${selectedViewerItem.realityImage || selectedViewerItem.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(70px) saturate(1.5) brightness(0.25)',
                opacity: 0.85,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
          )}

          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              zIndex: 10,
              width: '96%',
              maxWidth: 1300,
              height: '92dvh',
              maxHeight: '92dvh',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.65)'
            }}
          >
            {/* Viewer Top Toolbar */}
            <div style={{
              padding: '12px 18px',
              background: 'rgba(30, 41, 59, 0.7)',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              color: '#fff',
              direction: 'rtl'
            }}>
              {/* Title & Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {selectedViewerItem.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {selectedViewerItem.room && <span>📍 {selectedViewerItem.room}</span>}
                    {selectedViewerItem.revision && <span style={{ color: '#38BDF8', fontWeight: 700 }}>• {selectedViewerItem.revision}</span>}
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs (خاص بمقارنة 3D والتنفيذ الواقعي للموبايل والشاشات) */}
              {selectedViewerItem.realityImage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.35)',
                  padding: '3px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <button
                    type="button"
                    onClick={() => setViewerTab('design')}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 9,
                      border: 'none',
                      background: viewerTab === 'design' ? '#F59E0B' : 'transparent',
                      color: viewerTab === 'design' ? '#000' : '#E2E8F0',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    ✨ تصميم 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerTab('reality')}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 9,
                      border: 'none',
                      background: viewerTab === 'reality' ? '#10B981' : 'transparent',
                      color: viewerTab === 'reality' ? '#fff' : '#E2E8F0',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    📸 الواقع الفعلي
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewerTab('split')}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 9,
                      border: 'none',
                      background: viewerTab === 'split' ? '#3B82F6' : 'transparent',
                      color: viewerTab === 'split' ? '#fff' : '#E2E8F0',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    ↔️ مقارنة معاً
                  </button>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!(selectedViewerItem.fileType === 'pdf' || selectedViewerItem.image?.startsWith('data:application/pdf')) && (
                  <>
                    {/* Rotate 90° Button (حل جذري لمشكلة تدوير صور الموبايل الطولية والعرضية) */}
                    <button
                      onClick={() => setViewerRotation(prev => (prev + 90) % 360)}
                      style={{
                        background: viewerRotation !== 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.1)',
                        border: `1px solid ${viewerRotation !== 0 ? '#38BDF8' : 'rgba(255,255,255,0.15)'}`,
                        color: viewerRotation !== 0 ? '#38BDF8' : '#fff',
                        padding: '6px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 11.5,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      title="تدوير الصورة 90 درجة لضبط اتجاه التقاط الموبايل"
                    >
                      <RotateCw size={14} />
                      <span>{viewerRotation !== 0 ? `${viewerRotation}°` : 'تدوير'}</span>
                    </button>

                    {/* Zoom controls for images */}
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
                      title="تكبير"
                    >
                      <ZoomIn size={15} />
                    </button>

                    <button
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.75))}
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '6px 8px', borderRadius: 8, cursor: 'pointer' }}
                      title="تصغير"
                    >
                      <ZoomOut size={15} />
                    </button>

                    {zoomLevel !== 1 && (
                      <button
                        onClick={() => setZoomLevel(1)}
                        style={{ background: '#38BDF8', border: 'none', color: '#0F172A', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 900 }}
                      >
                        100%
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => window.open(dataUrlToBlobUrl(selectedViewerItem.realityImage && viewerTab === 'reality' ? selectedViewerItem.realityImage : selectedViewerItem.image), '_blank')}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
                  title="فتح في نافذة كاملة جديدة"
                >
                  <ExternalLink size={13} /> نافذة كاملة
                </button>

                <button
                  onClick={() => openWhatsAppShare(selectedViewerItem)}
                  style={{ background: 'rgba(37, 211, 102, 0.2)', border: '1px solid rgba(37, 211, 102, 0.4)', color: '#25D366', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <MessageCircle size={14} /> واتساب
                </button>

                <a
                  href={dataUrlToBlobUrl(selectedViewerItem.realityImage && viewerTab === 'reality' ? selectedViewerItem.realityImage : selectedViewerItem.image)}
                  download={selectedViewerItem.fileName || selectedViewerItem.title}
                  style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60A5FA', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}
                >
                  <Download size={14} /> تحميل
                </a>

                <button
                  onClick={() => setSelectedViewerItem(null)}
                  style={{ background: 'rgba(239, 68, 68, 0.25)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#FCA5A5', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={16} /> إغلاق
                </button>
              </div>
            </div>

            {/* Viewer Stage (مسرح العرض بدون فراغات سوداء كاحلة وبخلفية مريحة للعين) */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px',
              background: 'rgba(10, 15, 29, 0.65)',
              position: 'relative'
            }}>
              {(() => {
                const isPdf = selectedViewerItem.fileType === 'pdf' || selectedViewerItem.image?.startsWith('data:application/pdf') || selectedViewerItem.image?.toLowerCase().endsWith('.pdf');
                if (isPdf) {
                  const blobUrl = dataUrlToBlobUrl(selectedViewerItem.image);
                  return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#1E293B', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '10px 16px', background: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color: '#EF4444', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={16} /> مستند ومخطط PDF هندسي معتمد
                        </span>
                        <button
                          onClick={() => window.open(blobUrl, '_blank')}
                          style={{
                            background: '#2563EB', color: '#fff', border: 'none',
                            padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6
                          }}
                        >
                          <ExternalLink size={14} /> فتح الـ PDF في نافذة جديدة
                        </button>
                      </div>
                      <div style={{ flex: 1, position: 'relative', background: '#475569' }}>
                        <iframe
                          src={blobUrl}
                          title={selectedViewerItem.title}
                          style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                        />
                      </div>
                    </div>
                  );
                }

                // مقارنة 3D بالواقع الفعلي
                if (selectedViewerItem.realityImage) {
                  // عرض التصميم 3D منفرداً بكامل الحجم
                  if (viewerTab === 'design') {
                    return (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <div style={{ marginBottom: 6, color: '#FCD34D', fontWeight: 800, fontSize: 13.5 }}>✨ منظور التصميم 3D المعتمد</div>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img
                            src={selectedViewerItem.image}
                            alt="3D Render"
                            style={{
                              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                              transform: `scale(${zoomLevel}) rotate(${viewerRotation}deg)`,
                              transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                              borderRadius: 12,
                              boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // عرض الواقع الفعلي المنفذ منفرداً بكامل الحجم (مثالي لصور الموبايل الطولية والعرضية)
                  if (viewerTab === 'reality') {
                    return (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <div style={{ marginBottom: 6, color: '#10B981', fontWeight: 800, fontSize: 13.5 }}>📸 ما تم تنفيذه في الموقع الفعلي</div>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img
                            src={selectedViewerItem.realityImage}
                            alt="Reality Execution"
                            style={{
                              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                              transform: `scale(${zoomLevel}) rotate(${viewerRotation}deg)`,
                              transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                              borderRadius: 12,
                              boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // عرض المقارنة جنباً إلى جنب بشكل راقٍ ومريح
                  return (
                    <div className="drawings-split-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 16,
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%',
                        background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '10px',
                        border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden'
                      }}>
                        <span style={{ color: '#FCD34D', fontWeight: 800, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          ✨ منظور التصميم 3D
                        </span>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img
                            src={selectedViewerItem.image}
                            alt="3D Render"
                            style={{
                              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                              transform: `scale(${zoomLevel}) rotate(${viewerRotation}deg)`,
                              transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                              borderRadius: 10
                            }}
                          />
                        </div>
                      </div>

                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%',
                        background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '10px',
                        border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden'
                      }}>
                        <span style={{ color: '#10B981', fontWeight: 800, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          📸 ما تم تنفيذه في الموقع
                        </span>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img
                            src={selectedViewerItem.realityImage}
                            alt="Reality Execution"
                            style={{
                              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                              transform: `scale(${zoomLevel}) rotate(${viewerRotation}deg)`,
                              transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                              borderRadius: 10
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                // صورة مفردة
                return (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img
                      src={selectedViewerItem.image}
                      alt={selectedViewerItem.title}
                      style={{
                        maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                        transform: `scale(${zoomLevel}) rotate(${viewerRotation}deg)`,
                        transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        borderRadius: 14,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
                      }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Description Bar */}
            {selectedViewerItem.description && (
              <div style={{ padding: '10px 20px', background: 'rgba(30, 41, 59, 0.5)', color: '#E2E8F0', fontSize: 12.5, borderTop: '1px solid rgba(255,255,255,0.1)', direction: 'rtl' }}>
                <strong style={{ color: '#38BDF8' }}>المواصفة والملاحظة: </strong> {selectedViewerItem.description}
              </div>
            )}
          </div>

          <style>{`
            @media (max-width: 768px) {
              .drawings-split-grid {
                grid-template-columns: 1fr !important;
                grid-template-rows: 1fr 1fr !important;
              }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
