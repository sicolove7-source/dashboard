import React, { useState, useMemo, useRef } from 'react';
import {
  Users, CheckCircle2, AlertTriangle, TrendingUp, Plus, Pencil,
  Trash2, X, Phone, Hammer, Wallet, ClipboardList, Search, Building2, UserCheck, Star,
  Printer, BarChart2, Bell, ChevronDown, ChevronUp, Calendar, FileText
} from 'lucide-react';

const META_KEY = 'db-team-meta-v1';

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; }
}
function saveMeta(metaObj) {
  try { localStorage.setItem(META_KEY, JSON.stringify(metaObj)); } catch {}
}

export default function TeamPerformance({ projects, team, onAddMember, onUpdateMember, onRemoveMember }) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'performance'
  const [filterRole, setFilterRole] = useState('all');   // 'all' | 'engineers' | 'accountants' | 'techOffice'
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null = add, { role, oldName, ... } = edit
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    role: 'engineers',
    phone: '',
    specialty: '',
    status: 'نشط',
    notes: ''
  });

  const metaData = useMemo(() => loadMeta(), [showModal, team]);

  // Aggregate stats per engineer
  const engineerStats = useMemo(() => {
    if (!projects || !team) return [];
    const stats = {};

    (team.engineers || []).forEach(eng => {
      stats[eng] = {
        name: eng,
        activeProjects: 0,
        totalSnags: 0,
        closedSnags: 0,
        openSnags: 0,
        delayedProjects: 0,
        projectNames: []
      };
    });

    (projects || []).forEach(p => {
      if (!p.engineer || !stats[p.engineer]) return;
      const engStat = stats[p.engineer];
      engStat.activeProjects += 1;
      engStat.projectNames.push(p.name);

      if (p.status !== "on_track") {
        engStat.delayedProjects += 1;
      }

      const pSnags = p.snags || [];
      const done = pSnags.filter(s => s.status === 'done').length;

      engStat.totalSnags += pSnags.length;
      engStat.closedSnags += done;
      engStat.openSnags += (pSnags.length - done);
    });

    const arr = Object.values(stats).map(s => {
      s.closureRate = s.totalSnags > 0 ? Math.round((s.closedSnags / s.totalSnags) * 100) : 0;
      return s;
    });

    return arr.sort((a, b) => b.openSnags - a.openSnags);
  }, [projects, team]);

  const topEngineers = useMemo(() => {
    return [...engineerStats].sort((a, b) => b.closureRate - a.closureRate).slice(0, 3);
  }, [engineerStats]);

  // List of all members combined with roles
  const allMembersList = useMemo(() => {
    if (!team) return [];
    const list = [];
    const roles = [
      { key: 'engineers', label: 'مهندس موقع', groupTitle: 'مهندسو المواقع', icon: Hammer, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
      { key: 'accountants', label: 'محاسب', groupTitle: 'المحاسبون', icon: Wallet, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
      { key: 'techOffice', label: 'مكتب فني', groupTitle: 'المكتب الفني', icon: ClipboardList, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    ];

    roles.forEach(r => {
      (team[r.key] || []).forEach(name => {
        const meta = metaData[name] || {};
        const assignedProjects = (projects || []).filter(p => p.engineer === name || p.accountant === name || p.techOffice === name);
        list.push({
          name,
          roleKey: r.key,
          roleLabel: r.label,
          roleGroup: r.groupTitle,
          roleColor: r.color,
          roleBg: r.bg,
          phone: meta.phone || '',
          specialty: meta.specialty || '',
          status: meta.status || 'نشط',
          notes: meta.notes || '',
          assignedProjects,
          assignedCount: assignedProjects.length
        });
      });
    });

    return list;
  }, [team, metaData, projects]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return allMembersList.filter(m => {
      const matchRole = filterRole === 'all' || m.roleKey === filterRole;
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.roleLabel.toLowerCase().includes(q) || m.phone.includes(q);
      return matchRole && matchSearch;
    });
  }, [allMembersList, filterRole, search]);

  const openAddModal = (defaultRole = 'engineers') => {
    setEditingMember(null);
    setForm({ name: '', role: defaultRole, phone: '', specialty: '', status: 'نشط', notes: '' });
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (m) => {
    setEditingMember(m);
    setForm({
      name: m.name,
      role: m.roleKey,
      phone: m.phone,
      specialty: m.specialty,
      status: m.status,
      notes: m.notes
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSaveMember = () => {
    if (!form.name.trim()) {
      setErrorMsg('يرجى إدخال اسم المهندس / العضو');
      return;
    }

    const meta = {
      phone: form.phone,
      specialty: form.specialty,
      status: form.status,
      notes: form.notes
    };

    if (editingMember) {
      // Edit
      const success = onUpdateMember ? onUpdateMember(editingMember.roleKey, editingMember.name, form.name.trim(), meta) : true;
      if (!success) {
        setErrorMsg('هذا الاسم موجود بالفعل في الفريق');
        return;
      }
    } else {
      // Add
      const success = onAddMember ? onAddMember(form.role, form.name.trim(), meta) : true;
      if (!success) {
        setErrorMsg('هذا الاسم موجود بالفعل في الفريق');
        return;
      }
    }

    setShowModal(false);
  };

  const handleDeleteMember = (m) => {
    if (m.assignedCount > 0) {
      setErrorMsg(`لا يمكن حذف ${m.name} لأنه مسند لـ ${m.assignedCount} موقع. قم بتغيير المهندس من المشاريع أولاً.`);
      setConfirmDelete(null);
      return;
    }
    if (onRemoveMember) {
      onRemoveMember(m.roleKey, m.name);
    }
    setConfirmDelete(null);
    setErrorMsg('');
  };

  const totalEngineers = team?.engineers?.length || 0;
  const totalTeam = allMembersList.length;
  const activeCount = allMembersList.filter(m => m.status === 'نشط').length;

  return (
    <div className="grid tab-fade" style={{ gap: 24, paddingBottom: 40 }}>
      {/* Banner & KPI Top Section */}
      <div className="panel" style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'Tajawal', fontSize: 20, color: 'var(--ink)' }}>إدارة المهندسين وفريق العمل</h2>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>إضافة وتعديل بيانات المهندسين ومتابعة توزيعهم على المواقع والأداء</div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => openAddModal('engineers')} style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> إضافة مهندس / عضو جديد
          </button>
        </div>
      </div>

      {/* Error Bar */}
      {errorMsg && (
        <div className="confirm-bar" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#EF4444" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{errorMsg}</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setErrorMsg('')}><X size={16} /></button>
        </div>
      )}

      {/* Sub-tabs Navigation */}
      <div className="subtabs" style={{ marginBottom: 0 }}>
        <div className={`subtab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <Users size={16} /> دليل المهندسين والأعضاء ({totalTeam})
        </div>
        <div className={`subtab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
          <TrendingUp size={16} /> تقارير الأداء والملاحظات
        </div>
        <div className={`subtab ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>
          <Printer size={16} /> التقرير الأسبوعي والمقارنة
        </div>
      </div>

      {/* TAB 1: MEMBERS DIRECTORY & MANAGEMENT */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI Cards */}
          <div className="grid kpi-grid">
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Users size={18} /></div>
              <div className="label">إجمالي المهندسين</div>
              <div className="value">{totalEngineers}</div>
            </div>
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><UserCheck size={18} /></div>
              <div className="label">الأعضاء النشطون</div>
              <div className="value">{activeCount}</div>
            </div>
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: '#F1F5F9', color: '#475569' }}><Building2 size={18} /></div>
              <div className="label">إجمالي المواقع المسندة</div>
              <div className="value">{(projects || []).length}</div>
            </div>
          </div>

          {/* Filter & Toolbar */}
          <div className="toolbar">
            <div className="search-box" style={{ flex: 1 }}>
              <Search size={18} color="var(--muted)" />
              <input placeholder="ابحث باسم المهندس أو التخصص أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <X size={18} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />}
            </div>
            <select className="filter-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="all">كل الأقسام والتخصصات</option>
              <option value="engineers">مهندسو المواقع</option>
              <option value="accountants">المحاسبون</option>
              <option value="techOffice">المكتب الفني</option>
            </select>
          </div>

          {/* Members Cards Grid */}
          {filteredMembers.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <Users size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3 style={{ fontFamily: 'Tajawal', marginBottom: 8, color: 'var(--ink)' }}>لا يوجد أعضاء بهذه المعايير</h3>
              <p style={{ fontSize: 14 }}>اضغط على "إضافة مهندس / عضو جديد" لتمكين إضافة المهندسين.</p>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
              {filteredMembers.map(m => (
                <div key={m.roleKey + '-' + m.name} style={{
                  background: 'var(--card)', backdropFilter: 'var(--blur)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column', gap: 14, position: 'relative'
                }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, background: m.roleBg, color: m.roleColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18
                      }}>
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'Tajawal', fontWeight: 800, fontSize: 17, color: 'var(--ink)', marginBottom: 2 }}>{m.name}</div>
                        <span style={{ background: m.roleBg, color: m.roleColor, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                          {m.roleLabel}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: m.status === 'نشط' ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)',
                      color: m.status === 'نشط' ? '#10B981' : '#F59E0B'
                    }}>
                      {m.status}
                    </span>
                  </div>

                  {/* Specialty / Notes if present */}
                  {m.specialty && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star size={13} color="var(--amber)" /> التخصص: <strong style={{ color: 'var(--ink)' }}>{m.specialty}</strong>
                    </div>
                  )}

                  {/* Assigned Projects Stats */}
                  <div style={{ background: 'rgba(0,0,0,0.03)', padding: '10px 14px', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>المشاريع المسندة</span>
                    <span style={{ fontWeight: 800, fontSize: 15, color: m.assignedCount > 0 ? 'var(--teal)' : 'var(--muted)' }}>
                      {m.assignedCount} موقع
                    </span>
                  </div>

                  {/* Project Names List */}
                  {m.assignedProjects.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {m.assignedProjects.slice(0, 3).map(p => (
                        <span key={p.id} style={{ background: 'rgba(59,130,246,0.08)', color: '#3B82F6', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                          {p.name}
                        </span>
                      ))}
                      {m.assignedProjects.length > 3 && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>+{m.assignedProjects.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Action Footer (Phone, WhatsApp, Edit, Delete) */}
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px dashed var(--border)', paddingTop: 14, marginTop: 'auto' }}>
                    <a href={`tel:${m.phone}`} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(16,185,129,.1)', color: 'var(--teal)', fontSize: 13, fontWeight: 700,
                      textDecoration: 'none', padding: '8px 0', borderRadius: 10, border: '1px solid rgba(16,185,129,.2)'
                    }}>
                      <Phone size={14} /> {m.phone || 'اتصال'}
                    </a>

                    {m.phone && (
                      <a href={`https://wa.me/2${m.phone.replace(/-/g, '')}`} target="_blank" rel="noreferrer" style={{
                        width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(37,211,102,.1)', color: '#25D366', borderRadius: 10,
                        border: '1px solid rgba(37,211,102,.2)', textDecoration: 'none', fontSize: 17
                      }}>
                        💬
                      </a>
                    )}

                    <button onClick={() => openEditModal(m)} style={{
                      width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(59,130,246,.1)', color: '#3B82F6', borderRadius: 10,
                      border: '1px solid rgba(59,130,246,.2)', cursor: 'pointer'
                    }}>
                      <Pencil size={15} />
                    </button>

                    {confirmDelete === m.name ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button onClick={() => handleDeleteMember(m)} style={{ padding: '6px 12px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                          تأكيد
                        </button>
                        <button onClick={() => setConfirmDelete(null)} style={{ padding: '6px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--muted)' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(m.name)} style={{
                        width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(239,68,68,.1)', color: 'var(--danger)', borderRadius: 10,
                        border: '1px solid rgba(239,68,68,.2)', cursor: 'pointer'
                      }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERFORMANCE REPORTS & SNAG ANALYTICS */}
      {activeTab === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="grid kpi-grid">
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: "rgba(59, 130, 246, 0.1)" }}><Users size={20} color="#3B82F6" /></div>
              <div className="label">إجمالي المهندسين المسجلين</div>
              <div className="value">{engineerStats.length}</div>
            </div>
            <div className="kpi-card">
              <div className="icon-wrap" style={{ background: "rgba(16, 185, 129, 0.1)" }}><CheckCircle2 size={20} color="#10B981" /></div>
              <div className="label">متوسط نسبة إغلاق الملاحظات</div>
              <div className="value">
                {engineerStats.length ? Math.round(engineerStats.reduce((acc, curr) => acc + curr.closureRate, 0) / engineerStats.length) : 0}%
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            <div className="panel">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={18} color="#0F172A" /> أفضل المهندسين أداءً (حسب الإغلاق)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {topEngineers.map((eng, idx) => (
                  <div key={eng.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: "rgba(16, 185, 129, 0.05)", borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: "var(--teal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--ink)" }}>{eng.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{eng.activeProjects} مواقع نشطة</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "left", direction: "ltr", fontWeight: 800, fontSize: 18, color: "var(--teal)" }}>
                      {eng.closureRate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={18} color="#0F172A" /> تنبيهات: أكثر الملاحظات المفتوحة
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                {engineerStats.slice(0, 3).map((eng) => (
                  <div key={eng.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: "rgba(245, 158, 11, 0.05)", borderRadius: 8, border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--ink)" }}>{eng.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>متأخر في {eng.delayedProjects} مشاريع</div>
                    </div>
                    <div style={{ textAlign: "left", direction: "ltr" }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--amber)" }}>{eng.openSnags}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>ملاحظات مفتوحة</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>جدول التفاصيل وتوزيع المواقع للمهندسين</h3>
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المهندس</th>
                    <th>المشاريع النشطة</th>
                    <th>المشاريع المتأخرة</th>
                    <th>إجمالي الملاحظات</th>
                    <th>مغلقة</th>
                    <th>مفتوحة</th>
                    <th>نسبة الإغلاق</th>
                  </tr>
                </thead>
                <tbody>
                  {engineerStats.map((eng) => (
                    <tr key={eng.name}>
                      <td style={{ fontWeight: 700 }}>{eng.name}</td>
                      <td>{eng.activeProjects}</td>
                      <td>
                        {eng.delayedProjects > 0 ? (
                          <span style={{ color: "var(--danger)", fontWeight: "bold" }}>{eng.delayedProjects}</span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>0</span>
                        )}
                      </td>
                      <td>{eng.totalSnags}</td>
                      <td style={{ color: "var(--teal)" }}>{eng.closedSnags}</td>
                      <td style={{ color: eng.openSnags > 5 ? "var(--amber)" : "var(--ink)" }}>{eng.openSnags}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="bar-track" style={{ width: 60, height: 6 }}>
                            <div className="bar-fill" style={{ width: `${eng.closureRate}%`, background: eng.closureRate > 80 ? "var(--teal)" : eng.closureRate > 40 ? "var(--amber)" : "var(--danger)" }}></div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{eng.closureRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY REPORT & COMPARISON */}
      {activeTab === 'weekly' && (
        <WeeklyReportTab engineerStats={engineerStats} projects={projects} team={team} />
      )}

      {/* ADD / EDIT MEMBER MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Users size={20} /> {editingMember ? 'تعديل بيانات المهندس / العضو' : 'إضافة عضو جديد للفريق'}</h3>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>الاسم الكامل *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: م. أحمد محمود" />
                </div>
                <div className="form-group">
                  <label>القسم / الدور</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={!!editingMember}>
                    <option value="engineers">مهندسو المواقع</option>
                    <option value="accountants">المحاسبون</option>
                    <option value="techOffice">المكتب الفني</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>الحالة</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="نشط">نشط</option>
                    <option value="إجازة">إجازة</option>
                    <option value="غير نشط">غير نشط</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="010-..." />
                </div>
                <div className="form-group">
                  <label>التخصص / المجال</label>
                  <input type="text" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="مثال: تشطيبات سكنية / مدني" />
                </div>
              </div>
              <div className="form-group">
                <label>ملاحظات إضافية</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="أي معلومات أخرى..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontFamily: 'Cairo', fontSize: 14, resize: 'vertical', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleSaveMember} disabled={!form.name.trim()}>
                {editingMember ? 'تحديث البيانات' : 'حفظ وإضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   WEEKLY REPORT & COMPARISON TAB
════════════════════════════════════════════════════════════ */
function WeeklyReportTab({ engineerStats, projects }) {
  const [selectedEng, setSelectedEng] = useState(null);
  const printRef = useRef(null);

  const today = new Date();
  const fmtD = (d) => d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);

  // Max for bar scaling
  const maxProjects = Math.max(1, ...engineerStats.map(e => e.activeProjects));

  // Rank engineers
  const ranked = [...engineerStats].map(e => ({
    ...e,
    score: (e.closureRate * 0.6) + ((1 - e.delayedProjects / Math.max(1, e.activeProjects)) * 40),
  })).sort((a, b) => b.score - a.score);

  // Build alerts
  const alerts = [];
  (projects || []).forEach(p => {
    if (p.status === 'delayed') {
      alerts.push({ type: 'danger', msg: `موقع "${p.name}" متأخر عن الجدول`, detail: `إنجاز ${p.progress}% — المهندس: ${p.engineer}`, eng: p.engineer });
    } else if (p.status === 'at_risk') {
      alerts.push({ type: 'warning', msg: `موقع "${p.name}" يحتاج متابعة`, detail: `إنجاز ${p.progress}% — المهندس: ${p.engineer}`, eng: p.engineer });
    }
    const openSnags = (p.snags || []).filter(s => s.status !== 'done').length;
    if (openSnags > 3) {
      alerts.push({ type: 'warning', msg: `${openSnags} ملاحظات مفتوحة في "${p.name}"`, detail: `المهندس المسؤول: ${p.engineer}`, eng: p.engineer });
    }
  });

  const engForReport = selectedEng ? engineerStats.find(e => e.name === selectedEng) : null;
  const engProjects  = selectedEng ? (projects || []).filter(p => p.engineer === selectedEng) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ALERTS */}
      <div style={{ background: 'var(--card)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', background: 'rgba(239,68,68,0.06)', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
          <Bell size={18} color="#EF4444" />
          <span style={{ fontWeight: 700, color: '#EF4444', fontSize: 15 }}>التنبيهات العاجلة</span>
          <span style={{ marginRight: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
            {alerts.length} تنبيه
          </span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
              ✅ لا توجد تنبيهات عاجلة — جميع المواقع على ما يرام!
            </div>
          )}
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10,
              background: a.type === 'danger' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
              border: `1px solid ${a.type === 'danger' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
            }}>
              <AlertTriangle size={16} color={a.type === 'danger' ? '#EF4444' : '#F59E0B'} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: a.type === 'danger' ? '#EF4444' : '#92400E' }}>{a.msg}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{a.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COMPARISON BARS */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={18} color="#6366F1" />
          <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>مقارنة أداء المهندسين</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 'auto' }}>الترتيب: الأعلى إغلاقاً + الأقل تأخيراً</span>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
            {[['#10B981','نسبة إغلاق الملاحظات'],['#6366F1','المشاريع النشطة'],['#EF4444','المتأخرة']].map(([c,l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} /> {l}
              </span>
            ))}
          </div>

          {ranked.map((eng, idx) => (
            <div key={eng.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13,
                  background: idx === 0 ? '#FCD34D' : idx === 1 ? '#E2E8F0' : idx === 2 ? '#FED7AA' : 'var(--bg)',
                  color: '#1E293B',
                }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', flex: 1 }}>{eng.name}</div>
                <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>{eng.closureRate}% إغلاق</span>
                  <span style={{ color: '#6366F1', fontWeight: 600 }}>{eng.activeProjects} موقع</span>
                  {eng.delayedProjects > 0 && <span style={{ color: '#EF4444', fontWeight: 700 }}>⚠️ {eng.delayedProjects} متأخر</span>}
                </div>
                <button
                  onClick={() => setSelectedEng(selectedEng === eng.name ? null : eng.name)}
                  style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid var(--border)', background: selectedEng === eng.name ? '#6366F1' : 'var(--bg)', color: selectedEng === eng.name ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s' }}
                >
                  {selectedEng === eng.name ? '✕ إخفاء' : '📄 تقرير'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { label: 'نسبة الإغلاق', val: eng.closureRate, max: 100, color: eng.closureRate > 75 ? '#10B981' : eng.closureRate > 40 ? '#F59E0B' : '#EF4444', suffix: '%' },
                  { label: 'المشاريع النشطة', val: eng.activeProjects, max: maxProjects, color: '#6366F1', suffix: '' },
                  ...(eng.delayedProjects > 0 ? [{ label: 'متأخرة', val: eng.delayedProjects, max: maxProjects, color: '#EF4444', suffix: '' }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 100, fontSize: 11, color: row.color === '#EF4444' ? '#EF4444' : 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>{row.label}</span>
                    <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(row.val / row.max) * 100}%`, background: row.color, borderRadius: 99, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ width: 36, fontSize: 12, fontWeight: 700, color: row.color, textAlign: 'left', flexShrink: 0 }}>{row.val}{row.suffix}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRINTABLE WEEKLY REPORT */}
      {selectedEng && engForReport && (
        <div style={{ background: 'var(--card)', border: '1.5px solid rgba(99,102,241,0.25)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} color="#6366F1" />
            <span style={{ fontWeight: 700, color: '#6366F1', fontSize: 15 }}>التقرير الأسبوعي — {selectedEng}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 'auto' }}>
              {fmtD(weekStart)} ← {fmtD(today)}
            </span>
            <button onClick={() => window.print()} className="btn btn-primary no-print" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Printer size={15} /> طباعة التقرير
            </button>
          </div>

          <div ref={printRef} className="print-container" style={{ padding: 24 }}>
            {/* Report header */}
            <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid var(--border)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>شركة أملاك للعمارة والديكور</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>التقرير الأسبوعي لأداء المهندس</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#6366F1', marginTop: 8 }}>{selectedEng}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>الفترة: {fmtD(weekStart)} — {fmtD(today)}</div>
            </div>

            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { l: 'المشاريع النشطة',   v: engForReport.activeProjects,   c: '#6366F1' },
                { l: 'المشاريع المتأخرة', v: engForReport.delayedProjects,  c: '#EF4444' },
                { l: 'ملاحظات مفتوحة',   v: engForReport.openSnags,        c: '#F59E0B' },
                { l: 'نسبة الإغلاق',      v: engForReport.closureRate + '%', c: '#10B981' },
              ].map(k => (
                <div key={k.l} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, border: `1.5px solid ${k.c}30`, background: `${k.c}08` }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: k.c }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* Projects table */}
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={15} /> المشاريع المسندة ({engProjects.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['اسم المشروع','العميل','نسبة الإنجاز','الحالة','تاريخ التسليم','ملاحظات مفتوحة'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600, borderBottom: '2px solid var(--border)', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engProjects.map((p, i) => {
                  const open = (p.snags || []).filter(s => s.status !== 'done').length;
                  const sc = p.status === 'on_track' ? '#10B981' : p.status === 'at_risk' ? '#F59E0B' : '#EF4444';
                  const sl = p.status === 'on_track' ? 'على المسار' : p.status === 'at_risk' ? 'يحتاج متابعة' : 'متأخر';
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{p.name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{p.client}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${p.progress}%`, background: sc, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: sc }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${sc}15`, color: sc }}>{sl}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12, borderBottom: '1px solid var(--border)' }}>{p.dueDate}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: 700, color: open > 0 ? '#F59E0B' : '#10B981' }}>{open}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Engineer alerts */}
            {alerts.filter(a => a.eng === selectedEng).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#EF4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={15} /> تنبيهات تحتاج اتخاذ إجراء
                </div>
                {alerts.filter(a => a.eng === selectedEng).map((a, i) => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 6, background: a.type === 'danger' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)', border: `1px solid ${a.type === 'danger' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: a.type === 'danger' ? '#EF4444' : '#92400E' }}>{a.msg}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{a.detail}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Signature */}
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, paddingTop: 20, borderTop: '2px solid var(--border)' }}>
              {['توقيع المهندس', 'اعتماد المدير', 'التاريخ'].map(s => (
                <div key={s} style={{ textAlign: 'center' }}>
                  <div style={{ height: 48, borderBottom: '1.5px solid var(--border)', marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{s}</div>
                  {s === 'التاريخ' && <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 4 }}>{today.toLocaleDateString('ar-EG')}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
