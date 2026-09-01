import React, { useState } from 'react';
import { Hammer, Wallet, ClipboardList, Plus, Trash2, X, Headphones } from 'lucide-react';

export default function TeamTab({ projects, team, onAdd, onRemove }) {
  const [newMembers, setNewMembers] = useState({ engineers: "", accountants: "", techOffice: "", customerService: "" });
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null); // format: "role-name"

  const groups = [
    { key: "engineers",       title: "مهندسو المواقع", people: team?.engineers       || [], icon: Hammer,      color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
    { key: "accountants",     title: "المحاسبون",       people: team?.accountants     || [], icon: Wallet,      color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
    { key: "techOffice",      title: "المكتب الفني",    people: team?.techOffice      || [], icon: ClipboardList, color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
    { key: "customerService", title: "خدمة العملاء",   people: team?.customerService || [], icon: Headphones,  color: "#EC4899", bg: "rgba(236, 72, 153, 0.1)" },
  ];


  const handleAdd = (role) => {
    const name = newMembers[role];
    if (!name || !name.trim()) {
      setError("الرجاء إدخال اسم العضو");
      return;
    }
    const success = onAdd(role, name);
    if (!success) {
      setError("هذا الاسم موجود بالفعل");
    } else {
      setNewMembers({ ...newMembers, [role]: "" });
      setError("");
    }
  };

  const handleRemove = (role, name) => {
    // Check if the member is assigned to any project
    const assigned = projects.filter((p) => p.engineer === name || p.accountant === name || p.techOffice === name);
    if (assigned.length > 0) {
      setError(`لا يمكن حذف ${name} لأنه مرتبط بـ ${assigned.length} مشاريع`);
      setConfirmId(null);
      return;
    }
    onRemove(role, name);
    setConfirmId(null);
    setError("");
  };

  return (
    <div className="grid tab-fade" style={{ gap: 24 }}>
      {error && (
        <div className="confirm-bar" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <span>{error}</span>
          <button className="icon-btn" style={{ border: "none", background: "transparent" }} onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}

      {groups.map((g) => (
        <div className="panel" key={g.key}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 10, margin: 0 }}>
              <span style={{ 
                display: "flex", alignItems: "center", justifyContent: "center", 
                width: 32, height: 32, borderRadius: 8, background: g.bg 
              }}>
                <g.icon size={16} color={g.color} />
              </span>
              {g.title}
            </h3>
          </div>
          
          <div style={{ display: "flex", gap: 10, marginBottom: 20, background: "rgba(0,0,0,0.01)", padding: 12, borderRadius: 8, border: "1px solid var(--border)" }}>
            <input 
              type="text"
              className="filter-input"
              style={{ flex: 1 }}
              placeholder={`إضافة عضو جديد لقسم ${g.title}...`}
              value={newMembers[g.key]}
              onChange={(e) => setNewMembers({ ...newMembers, [g.key]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd(g.key)}
            />
            <button className="btn btn-primary" onClick={() => handleAdd(g.key)}><Plus size={16} /> إضافة</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>عدد المشاريع الحالية</th>
                  <th>مشاريع متأخرة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {g.people.map((name) => {
                  const assigned = projects.filter((p) => p.engineer === name || p.accountant === name || p.techOffice === name);
                  const delayed = assigned.filter((p) => p.status === "delayed").length;
                  const cid = `${g.key}-${name}`;
                  return (
                    <tr key={name}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td className="font-mono">{assigned.length}</td>
                      <td className="font-mono">
                        {delayed > 0 ? (
                          <span style={{ 
                            background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", 
                            padding: "2px 8px", borderRadius: "12px", fontWeight: "bold" 
                          }}>
                            {delayed}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>0</span>
                        )}
                      </td>
                      <td style={{ textAlign: "left" }}>
                        {confirmId === cid ? (
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => handleRemove(g.key, name)}>تأكيد الحذف</button>
                            <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setConfirmId(null)}>إلغاء</button>
                          </div>
                        ) : (
                          <span className="icon-btn" style={{ marginLeft: "auto" }} onClick={() => { setError(""); setConfirmId(cid); }}><Trash2 size={14} /></span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {g.people.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>لا يوجد أعضاء في هذا القسم.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
