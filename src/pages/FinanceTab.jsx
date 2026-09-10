import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { money } from '../utils/helpers';

export default function FinanceTab({ projects }) {
  const totalBudget = projects.reduce((a, p) => a + p.budget, 0);
  const totalSpent = projects.reduce((a, p) => a + p.spent, 0);
  
  // Sort projects by budget descending to show largest projects first
  const sortedProjects = [...projects].sort((a, b) => b.budget - a.budget);
  
  const chartData = sortedProjects.slice(0, 12).map((p, i) => ({ 
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name, 
    budget: p.budget, 
    spent: p.spent 
  }));

  return (
    <div className="grid tab-fade" style={{ gap: 24 }}>
      <div className="grid kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="kpi-card">
          <div className="label">إجمالي قيمة العقود</div>
          <div className="value" style={{ color: "#F59E0B" }}>{money(totalBudget)}</div>
        </div>
        <div className="kpi-card">
          <div className="label">إجمالي المصروفات حتى الآن</div>
          <div className="value" style={{ color: "#EF4444" }}>{money(totalSpent)}</div>
        </div>
        <div className="kpi-card">
          <div className="label">المتبقي من الميزانيات</div>
          <div className="value" style={{ color: "#10B981" }}>{money(totalBudget - totalSpent)}</div>
        </div>
      </div>

      <div className="panel">
        <h3>الميزانية مقابل المصروف (أكبر 12 مشروع)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Cairo" }} angle={-25} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => (value / 1000) + 'k'} />
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
              contentStyle={{ fontFamily: "Cairo", fontSize: 13, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
              formatter={(v) => money(v)} 
            />
            <Bar dataKey="budget" fill="var(--border)" name="الميزانية" radius={[4, 4, 0, 0]} />
            <Bar dataKey="spent" fill="#F59E0B" name="المصروف" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>كشف حساب جميع المشاريع</h3>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            طباعة التقرير
          </button>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المشروع</th>
                <th>المحاسب المسؤول</th>
                <th>الميزانية المقررة</th>
                <th>المصروفات</th>
                <th>المتبقي</th>
                <th>حالة الصرف</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((p) => {
                const isOverspent = p.spent > p.budget;
                const spendPercentage = p.budget > 0 ? (p.spent / p.budget) * 100 : 0;
                
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.accountant}</td>
                    <td className="font-mono">{money(p.budget)}</td>
                    <td className="font-mono" style={{ color: isOverspent ? "#EF4444" : "inherit" }}>
                      {money(p.spent)}
                    </td>
                    <td className="font-mono" style={{ color: "#10B981" }}>{money(p.budget - p.spent)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ 
                            width: `${Math.min(spendPercentage, 100)}%`, 
                            height: "100%", 
                            background: isOverspent ? "#EF4444" : spendPercentage > 85 ? "#F59E0B" : "#10B981" 
                          }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: 11, width: 35 }}>{Math.round(spendPercentage)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
