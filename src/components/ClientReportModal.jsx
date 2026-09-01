import React, { useState } from 'react';
import {
  X, Printer, Copy, Check, MessageCircle, Building2, Calendar,
  CheckCircle2, Clock, ShieldCheck, User, MapPin, Sparkles, Award
} from 'lucide-react';
import { PROJECT_PHASES, QUALITY_GATES } from '../utils/constants';
import { fmtDate, todayISO } from '../utils/helpers';
import { printElement } from '../utils/printHelper';

export default function ClientReportModal({ project, onClose }) {
  const [copied, setCopied] = useState(false);

  const phasesData = project.phasesData || {};
  const qualityData = project.qualityData || {};

  // Compute stats
  const phases = PROJECT_PHASES.map(ph => {
    const pData = phasesData[ph.id] || {};
    const itemsData = pData.items || {};
    const doneCount = ph.items.filter(i => itemsData[i.id]?.done).length;
    const totalCount = ph.items.length;
    return {
      ...ph,
      doneCount,
      totalCount,
      pct: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
      status: pData.status || (doneCount === totalCount && totalCount > 0 ? 'done' : doneCount > 0 ? 'progress' : 'pending')
    };
  });

  const overallPhasePct = Math.round(phases.reduce((acc, p) => acc + p.pct, 0) / phases.length);

  // Completed Quality Gates
  const passedGates = QUALITY_GATES.filter(g => qualityData[g.id]?.status === 'passed');

  function generateWhatsAppText() {
    let msg = `*تقرير إنجاز موقع: ${project.name}*\n`;
    msg += `التاريخ: ${fmtDate(todayISO())}\n`;
    msg += `العميل: ${project.client || 'المحترم'}\n`;
    msg += `نسبة الإنجاز الكلية: ${project.progress || overallPhasePct}%\n\n`;
    
    msg += `*📊 الموقف التنفيذي للمراحل:*\n`;
    phases.forEach(ph => {
      const icon = ph.pct === 100 ? '✅' : ph.pct > 0 ? '⏳' : '⚪';
      msg += `${icon} ${ph.name}: ${ph.pct}% (${ph.doneCount}/${ph.totalCount} بند)\n`;
    });

    if (passedGates.length > 0) {
      msg += `\n*🛡️ اختبارات ومعايير الجودة المعتمدة:*\n`;
      passedGates.forEach(g => {
        msg += `✓ ${g.title}\n`;
      });
    }

    if (project.dueDate) {
      msg += `\n📅 موعد التسليم التعاقدي المخطط: ${fmtDate(project.dueDate)}\n`;
    }

    msg += `\n_شركة أملاك للعمارة والديكور - نتمنى لكم يوماً سعيداً_ 🏡✨`;
    return msg;
  }

  function copyWhatsAppText() {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function openWhatsAppDirect() {
    const text = encodeURIComponent(generateWhatsAppText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handlePrint() {
    printElement('client-report-printable', `تقرير_متابعة_${project.name || 'الموقع'}`);
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)' }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 780, width: '95%', maxHeight: '92vh', overflowY: 'auto',
          borderRadius: 20, border: '1px solid var(--border)', background: 'var(--card)', padding: 0
        }}
      >
        {/* Modal Action Bar (No-Print) */}
        <div className="no-print" style={{
          padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, #1E1B4B, #312E81)', color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={22} color="#FCD34D" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>تقرير العميل الرسمي للمتابعة</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>جاهز للإرسال على الواتساب أو الطباعة PDF (بدون التكاليف السرية)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={copyWhatsAppText}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                background: copied ? '#10B981' : 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'تم النسخ بنجاح!' : 'نسخ نص الواتساب'}
            </button>

            <button
              onClick={openWhatsAppDirect}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                background: '#25D366', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              <MessageCircle size={16} /> إرسال واتساب
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              <Printer size={16} /> طباعة PDF
            </button>

            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINT CONTAINER / CLIENT REPORT BODY */}
        <div id="client-report-printable" className="print-container" style={{ padding: '32px 36px', color: 'var(--ink)' }}>

          {/* Letterhead Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: -0.5 }}>شركة أملاك للعمارة والديكور</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>إدارة التشطيبات الداخلية والتنفيذ الهندسي المتميز</div>
              <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700, marginTop: 4 }}>تقرير إنجاز ومتابعة الموقع الأسبوعي</div>
            </div>
            <div style={{ textAlign: 'left', direction: 'ltr' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>تاريخ التقرير</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{fmtDate(todayISO())}</div>
            </div>
          </div>

          {/* Project Details Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.05))',
            border: '1.5px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '20px 24px', marginBottom: 24
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>اسم الموقع والمشروع</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{project.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>المالك / العميل</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{project.client || 'غير محدد'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>الموقع والمنطقة</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{project.area || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>المهندس المشرف</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--teal)' }}>{project.engineer || 'الإدارة الهندسية'}</div>
              </div>
            </div>
          </div>

          {/* Overall Progress Gauge */}
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16,
            padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>نسبة الإنجاز التنفيذي الفعلي للمشروع</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>محسوبة من بنود واختبارات المراحل الأربعة</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 140, height: 10, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${project.progress || overallPhasePct}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #059669)', borderRadius: 99 }} />
              </div>
              <span className="font-mono" style={{ fontSize: 26, fontWeight: 900, color: 'var(--teal)' }}>{project.progress || overallPhasePct}%</span>
            </div>
          </div>

          {/* 4 Phases Breakdown */}
          <h3 style={{ margin: '0 0 16px', fontSize: 16, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} color="var(--teal)" /> الموقف التنفيذي للمراحل الأربعة
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {phases.map((ph, idx) => (
              <div key={ph.id} style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: ph.pct === 100 ? '#10B981' : ph.pct > 0 ? '#3B82F6' : '#94A3B8',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{ph.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ph.description}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <span className="font-mono" style={{
                      fontWeight: 800, fontSize: 14,
                      color: ph.pct === 100 ? '#10B981' : ph.pct > 0 ? '#3B82F6' : 'var(--muted)'
                    }}>
                      {ph.pct}%
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>({ph.doneCount}/{ph.totalCount} بند منجز)</div>
                  </div>
                </div>

                <div style={{ width: '100%', height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: `${ph.pct}%`, height: '100%',
                    background: ph.pct === 100 ? '#10B981' : '#3B82F6',
                    borderRadius: 99, transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quality Gates Section */}
          {passedGates.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="#F59E0B" /> بوابات واختبارات الجودة المجتازة
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {passedGates.map(g => (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)'
                  }}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{g.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>تم الفحص والاعتماد الهندسي بنجاح</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Guarantee Notice */}
          <div style={{
            background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28
          }}>
            <ShieldCheck size={28} color="#10B981" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#065F46' }}>معايير وضمان الجودة الهندسية</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                يتم تنفيذ كافة الأعمال وفق الكود الهندسي المصري وتحت إشراف مباشر، مع إجراء اختبارات العزل بالغمر المائي 48 ساعة واختبار كبس مواسير السباكة بالبار قبل تقفيل المحارة والسيراميك.
              </div>
            </div>
          </div>

          {/* Signature / Stamp Footer */}
          <div style={{
            marginTop: 36, paddingTop: 20, borderTop: '2px dashed var(--border)',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, textAlign: 'center'
          }}>
            <div>
              <div style={{ height: 44 }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>مهندس التنفيذ المسؤول</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{project.engineer || 'م. الموقع'}</div>
            </div>
            <div>
              <div style={{ height: 44 }} />
              <div style={{ fontSize: 13, fontWeight: 700 }}>إدارة شركة أملاك للعمارة والديكور</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>خاتم واعتماد الإدارة الفنية</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
