import React, { useState, useMemo, useEffect } from 'react';
import {
  Zap, Bell, MessageSquare, Play, CheckCircle2, Clock,
  AlertTriangle, Settings, RefreshCw, ShieldCheck, Wallet,
  Wrench, Users, Sparkles, Filter, ChevronDown, ChevronUp,
  Sliders, ArrowUpRight, Check, Trash2, Calendar, PhoneCall,
  Send, Eye, ArrowRight
} from 'lucide-react';
import {
  loadAutomationRules,
  saveAutomationRules,
  loadAutomationLogs,
  logAutomationActivity,
  evaluateAutomations,
  DEFAULT_AUTOMATION_RULES
} from '../utils/automationsEngine';
import { openWhatsApp } from '../utils/whatsappTemplates';
import { fmtDate, todayISO } from '../utils/helpers';
import confetti from 'canvas-confetti';

export default function AutomationsCenter({
  projects = [],
  leads = [],
  team = null,
  companySettings = {},
  userRole = 'owner',
  onNavigateToProject = null,
  onNavigateToTab = null,
}) {
  const [rules, setRules] = useState(() => loadAutomationRules());
  const [logs, setLogs] = useState(() => loadAutomationLogs());
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewRule, setPreviewRule] = useState(null);
  const [activeTab, setActiveTab] = useState('rules'); // rules | live_actions | logs
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalMessage, setEvalMessage] = useState(null);

  // Live evaluation of automations against data
  const liveResults = useMemo(() => {
    return evaluateAutomations({
      projects,
      leads,
      team,
      companySettings,
    });
  }, [projects, leads, team, companySettings, rules]);

  // Count active rules
  const activeRulesCount = useMemo(() => {
    return rules.filter((r) => r.enabled).length;
  }, [rules]);

  // Toggle rule status
  const handleToggleRule = (ruleId) => {
    const updated = rules.map((r) => {
      if (r.id === ruleId) {
        const nextState = !r.enabled;
        logAutomationActivity({
          ruleId,
          ruleName: r.name,
          action: nextState ? 'تم تفعيل القاعدة' : 'تم إيقاف القاعدة',
          type: nextState ? 'enable' : 'disable',
        });
        return { ...r, enabled: nextState };
      }
      return r;
    });
    setRules(updated);
    saveAutomationRules(updated);
    setLogs(loadAutomationLogs());
  };

  // Update rule parameter (e.g. thresholdDays, thresholdPercent)
  const handleUpdateParam = (ruleId, key, value) => {
    const updated = rules.map((r) => {
      if (r.id === ruleId) {
        return { ...r, [key]: Number(value) };
      }
      return r;
    });
    setRules(updated);
    saveAutomationRules(updated);
  };

  // Reset to default rules
  const handleResetDefaults = () => {
    if (window.confirm('هل أنت متأكد من استعادة قواعد الأتمتة إلى الضبط الافتراضي؟')) {
      setRules(DEFAULT_AUTOMATION_RULES);
      saveAutomationRules(DEFAULT_AUTOMATION_RULES);
      logAutomationActivity({
        action: 'استعادة الضبط الافتراضي لقواعد الأتمتة',
        type: 'reset',
      });
      setLogs(loadAutomationLogs());
    }
  };

  // Manual Trigger / Evaluation Run
  const handleRunEvaluation = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      const count = liveResults.length;
      setEvalMessage(`تم فحص جميع البيانات بنجاح! تم رصد ${count} إجراء وتنبيه ذكي جاهز.`);
      logAutomationActivity({
        action: `تشغيل فحص يدوي: تم رصد ${count} إجراء ذكي`,
        type: 'manual_run',
        count,
      });
      setLogs(loadAutomationLogs());
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {}
      setTimeout(() => setEvalMessage(null), 4000);
    }, 600);
  };

  // Execute specific action (e.g. send WhatsApp)
  const handleExecuteAction = (item) => {
    if (item.whatsappMessage) {
      const phone = item.clientPhone || item.leadPhone || '';
      openWhatsApp(phone, item.whatsappMessage);
      logAutomationActivity({
        ruleId: item.ruleId,
        action: `إرسال رسالة واتساب: ${item.title}`,
        target: item.clientName || item.leadName || item.craftsmanName || 'مستخدم',
        type: 'whatsapp_sent',
      });
      setLogs(loadAutomationLogs());
    } else if (item.projectId && onNavigateToProject) {
      onNavigateToProject(item.projectId, item.targetTab);
    } else if (item.targetTab && onNavigateToTab) {
      onNavigateToTab(item.targetTab);
    }
  };

  // Clear logs
  const handleClearLogs = () => {
    if (window.confirm('هل تريد مسح سجل النشاطات بالكامل؟')) {
      localStorage.removeItem('dashboard_automations_log_v1');
      setLogs([]);
    }
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchCat = activeCategory === 'all' || r.category === activeCategory;
      const matchQuery =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [rules, activeCategory, searchQuery]);

  const CATEGORIES = [
    { key: 'all', label: 'الكل' },
    { key: 'finance', label: '💰 المالية والتحصيل' },
    { key: 'site', label: '🏗️ المواقع واليوميات' },
    { key: 'quality', label: '🛠️ الجودة والاستلامات' },
    { key: 'sales', label: '🤝 المبيعات و CRM' },
    { key: 'schedule', label: '⏱️ الجداول الزمنية' },
  ];

  return (
    <div className="tab-fade" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ─── Hero Header & Stats ─── */}
      <div
        className="panel"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          padding: '28px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ maxWidth: 650 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                <Zap size={16} /> مركز الأتمتة الذكي ⚡
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                Workflow Automations & AI Triggers
              </span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px', color: 'var(--ink)' }}>
              أتمتة دورة عمل المشاريع والتحصيل الميداني 🚀
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              يعمل هذا المحرك تلقائياً على مدار الساعة لمراقبة مواعيد الدفعات، تنبيهات تجاوز الميزانيات، متابعة تسجيل اليوميات، وتكليف الصنايعية بالملاحظات عبر الواتساب فوراً.
            </p>
          </div>

          {/* Actions & Live Eval Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #3B82F6)',
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={16} className={isEvaluating ? 'spin' : ''} />
              {isEvaluating ? 'جاري الفحص الشامل...' : 'تشغيل وفحص فوري الآن ⚡'}
            </button>

            <button
              onClick={handleResetDefaults}
              className="btn"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                padding: '10px 14px',
                fontSize: 13,
              }}
              title="استعادة الضبط الافتراضي"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {evalMessage && (
          <div
            className="tab-fade"
            style={{
              marginTop: 16,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={18} /> {evalMessage}
          </div>
        )}

        {/* Quick KPI Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            marginTop: 24,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>الأتمتات المفعلة</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                {activeRulesCount} <span style={{ fontSize: 13, color: 'var(--muted)' }}>من {rules.length}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>إجراءات وتنبيهات جاهزة</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>
                {liveResults.length} <span style={{ fontSize: 13, color: 'var(--muted)' }}>تنبيه</span>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>رسائل واتساب مجهزة</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>
                {liveResults.filter((r) => r.whatsappMessage).length}{' '}
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>رسالة</span>
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'rgba(236, 72, 153, 0.12)',
                color: '#EC4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>الوفر التقديري في الوقت</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#EC4899' }}>
                18 <span style={{ fontSize: 13, color: 'var(--muted)' }}>ساعة/أسبوعياً</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs & Filters ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, background: 'var(--card)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'rules' ? 'var(--brand-primary, #6366F1)' : 'transparent',
              color: activeTab === 'rules' ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sliders size={15} /> قواعد الأتمتة ({rules.length})
          </button>

          <button
            onClick={() => setActiveTab('live_actions')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'live_actions' ? 'var(--brand-primary, #6366F1)' : 'transparent',
              color: activeTab === 'live_actions' ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Bell size={15} /> الإجراءات المرصودة حالياً ({liveResults.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeTab === 'logs' ? 'var(--brand-primary, #6366F1)' : 'transparent',
              color: activeTab === 'logs' ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Clock size={15} /> سجل النشاطات ({logs.length})
          </button>
        </div>

        {activeTab === 'rules' && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  border: activeCategory === cat.key ? '1px solid var(--brand-primary, #6366F1)' : '1px solid var(--border)',
                  background: activeCategory === cat.key ? 'rgba(99, 102, 241, 0.1)' : 'var(--card)',
                  color: activeCategory === cat.key ? 'var(--brand-primary, #6366F1)' : 'var(--muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── TAB 1: AUTOMATION RULES ─── */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18 }}>
          {filteredRules.map((rule) => {
            const ruleActiveMatches = liveResults.filter((r) => r.ruleId === rule.id);

            return (
              <div
                key={rule.id}
                className="panel"
                style={{
                  border: rule.enabled ? `1px solid ${rule.color}40` : '1px solid var(--border)',
                  background: rule.enabled ? 'var(--card)' : 'rgba(0,0,0,0.02)',
                  opacity: rule.enabled ? 1 : 0.75,
                  padding: 20,
                  borderRadius: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  transition: 'all 0.25s',
                  position: 'relative',
                  boxShadow: rule.enabled ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {/* Header: Title + Toggle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: `${rule.color}15`,
                          color: rule.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Zap size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{rule.name}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: `${rule.color}15`,
                              color: rule.color,
                            }}
                          >
                            {rule.badge}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'rgba(0,0,0,0.05)',
                              color: 'var(--muted)',
                            }}
                          >
                            {rule.channel === 'whatsapp_notification' ? 'واتساب + تنبيه 💬' : rule.channel === 'whatsapp_direct' ? 'واتساب مباشر 📲' : 'تنبيه نظام 🔔'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 26, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleToggleRule(rule.id)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: rule.enabled ? rule.color : 'var(--border)',
                          borderRadius: 34,
                          transition: '0.3s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: 20,
                            width: 20,
                            left: rule.enabled ? 22 : 3,
                            bottom: 3,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        />
                      </span>
                    </label>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 14px' }}>
                    {rule.desc}
                  </p>

                  {/* Customizable Parameters */}
                  {rule.thresholdDays !== undefined && (
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.02)',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                        مهلة الفحص والتنبيه:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={rule.thresholdDays}
                          onChange={(e) => handleUpdateParam(rule.id, 'thresholdDays', e.target.value)}
                          style={{
                            width: 55,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>أيام</span>
                      </div>
                    </div>
                  )}

                  {rule.thresholdPercent !== undefined && (
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.02)',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                        نسبة الصرف للإنذار:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          min="50"
                          max="150"
                          step="5"
                          value={rule.thresholdPercent}
                          onChange={(e) => handleUpdateParam(rule.id, 'thresholdPercent', e.target.value)}
                          style={{
                            width: 60,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer status & preview button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    {ruleActiveMatches.length > 0 ? (
                      <span style={{ color: rule.color, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: rule.color, display: 'inline-block' }} />
                        تم رصد {ruleActiveMatches.length} حالة مطابقة الآن
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontWeight: 500 }}>لا توجد حالات معلقة حالياً</span>
                    )}
                  </div>

                  <button
                    onClick={() => setPreviewRule(previewRule === rule.id ? null : rule.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-primary, #6366F1)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Eye size={14} /> {previewRule === rule.id ? 'إخفاء المعاينة' : 'معاينة القالب'}
                  </button>
                </div>

                {/* Preview Message Drawer */}
                {previewRule === rule.id && (
                  <div
                    className="tab-fade"
                    style={{
                      background: 'var(--bg)',
                      border: '1px dashed var(--border)',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--ink)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: rule.color, marginBottom: 4 }}>
                      📄 نص رسالة الواتساب والتنبيه التلقائي:
                    </div>
                    {rule.id === 'client_payment_reminder' && (
                      `مرحباً أستاذ [اسم العميل] 💼\nنحيطكم علماً بأنه تم استحقاق دفعة: [اسم المرحلة]\n💵 المبلغ: [المبلغ المطلوب]\n📅 موعد الاستحقاق: [التاريخ]\nشاكرين لسيادتكم حسن التعاون لاستمرار وتيرة العمل بالموقع دون تأخير. 🙏`
                    )}
                    {rule.id === 'missing_daily_log' && (
                      `مرحباً [اسم المهندس] 👷‍♂️\nتذكير يومي من إدارة الشركة:\n📍 الموقع: [اسم المشروع]\n📝 نرجو التكرم بتسجيل تقرير يوميات الموقع للأعمال المنفذة والعمالة اليومية قبل مغادرة الموقع لتوثيق الإنجاز. 🏗️`
                    )}
                    {rule.id === 'craftsman_snag_dispatch' && (
                      `السلام عليكم يا أسطى [اسم الصنايعي] 🛠️\nتكليف عمل وملاحظة تشطيب:\n📍 الموقع: [اسم المشروع]\n⚠️ الملاحظة المطلوب تعديلها: [وصف العيب]\n⏳ المهلة: 48 ساعة. برجاء المعاينة والإفادة فور الانتهاء لاعتماد البند وصرف المستحقات.`
                    )}
                    {rule.id === 'budget_overrun_alert' && (
                      `🚨 إنذار مالي عاجل للإدارة:\nتجاوزت مصروفات مشروع [اسم المشروع] نسبة [النسبة]% من الميزانية التقديرية. يرجى مراجعة بنود التوريد وتجميد الصرف الإضافي فوراً.`
                    )}
                    {rule.id === 'stale_lead_followup' && (
                      `مرحباً أستاذ [اسم العميل] 👋\nنود الاطمئنان على سير خططكم لتشطيب وتجهيز [نوع الوحدة]. 🏡\nهل لديكم أي استفسار حول المقايسة أو التصاميم؟ فريقنا الفني جاهز لمساعدتكم في أي وقت. ✨`
                    )}
                    {rule.id === 'schedule_delay_cascade' && (
                      `⏱️ تنبيه المسار الحرج:\nتأخر موعد تسليم مرحلة [اسم المرحلة] في مشروع [اسم المشروع]. سيقوم النظام بإعادة ضبط المواعيد اللاحقة تلقائياً.`
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TAB 2: LIVE DETECTED ACTIONS ─── */}
      {activeTab === 'live_actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {liveResults.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: 48 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>جميع المواقع والماليات منضبطة تماماً! ✨</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0, maxWidth: 500, marginInline: 'auto' }}>
                لا توجد دفعات متأخرة، أو يوميات مفقودة، أو ملاحظات استلام تستدعي إجراءً عاجلاً في الوقت الحالي.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
              {liveResults.map((item) => (
                <div
                  key={item.id}
                  className="panel"
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    border: item.type === 'critical' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                    background: item.type === 'critical' ? 'rgba(239, 68, 68, 0.02)' : 'rgba(245, 158, 11, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 8,
                          background: item.type === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: item.type === 'critical' ? '#EF4444' : '#F59E0B',
                        }}
                      >
                        {item.time}
                      </span>

                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                        {item.category === 'finance' ? '💰 مالية' : item.category === 'site' ? '🏗️ موقع' : item.category === 'quality' ? '🛠️ جودة' : '🤝 مبيعات'}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
                      {item.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {item.desc}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    {item.projectId && onNavigateToProject && (
                      <button
                        onClick={() => onNavigateToProject(item.projectId, item.targetTab)}
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: '8px 12px' }}
                      >
                        عرض المشروع 📂
                      </button>
                    )}

                    <button
                      onClick={() => handleExecuteAction(item)}
                      className="btn"
                      style={{
                        background: item.whatsappMessage ? '#25D366' : 'var(--brand-primary, #6366F1)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 800,
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                      }}
                    >
                      {item.whatsappMessage ? <MessageSquare size={14} /> : <Zap size={14} />}
                      {item.actionLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: ACTIVITY & EXECUTION LOGS ─── */}
      {activeTab === 'logs' && (
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="var(--brand-primary, #6366F1)" />
              سجل نشاطات وإجراءات الأتمتة ({logs.length})
            </h3>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="btn btn-ghost"
                style={{ color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={14} /> مسح السجل
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
              لا توجد نشاطات مسجلة بعد. سيتم تسجيل كل إجراء تنبيهي أو إرسال واتساب هنا تلقائياً.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--bg)',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: log.type === 'whatsapp_sent' ? 'rgba(37, 211, 102, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                        color: log.type === 'whatsapp_sent' ? '#25D366' : '#6366F1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {log.type === 'whatsapp_sent' ? <MessageSquare size={16} /> : <Zap size={16} />}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{log.action}</div>
                      {log.target && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>الطرف المستهدف: {log.target}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'left', fontWeight: 600 }}>
                    {fmtDate(log.timestamp?.slice(0, 10))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
