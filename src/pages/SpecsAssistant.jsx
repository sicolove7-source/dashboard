import React, { useState, useMemo, useEffect } from 'react';
import { Search, Copy, CheckCircle2, FileText, BrainCircuit, X, Plus, ShoppingCart, Printer, Trash2, ListChecks } from 'lucide-react';
import { SPECS_DATABASE } from '../utils/specsDatabase';

export default function SpecsAssistant({ userRole }) {
  const [specs, setSpecs] = useState([]);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedSpec, setSelectedSpec] = useState(null);
  
  // New Spec Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSpec, setNewSpec] = useState({ title: '', category: '', description: '', specs: '', image: '' });

  // BOQ Cart State
  const [boqCart, setBoqCart] = useState([]);
  const [showBoqModal, setShowBoqModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('customSpecs');
    if (saved) {
      setSpecs(JSON.parse(saved));
    } else {
      setSpecs(SPECS_DATABASE);
      localStorage.setItem('customSpecs', JSON.stringify(SPECS_DATABASE));
    }
  }, []);

  const handleAddSpec = () => {
    if (!newSpec.title || !newSpec.specs) return;
    const item = {
      ...newSpec,
      id: "custom-" + Date.now(),
      tags: newSpec.title.split(" "),
      image: newSpec.image || "https://images.unsplash.com/photo-1541888087625-f814d1f42bb6?auto=format&fit=crop&q=80&w=800"
    };
    const updated = [item, ...specs];
    setSpecs(updated);
    localStorage.setItem('customSpecs', JSON.stringify(updated));
    setShowAddForm(false);
    setNewSpec({ title: '', category: '', description: '', specs: '', image: '' });
  };

  const results = useMemo(() => {
    if (!query.trim()) return specs;
    const q = query.toLowerCase();
    return specs.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q) ||
      item.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }, [query, specs]);

  const copyToClipboard = (text, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleBoqItem = (item, e) => {
    e.stopPropagation();
    if (boqCart.some(i => i.id === item.id)) {
      setBoqCart(boqCart.filter(i => i.id !== item.id));
    } else {
      setBoqCart([...boqCart, { ...item, qty: 1, unit: 'متر', price: 0 }]);
    }
  };

  const printBOQ = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>مقايسة أعمال تشطيبات</title>
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #1e293b; }
            h1 { text-align: center; color: #0f172a; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: right; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .spec-text { white-space: pre-wrap; font-size: 13px; color: #475569; margin-top: 8px; }
            .footer { margin-top: 50px; text-align: center; font-size: 14px; color: #64748b; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>جدول كميات ومواصفات الأعمال (BOQ)</h1>
          <table>
            <thead>
              <tr>
                <th width="5%">م</th>
                <th width="20%">البند</th>
                <th width="50%">التوصيف الهندسي</th>
                <th width="10%">الوحدة</th>
                <th width="15%">الكمية المقدرة</th>
              </tr>
            </thead>
            <tbody>
              ${boqCart.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${item.title}</strong><br/><small>${item.category}</small></td>
                  <td><div class="spec-text">${item.specs}</div></td>
                  <td>${item.unit}</td>
                  <td>${item.qty}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #0ea5e9; color: white; border: none; border-radius: 6px; display: block; margin: 0 auto;">طباعة المقايسة الآن</button>
          <div class="footer">تم إنشاء هذه المقايسة بواسطة نظام إدارة التشطيبات</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid" style={{ gap: 24, paddingBottom: 40 }}>
      {/* Search Header */}
      <div className="panel" style={{ background: "linear-gradient(135deg, var(--navy), var(--ink))", color: "#fff", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit size={28} color="#F59E0B" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontFamily: "Tajawal", color: "#F8FAFC" }}>مساعد التوصيف والمقايسات</h2>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>ابحث عن البنود، انسخ التوصيفات، وقم بتجميع مقايسة مشروعك في ثوانٍ</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {userRole === 'manager' && (
              <button className="btn" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }} onClick={() => setShowAddForm(true)}>
                <Plus size={18} /> إضافة بند جديد
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowBoqModal(true)} style={{ position: "relative" }}>
              <ListChecks size={18} /> عرض المقايسة
              {boqCart.length > 0 && (
                <span style={{ position: "absolute", top: -8, right: -8, background: "var(--danger)", color: "#fff", fontSize: 12, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                  {boqCart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="search-box" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", color: "#fff" }}>
          <Search size={18} color="rgba(255,255,255,0.6)" />
          <input 
            type="text" 
            placeholder="اكتب اسم البند للبحث..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ color: "#fff" }}
          />
          {query && <X size={18} color="rgba(255,255,255,0.6)" style={{ cursor: "pointer" }} onClick={() => setQuery('')} />}
        </div>
      </div>

      {/* Results Grid */}
      {results.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 style={{ fontFamily: "Tajawal" }}>لم نتمكن من العثور على التوصيف المطلوب</h3>
          <p>جرب استخدام كلمات أبسط أو أضف البند بنفسك</p>
        </div>
      ) : (
        <div className="grid project-grid">
          {results.map(item => {
            const inCart = boqCart.some(i => i.id === item.id);
            return (
              <div key={item.id} className="project-card" onClick={() => setSelectedSpec(item)} style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", border: inCart ? "2px solid var(--teal)" : "" }}>
                <div style={{ width: "100%", height: 160, position: "relative" }}>
                  <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", color: "#fff", padding: "4px 10px", borderRadius: 16, fontSize: 12, fontWeight: 700 }}>
                    {item.category}
                  </div>
                  {inCart && (
                    <div style={{ position: "absolute", top: 12, left: 12, background: "var(--teal)", color: "#fff", padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={14} /> مضاف للمقايسة
                    </div>
                  )}
                </div>
                <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontFamily: "Tajawal", fontSize: 18, color: "var(--ink)" }}>{item.title}</h3>
                  <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</p>
                  
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button 
                      className={`btn ${inCart ? 'btn-ghost' : 'btn-primary'}`} 
                      style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                      onClick={(e) => toggleBoqItem(item, e)}
                    >
                      {inCart ? "إزالة من المقايسة" : "إضافة للمقايسة"}
                    </button>
                    <button 
                      className="btn" 
                      style={{ padding: "8px 12px" }}
                      onClick={(e) => copyToClipboard(item.specs, item.id, e)}
                      title="نسخ التوصيف السريع"
                    >
                      {copiedId === item.id ? <CheckCircle2 size={18} color="var(--teal)" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOQ Modal */}
      {showBoqModal && (
        <div className="modal-overlay" onClick={() => setShowBoqModal(false)}>
          <div className="modal-content" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><ListChecks size={20} /> مسودة المقايسة (BOQ)</h3>
              <button className="btn btn-ghost" onClick={() => setShowBoqModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              {boqCart.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>
                  <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                  <h4>المقايسة فارغة حالياً</h4>
                  <p>قم بالبحث عن البنود وإضافتها لتكوين المقايسة الخاصة بك.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>م</th>
                        <th>البند</th>
                        <th>الوحدة</th>
                        <th>الكمية</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boqCart.map((item, idx) => (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700 }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: "var(--muted)", maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.description}</div>
                          </td>
                          <td>
                            <input 
                              type="text" 
                              value={item.unit} 
                              onChange={(e) => setBoqCart(boqCart.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i))}
                              style={{ width: 80, padding: 4, borderRadius: 4, border: "1px solid var(--border)", fontFamily: "Cairo" }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              value={item.qty} 
                              onChange={(e) => setBoqCart(boqCart.map(i => i.id === item.id ? { ...i, qty: e.target.value } : i))}
                              style={{ width: 80, padding: 4, borderRadius: 4, border: "1px solid var(--border)", fontFamily: "Cairo" }}
                            />
                          </td>
                          <td>
                            <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setBoqCart(boqCart.filter(i => i.id !== item.id))}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-ghost" onClick={() => setBoqCart([])}>تفريغ المقايسة</button>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => setShowBoqModal(false)}>إغلاق</button>
                <button className="btn btn-primary" onClick={printBOQ} disabled={boqCart.length === 0}><Printer size={18} /> طباعة / تصدير PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Spec Form Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Plus size={20} /> إضافة بند توصيف جديد للمكتبة</h3>
              <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label>اسم البند *</label>
                <input type="text" value={newSpec.title} onChange={e => setNewSpec({...newSpec, title: e.target.value})} placeholder="مثال: توريد وتركيب ألوميتال قطاع جامبو" />
              </div>
              <div className="form-group">
                <label>التصنيف</label>
                <input type="text" value={newSpec.category} onChange={e => setNewSpec({...newSpec, category: e.target.value})} placeholder="مثال: أعمال الألوميتال والواجهات" />
              </div>
              <div className="form-group">
                <label>وصف مختصر</label>
                <input type="text" value={newSpec.description} onChange={e => setNewSpec({...newSpec, description: e.target.value})} placeholder="وصف سريع لاستخدام البند" />
              </div>
              <div className="form-group">
                <label>التوصيف الهندسي الكامل *</label>
                <textarea rows="5" value={newSpec.specs} onChange={e => setNewSpec({...newSpec, specs: e.target.value})} placeholder="اكتب التوصيف الهندسي الدقيق الذي سيتم الاعتماد عليه في التنفيذ والاستلام..."></textarea>
              </div>
              <div className="form-group">
                <label>رابط صورة (اختياري)</label>
                <input type="text" value={newSpec.image} onChange={e => setNewSpec({...newSpec, image: e.target.value})} placeholder="https://example.com/image.jpg" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleAddSpec} disabled={!newSpec.title || !newSpec.specs}>حفظ البند</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSpec && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelectedSpec(null)}>
          <div style={{ background: "var(--card)", borderRadius: "var(--radius)", width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
            <div style={{ height: 250, position: "relative" }}>
              <img src={selectedSpec.image} alt={selectedSpec.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => setSelectedSpec(null)} style={{ position: "absolute", top: 16, left: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: 32 }}>
              <div style={{ color: "var(--amber)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{selectedSpec.category}</div>
              <h2 style={{ fontFamily: "Tajawal", fontSize: 28, margin: "0 0 16px 0", color: "var(--ink)" }}>{selectedSpec.title}</h2>
              <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>{selectedSpec.description}</p>
              <div style={{ background: "rgba(0,0,0,0.03)", padding: 24, borderRadius: 12, border: "1px solid var(--border)" }}>
                <h4 style={{ margin: "0 0 16px 0", fontFamily: "Tajawal", display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}><FileText size={18} color="var(--teal)" /> نص التوصيف الهندسي المعتمد</h4>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8, color: "var(--ink)", fontFamily: "Cairo", fontWeight: 600 }}>{selectedSpec.specs}</div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 32, justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setSelectedSpec(null)}>إغلاق</button>
                <button className="btn btn-primary" onClick={(e) => copyToClipboard(selectedSpec.specs, selectedSpec.id, e)}>
                  {copiedId === selectedSpec.id ? <><CheckCircle2 size={18} /> تم النسخ!</> : <><Copy size={18} /> نسخ التوصيف</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
