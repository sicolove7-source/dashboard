import React from 'react';
import { FileText, CheckCircle2, Clock, AlertTriangle, FileQuestion } from 'lucide-react';

export default function TechOfficeTab({ projects, onSelect }) {
  const subMeta = { 
    "معتمد": { color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", icon: CheckCircle2 }, 
    "تحت المراجعة": { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", icon: Clock }, 
    "مطلوب تعديل": { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", icon: AlertTriangle }, 
    "مطلوب": { color: "#94A3B8", bg: "rgba(148, 163, 184, 0.1)", icon: FileQuestion } 
  };

  return (
    <div className="grid tab-fade" style={{ gap: 24 }}>
      <div className="panel">
        <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ 
            display: "flex", alignItems: "center", justifyContent: "center", 
            width: 32, height: 32, borderRadius: 8, background: "#F1F5F9" 
          }}>
            <FileText size={16} color="#0F172A" />
          </span>
          متابعة الاعتمادات والمخططات
        </h3>
        
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المشروع</th>
                <th>مسؤول المكتب الفني</th>
                <th>البند</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {projects.flatMap((p) => {
                const submittals = (p.submittals || []).length ? p.submittals : [{ item: "—", status: "—" }];
                return submittals.map((s, idx) => {
                  const meta = s.status !== "—" ? subMeta[s.status] : null;
                  const Icon = meta ? meta.icon : null;
                  
                  return (
                    <tr key={p.id + "-" + idx} onClick={() => onSelect(p)} style={{ cursor: "pointer" }}>
                      {idx === 0 ? <td rowSpan={submittals.length} style={{ fontWeight: 600, borderRight: "3px solid transparent", borderRightColor: p.status === "delayed" ? "#EF4444" : "transparent" }}>{p.name}</td> : null}
                      {idx === 0 ? <td rowSpan={submittals.length}>{p.techOffice || "—"}</td> : null}
                      <td>{s.item}</td>
                      <td>
                        {s.status !== "—" ? (
                          <span style={{ 
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            color: meta.color, background: meta.bg 
                          }}>
                            {Icon && <Icon size={12} />}
                            {s.status}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
