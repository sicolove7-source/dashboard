import React, { useState, useMemo } from 'react';
import {
  Wrench, UserCheck, Phone, MessageSquare, Plus, Search,
  Edit2, Trash2, CheckCircle2, Clock, AlertTriangle, FileText,
  DollarSign, ShieldCheck, HardHat, Sparkles, MapPin, X, Save
} from 'lucide-react';
import { getGlobalCurrency, fmtDate } from '../utils/helpers';
import { openWhatsApp } from '../utils/whatsappTemplates';
import { SEED_SUBCONTRACTORS } from '../utils/constants';
import { CRAFTSMAN_SPECS } from './CraftsmanContractModal';

// Specialty metadata with icons & colors
const TRADE_META = {
  plumbing:    { label: 'أعمال السباكة والصحي',      icon: '🚰', color: '#0284C7', bg: '#E0F2FE' },
  electricity: { label: 'أعمال الكهرباء والإنارة',     icon: '⚡', color: '#D97706', bg: '#FEF3C7' },
  plaster:     { label: 'أعمال المحارة والبياض',     icon: '🧱', color: '#D97706', bg: '#FEF3C7' },
  ceramics:    { label: 'أعمال السيراميك والبورسلين', icon: '📐', color: '#059669', bg: '#D1FAE5' },
  gypsum:      { label: 'أعمال الجبس بورد والأسقف',   icon: '✨', color: '#7C3AED', bg: '#EDE9FE' },
  painting:    { label: 'أعمال الدهانات والديكورات',  icon: '🎨', color: '#DB2777', bg: '#FCE7F3' },
  carpentry:   { label: 'أعمال النجارة والأبواب',      icon: '🪚', color: '#B45309', bg: '#FEF3C7' },
  aluminum:    { label: 'أعمال الألوميتال والـ PVC',   icon: '🪟', color: '#475569', bg: '#F1F5F9' },
  hvac:        { label: 'أعمال التكييف والتهوية',     icon: '❄️', color: '#0891B2', bg: '#CFFAFE' },
  insulation:  { label: 'أعمال العزل المائي والحراري',icon: '🛡️', color: '#4B5563', bg: '#E5E7EB' },
  other:       { label: 'أعمال تخصصية أخرى',          icon: '🛠️', color: '#64748B', bg: '#F8FAFC' },
};

export const DEFAULT_SITE_CRAFTSMEN = [
  {
    id: 'cr_seed_1',
    name: 'المعلم إبراهيم دسوقي',
    specialty: 'أعمال المحارة والبياض',
    tradeKey: 'plaster',
    phone: '01011223344',
    nationalId: '28501011200334',
    address: 'دمياط الجديدة - المنطقة المركزية',
    role: 'مقاول مصنعية رئيسي',
    status: 'active',
    scope: 'بؤج وأوتار الشقة بالكامل ومحارة الصالة وغرف النوم مع استلام القدة والميزان',
    agreedAmount: 16500,
    paidAmount: 11000,
    notes: 'فريق عمل منضبط وسريع في تسليم استلامات المهندس'
  },
  {
    id: 'cr_seed_2',
    name: 'الأسطى محمد الشناوي',
    specialty: 'أعمال السباكة والصحي',
    tradeKey: 'plumbing',
    phone: '01122334455',
    nationalId: '29004151201995',
    address: 'دمياط - امتداد الحي الرابع',
    role: 'معلم سباكة متخصص',
    status: 'active',
    scope: 'تأسيس الصرف والتغذية للحمام الرئيسي وحمام الضيوف والمطبخ وعزل الأرضيات',
    agreedAmount: 14000,
    paidAmount: 8500,
    notes: 'معتمد لشهادة كبس شبكة التغذية الألمانية'
  },
  {
    id: 'cr_seed_3',
    name: 'م. طارق العوضي',
    specialty: 'أعمال الكهرباء والإنارة',
    tradeKey: 'electricity',
    phone: '01099887766',
    nationalId: '29202021500448',
    address: 'دمياط الجديدة - الحي الثالث',
    role: 'مقاول باطن كهرباء',
    status: 'contract_signed',
    scope: 'دق وتأسيس خراطيم وعلب ماجيك اللوحات الذكية والتكييفات وسحب الأسلاك',
    agreedAmount: 18000,
    paidAmount: 6000,
    notes: 'توزيع خطوط الإنارة وفق مخطط الـ 3D المعتمد'
  },
  {
    id: 'cr_seed_4',
    name: 'الأسطى ياسر عبد العظيم',
    specialty: 'أعمال الجبس بورد والأسقف',
    tradeKey: 'gypsum',
    phone: '01233445566',
    nationalId: '28807121400221',
    address: 'كفر البطيخ - طريق الميناء',
    role: 'معلم جبس بورد ديكوري',
    status: 'pending',
    scope: 'شاسيهات صاج معتمد مع ألواح كناوف خضراء للحمام وبيت نور للصالة',
    agreedAmount: 15500,
    paidAmount: 0,
    notes: 'في انتظار الانتهاء من التأسيسات وسحب أسلاك الإضاءة المخفية'
  },
  {
    id: 'cr_seed_5',
    name: 'المعلم عادل الرخاوي',
    specialty: 'أعمال السيراميك والبورسلين',
    tradeKey: 'ceramics',
    phone: '01055667788',
    nationalId: '28308191300982',
    address: 'شربين - الدقهلية',
    role: 'معلم تركيب بورسلين ورخام',
    status: 'pending',
    scope: 'تركيب بورسلين أرضيات مقاس 60×120 ليزر بكلبسات تسوية وسيراميك الحوائط',
    agreedAmount: 22000,
    paidAmount: 0,
    notes: 'استخدام مادة لصق مخصصة للبورسلين بدلاً من المونة'
  }
];

export default function ProjectCraftsmen({
  project,
  onUpdate,
  currentUser,
  userRole = 'engineer',
  onOpenContractModal,
}) {
  const currency = getGlobalCurrency();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrade, setFilterTrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCraftsman, setEditingCraftsman] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Form draft state
  const [draft, setDraft] = useState({
    name: '',
    specialty: 'أعمال السباكة والصحي',
    tradeKey: 'plumbing',
    phone: '',
    nationalId: '',
    address: '',
    role: 'معلم حرفي رئيسي',
    status: 'active',
    scope: '',
    agreedAmount: '',
    paidAmount: '',
    notes: '',
  });

  // Extract craftsmen for this specific project
  const projectCraftsmen = useMemo(() => {
    let list = [];
    if (Array.isArray(project?.craftsmen) && project.craftsmen.length > 0) {
      list = [...project.craftsmen];
    } else {
      // Default initial team tailored to this site
      list = DEFAULT_SITE_CRAFTSMEN.map(c => ({ ...c }));
    }

    // Merge any registered contracts in project.craftsmanContracts
    const contracts = project?.craftsmanContracts || {};
    Object.keys(contracts).forEach(tKey => {
      const contract = contracts[tKey];
      if (contract && contract.craftsmanName) {
        const existingIdx = list.findIndex(c => c.tradeKey === tKey || c.name === contract.craftsmanName);
        const contractWorker = {
          id: existingIdx >= 0 ? list[existingIdx].id : `cr_contract_${tKey}`,
          name: contract.craftsmanName,
          specialty: contract.tradeName || (CRAFTSMAN_SPECS[tKey]?.name) || 'أعمال مقاولة',
          tradeKey: tKey,
          phone: contract.craftsmanPhone || '',
          nationalId: contract.craftsmanNationalId || '',
          address: contract.craftsmanAddress || '',
          role: contract.craftsmanTitle || 'مقاول مصنعية',
          status: 'contract_signed',
          scope: contract.scopeOfWork || `أعمال ${contract.tradeName || 'المصنعية'} بالعقد الرسمي`,
          agreedAmount: Number(contract.totalAgreedAmount) || 0,
          paidAmount: existingIdx >= 0 ? list[existingIdx].paidAmount : 0,
          notes: 'عقد مسجل رسمياً في النظام وموثق بالبنود والمواصفات',
          hasContract: true
        };

        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...contractWorker };
        } else {
          list.push(contractWorker);
        }
      }
    });

    return list;
  }, [project?.craftsmen, project?.craftsmanContracts]);

  // Persist update back to project
  const saveCraftsmenList = (updatedList) => {
    if (onUpdate) {
      onUpdate({ craftsmen: updatedList });
    }
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingCraftsman(null);
    setDraft({
      name: '',
      specialty: 'أعمال السباكة والصحي',
      tradeKey: 'plumbing',
      phone: '',
      nationalId: '',
      address: '',
      role: 'معلم حرفي رئيسي',
      status: 'active',
      scope: '',
      agreedAmount: '',
      paidAmount: '',
      notes: '',
    });
    setShowAddModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (c) => {
    setEditingCraftsman(c);
    setDraft({
      name: c.name || '',
      specialty: c.specialty || 'أعمال تخصصية',
      tradeKey: c.tradeKey || 'other',
      phone: c.phone || '',
      nationalId: c.nationalId || '',
      address: c.address || '',
      role: c.role || 'معلم حرفي رئيسي',
      status: c.status || 'active',
      scope: c.scope || '',
      agreedAmount: c.agreedAmount || '',
      paidAmount: c.paidAmount || '',
      notes: c.notes || '',
    });
    setShowAddModal(true);
  };

  // Auto-fill from company subcontractor catalog
  const handleSelectFromCatalog = (subId) => {
    const found = SEED_SUBCONTRACTORS.find(s => s.id === subId);
    if (!found) return;

    // Detect tradeKey from specialty
    let matchedTrade = 'other';
    if (found.specialty.includes('سباك') || found.specialty.includes('صحي')) matchedTrade = 'plumbing';
    else if (found.specialty.includes('كهرب')) matchedTrade = 'electricity';
    else if (found.specialty.includes('محار') || found.specialty.includes('بياض')) matchedTrade = 'plaster';
    else if (found.specialty.includes('سيراميك') || found.specialty.includes('بورسلين') || found.specialty.includes('رخام')) matchedTrade = 'ceramics';
    else if (found.specialty.includes('جبس')) matchedTrade = 'gypsum';
    else if (found.specialty.includes('دهان')) matchedTrade = 'painting';

    setDraft(prev => ({
      ...prev,
      name: found.managerName || found.name,
      phone: found.phone || '',
      nationalId: found.nationalId || '',
      address: found.address || '',
      specialty: found.specialty || prev.specialty,
      tradeKey: matchedTrade,
      notes: found.notes || '',
    }));
  };

  // Save Add/Edit
  const handleSaveCraftsman = (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return;

    const itemToSave = {
      id: editingCraftsman ? editingCraftsman.id : `cr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: draft.name.trim(),
      specialty: draft.specialty.trim(),
      tradeKey: draft.tradeKey,
      phone: draft.phone.trim(),
      nationalId: draft.nationalId.trim(),
      address: draft.address.trim(),
      role: draft.role.trim(),
      status: draft.status,
      scope: draft.scope.trim(),
      agreedAmount: Number(draft.agreedAmount) || 0,
      paidAmount: Number(draft.paidAmount) || 0,
      notes: draft.notes.trim(),
    };

    let nextList;
    if (editingCraftsman) {
      nextList = projectCraftsmen.map(c => c.id === editingCraftsman.id ? { ...c, ...itemToSave } : c);
    } else {
      nextList = [itemToSave, ...projectCraftsmen];
    }

    saveCraftsmenList(nextList);
    setShowAddModal(false);
  };

  // Delete craftsman from this site
  const handleDeleteCraftsman = (id) => {
    const nextList = projectCraftsmen.filter(c => c.id !== id);
    saveCraftsmenList(nextList);
    setConfirmDeleteId(null);
  };

  // Quick WhatsApp Dispatch Task
  const handleWhatsAppDispatch = (c) => {
    const engineerName = currentUser?.name || project?.engineer || 'مهندس الموقع';
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    const msg = `السلام عليكم يا معلم *${c.name}* 🛠️\n` +
      `بخصوص أعمالك في موقع: *${project?.name || 'المشروع'}* 📍\n` +
      `التخصص: *${c.specialty}*\n` +
      (c.scope ? `نطاق الأعمال المطلوب: ${c.scope}\n` : '') +
      `برجاء التواجد بالموقع واستكمال بنود الاستلامات والتنفيذ.\n` +
      `للتنسيق والمتابعة: *${engineerName}* 👷‍♂️\n` +
      `منصة تشطيب برو ⚡`;

    openWhatsApp(cleanPhone, msg);
  };

  // Filtered craftsmen list
  const filtered = useMemo(() => {
    return projectCraftsmen.filter(c => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.specialty && c.specialty.toLowerCase().includes(q)) ||
        (c.role && c.role.toLowerCase().includes(q)) ||
        (c.scope && c.scope.toLowerCase().includes(q));

      const matchTrade = filterTrade === 'all' || c.tradeKey === filterTrade;
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;

      return matchSearch && matchTrade && matchStatus;
    });
  }, [projectCraftsmen, searchTerm, filterTrade, filterStatus]);

  // Aggregate statistics for this site
  const stats = useMemo(() => {
    const total = projectCraftsmen.length;
    const active = projectCraftsmen.filter(c => c.status === 'active' || c.status === 'contract_signed').length;
    const totalAgreed = projectCraftsmen.reduce((sum, c) => sum + (Number(c.agreedAmount) || 0), 0);
    const totalPaid = projectCraftsmen.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);
    const remaining = Math.max(0, totalAgreed - totalPaid);

    return { total, active, totalAgreed, totalPaid, remaining };
  }, [projectCraftsmen]);

  return (
    <div className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ─── Top Statistics Banner ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 12,
      }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(37, 99, 235, 0.12)', color: '#2563EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>
            👷
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>صنايعية ومقاولو الموقع</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>{stats.total} <span style={{ fontSize: 12, fontWeight: 500 }}>معلم</span></div>
          </div>
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.12)', color: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>
            ⚡
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>قيد العمل والتنفيذ</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#10B981' }}>{stats.active} <span style={{ fontSize: 12, fontWeight: 500 }}>نشط بالموقع</span></div>
          </div>
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(217, 119, 6, 0.12)', color: '#D97706',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>
            💰
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>إجمالي مصنعيات الموقع</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)' }}>
              {stats.totalAgreed.toLocaleString('ar-EG')} <span style={{ fontSize: 11, fontWeight: 600 }}>{currency}</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>
            💵
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>المسدد لهم حتى الآن</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#10B981' }}>
              {stats.totalPaid.toLocaleString('ar-EG')} <span style={{ fontSize: 11, fontWeight: 600 }}>{currency}</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>المتبقي للصنايعية</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#EF4444' }}>
              {stats.remaining.toLocaleString('ar-EG')} <span style={{ fontSize: 11, fontWeight: 600 }}>{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Action & Filter Toolbar ─── */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14
      }}>
        {/* Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
          <div style={{
            position: 'relative',
            flex: '1 1 200px',
            minWidth: 180,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={15} color="var(--muted)" style={{ position: 'absolute', right: 12 }} />
            <input
              type="text"
              placeholder="ابحث باسم الصنايعي، التخصص، الهاتف، أو نطاق العمل…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 34px 9px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontFamily: "'Cairo'",
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <select
            value={filterTrade}
            onChange={e => setFilterTrade(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--ink)',
              fontFamily: "'Cairo'",
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <option value="all">جميع التخصصات الحرفية</option>
            {Object.keys(TRADE_META).map(k => (
              <option key={k} value={k}>{TRADE_META[k].icon} {TRADE_META[k].label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--ink)',
              fontFamily: "'Cairo'",
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <option value="all">كل حالات التعاقد</option>
            <option value="active">🟢 قيد العمل والتنفيذ</option>
            <option value="contract_signed">📜 تم توقيع العقد الرسمي</option>
            <option value="pending">⏳ في انتظار البدء والتسليم</option>
            <option value="completed">✅ تم إنهاء الأعمال والتسليم</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 9,
              fontWeight: 800,
              fontSize: 13.5,
              background: '#1877F2',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(24, 119, 242, 0.25)'
            }}
          >
            <Plus size={16} /> <span>إضافة صنايعي لهذا الموقع 👷</span>
          </button>

          {onOpenContractModal && (
            <button
              onClick={() => onOpenContractModal(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 9,
                fontWeight: 800,
                fontSize: 13.5,
                background: '#0F172A',
                color: '#FFFFFF',
                border: '1px solid #334155',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
              }}
            >
              <FileText size={16} /> <span>إبرام عقد صنايعي رسمي 📜</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Delete Confirmation Banner ─── */}
      {confirmDeleteId && (
        <div className="confirm-bar" style={{
          background: '#FEF2F2', border: '1px solid #F87171',
          padding: '14px 20px', borderRadius: 10, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: 12
        }}>
          <span style={{ color: '#991B1B', fontWeight: 700, fontSize: 13.5 }}>
            هل أنت متأكد من حذف هذا الصنايعي من طاقم عمل موقع "{project?.name}"؟
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-danger"
              onClick={() => handleDeleteCraftsman(confirmDeleteId)}
              style={{ padding: '6px 14px', fontSize: 12.5 }}
            >
              تأكيد الإزالة
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirmDeleteId(null)}
              style={{ padding: '6px 14px', fontSize: 12.5 }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ─── Craftsmen Cards Grid ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 16
      }}>
        {filtered.map(c => {
          const meta = TRADE_META[c.tradeKey] || TRADE_META.other;
          const agreed = Number(c.agreedAmount) || 0;
          const paid = Number(c.paidAmount) || 0;
          const remaining = Math.max(0, agreed - paid);
          const payPct = agreed > 0 ? Math.min(100, Math.round((paid / agreed) * 100)) : 0;

          const statusBadge = {
            active:          { label: 'قيد العمل بالموقع', color: '#16A34A', bg: '#DCFCE7' },
            contract_signed: { label: 'العقد موثق رسمياً', color: '#2563EB', bg: '#DBEAFE' },
            pending:         { label: 'في انتظار البدء',   color: '#D97706', bg: '#FEF3C7' },
            completed:       { label: 'تم تسليم الأعمال',  color: '#4B5563', bg: '#F3F4F6' },
          }[c.status] || { label: 'نشط', color: '#16A34A', bg: '#DCFCE7' };

          return (
            <div
              key={c.id}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                position: 'relative'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: meta.bg, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0
                  }}>
                    {meta.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, color: meta.color }}>{c.specialty}</span>
                      {c.role && <span>• {c.role}</span>}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 99,
                  color: statusBadge.color,
                  background: statusBadge.bg,
                  whiteSpace: 'nowrap'
                }}>
                  {statusBadge.label}
                </span>
              </div>

              {/* Phone & Contact buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: 12.5
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} color="var(--muted)" />
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--ink)' }}>
                    {c.phone || 'بدون هاتف مسجل'}
                  </span>
                </div>

                {c.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleWhatsAppDispatch(c)}
                      title="مراسلة وتكليف عبر واتساب"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: '#25D366',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11.5,
                        fontWeight: 700
                      }}
                    >
                      <MessageSquare size={13} /> واتساب
                    </button>
                    <a
                      href={`tel:${c.phone}`}
                      title="اتصال هاتفي مباشر"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#E2E8F0',
                        color: '#1E293B',
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={13} />
                    </a>
                  </div>
                )}
              </div>

              {/* Scope of Work in this site */}
              {c.scope && (
                <div style={{
                  fontSize: 12.5,
                  color: 'var(--ink)',
                  background: '#F8FAFC',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  lineHeight: 1.5
                }}>
                  <strong style={{ color: 'var(--muted)', fontSize: 11, display: 'block', marginBottom: 2 }}>نطاق الأعمال المكلف بها في هذا الموقع:</strong>
                  {c.scope}
                </div>
              )}

              {/* Financial Progress Bar */}
              {agreed > 0 && (
                <div style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>المتفق عليه: <strong style={{ color: 'var(--ink)' }}>{agreed.toLocaleString('ar-EG')} {currency}</strong></span>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>مسدد {payPct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${payPct}%`, background: '#10B981', borderRadius: 99, transition: 'width 0.3s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>المدفوع: {paid.toLocaleString('ar-EG')} {currency}</span>
                    <span style={{ color: remaining > 0 ? '#EF4444' : 'var(--muted)', fontWeight: 600 }}>المتبقي: {remaining.toLocaleString('ar-EG')} {currency}</span>
                  </div>
                </div>
              )}

              {/* Card Bottom Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                gap: 8
              }}>
                {/* Official Contract Button */}
                <button
                  onClick={() => {
                    if (onOpenContractModal) {
                      onOpenContractModal({
                        name: c.name,
                        phone: c.phone,
                        nationalId: c.nationalId,
                        address: c.address,
                        tradeKey: c.tradeKey || 'ceramics',
                        craftsmanTitle: c.role || c.specialty,
                        totalAmount: c.agreedAmount,
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  title="فتح وتوثيق عقد المصنعية الرسمي لهذا المعلم في الموقع"
                >
                  <FileText size={14} /> <span>عقد المصنعية 📜</span>
                </button>

                {/* Edit Craftsman */}
                <button
                  onClick={() => handleOpenEdit(c)}
                  style={{
                    width: 34, height: 34,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="تعديل بيانات الحرفي في هذا الموقع"
                >
                  <Edit2 size={14} />
                </button>

                {/* Remove Craftsman */}
                <button
                  onClick={() => setConfirmDeleteId(c.id)}
                  style={{
                    width: 34, height: 34,
                    borderRadius: 8,
                    border: '1px solid #FEE2E2',
                    background: '#FEF2F2',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="إزالة الحرفي من هذا الموقع"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty Search/Filter State */}
      {filtered.length === 0 && (
        <div style={{
          background: 'var(--card)',
          border: '1px dashed var(--border)',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          color: 'var(--muted)'
        }}>
          <HardHat size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
            لا يوجد صنايعية مطابقين للبحث أو الفلتر
          </div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>
            يمكنك إضافة معلم جديد أو تعديل خيارات التصفية أعلاه
          </div>
          <button
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ padding: '8px 18px', fontSize: 13 }}
          >
            + إضافة صنايعي لهذا الموقع
          </button>
        </div>
      )}

      {/* ─── Add / Edit Craftsman Modal ─── */}
      {showAddModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 16
          }}
        >
          <div
            className="modal-panel"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              borderRadius: 16,
              maxWidth: 620,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border)',
              fontFamily: "'Cairo'",
              direction: 'rtl'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>👷</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
                    {editingCraftsman ? 'تعديل بيانات صنايعي الموقع' : 'إضافة صنايعي / مقاول لموقع ' + (project?.name || '')}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    تخصيص الحرفيين والمسؤوليات المالية والفنية الخاصة بهذا الموقع
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--muted)', cursor: 'pointer', padding: 4
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveCraftsman} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Quick Select from Registered Contractors Catalog */}
              {!editingCraftsman && (
                <div style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 10,
                  padding: '12px 14px'
                }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>
                    ⚡ أو اختر من قاعدة مقاولي وصنايعية الشركة المسجلين:
                  </label>
                  <select
                    onChange={e => handleSelectFromCatalog(e.target.value)}
                    defaultValue=""
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid #93C5FD',
                      background: '#FFFFFF',
                      fontFamily: "'Cairo'",
                      fontSize: 13
                    }}
                  >
                    <option value="" disabled>-- اضغط للاختيار والتعبئة التلقائية --</option>
                    {SEED_SUBCONTRACTORS.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.managerName || s.name} — {s.specialty} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grid Inputs: Specialty & Trade */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    التخصص المهني: <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    value={draft.tradeKey}
                    onChange={e => {
                      const k = e.target.value;
                      const spec = CRAFTSMAN_SPECS[k];
                      setDraft(prev => ({
                        ...prev,
                        tradeKey: k,
                        specialty: spec ? spec.name : prev.specialty
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13
                    }}
                  >
                    {Object.keys(TRADE_META).map(k => (
                      <option key={k} value={k}>
                        {TRADE_META[k].icon} {TRADE_META[k].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    اسم المعلم / المقاول: <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: المعلم حسن السباك"
                    value={draft.name}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Grid: Phone & Role */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    رقم الهاتف (للواتساب والاتصال):
                  </label>
                  <input
                    type="text"
                    placeholder="010XXXXXXXX"
                    value={draft.phone}
                    onChange={e => setDraft({ ...draft, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    الصفة التعاقدية:
                  </label>
                  <select
                    value={draft.role}
                    onChange={e => setDraft({ ...draft, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13
                    }}
                  >
                    <option value="معلم حرفي رئيسي">معلم حرفي رئيسي</option>
                    <option value="مقاول مصنعية">مقاول مصنعية</option>
                    <option value="مقاول باطن">مقاول باطن</option>
                    <option value="فني تخصصي">فني تخصصي</option>
                  </select>
                </div>
              </div>

              {/* National ID & Address */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    الرقم القومي (14 رقم):
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="290XXXXXXXXXXX"
                    value={draft.nationalId}
                    onChange={e => setDraft({ ...draft, nationalId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    العنوان ومحل الإقامة:
                  </label>
                  <input
                    type="text"
                    placeholder="المدينة / المركز"
                    value={draft.address}
                    onChange={e => setDraft({ ...draft, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Scope of Work in this specific site */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                  نطاق الأعمال المكلف بها في هذا الموقع تحديداً:
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: تأسيس سباكة الحمام الرئيسي والمطبخ، وتمديد مواسير التغذية والصرف وعزل الأرضية..."
                  value={draft.scope}
                  onChange={e => setDraft({ ...draft, scope: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontFamily: "'Cairo'",
                    fontSize: 13,
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Financials: Agreed Amount & Paid Amount & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    إجمالي المصنعية المتفق عليها ({currency}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={draft.agreedAmount}
                    onChange={e => setDraft({ ...draft, agreedAmount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    المدفوع له حتى الآن ({currency}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={draft.paidAmount}
                    onChange={e => setDraft({ ...draft, paidAmount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                    حالة العمل بالموقع:
                  </label>
                  <select
                    value={draft.status}
                    onChange={e => setDraft({ ...draft, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      fontFamily: "'Cairo'",
                      fontSize: 13
                    }}
                  >
                    <option value="active">🟢 قيد العمل والتنفيذ</option>
                    <option value="contract_signed">📜 تم توقيع العقد</option>
                    <option value="pending">⏳ في انتظار البدء</option>
                    <option value="completed">✅ تم التسليم والإنهاء</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>
                  ملاحظات أو اشتراطات فنية خاصة بالمهندس:
                </label>
                <input
                  type="text"
                  placeholder="مثال: يلتزم باختبار الكبس بميزان الضغط قبل دفن المواسير"
                  value={draft.notes}
                  onChange={e => setDraft({ ...draft, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--ink)',
                    fontFamily: "'Cairo'",
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Modal Footer Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 10,
                paddingTop: 16,
                borderTop: '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    fontFamily: "'Cairo'",
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 22px',
                    borderRadius: 8,
                    background: '#1877F2',
                    color: '#FFFFFF',
                    border: 'none',
                    fontFamily: "'Cairo'",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(24, 119, 242, 0.25)'
                  }}
                >
                  <Save size={15} /> <span>{editingCraftsman ? 'حفظ التعديلات' : 'إضافة الصنايعي للموقع'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
