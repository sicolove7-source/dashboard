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
    <div className="tab-fade ac-root" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ─── Hero Header & Stats ─── */}
      <div
        className="panel ac-hero-panel"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div className="ac-hero-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div className="ac-hero-info" style={{ maxWidth: 650 }}>
            <div className="ac-badge-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: '#F1F5F9',
                  color: '#1E293B',
                  border: '1px solid #E2E8F0',
                  padding: '4px 10px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <Zap size={14} /> مركز الأتمتة الذكي
              </span>
              <span className="ac-hero-en" style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
                Workflow Automations & AI Triggers
              </span>
            </div>
            <h2 className="ac-hero-title" style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: 'var(--ink)' }}>
              أتمتة دورة عمل المشاريع والتحصيل الميداني
            </h2>
            <p className="ac-hero-desc" style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              يعمل هذا المحرك تلقائياً لمراقبة مواعيد الدفعات، تنبيهات الميزانيات، متابعة تسجيل اليوميات، وتكليف الصنايعية بالملاحظات عبر الواتساب.
            </p>
          </div>

          {/* Actions & Live Eval Button */}
          <div className="ac-hero-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="btn btn-primary ac-btn-eval"
              style={{
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: isEvaluating ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={14} className={isEvaluating ? 'spin' : ''} />
              {isEvaluating ? 'جاري الفحص...' : 'تشغيل فحص فوري'}
            </button>

            <button
              onClick={handleResetDefaults}
              className="btn ac-btn-reset"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                padding: '9px 12px',
                fontSize: 13,
              }}
              title="استعادة الضبط الافتراضي"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {evalMessage && (
          <div
            className="tab-fade"
            style={{
              marginTop: 16,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#16A34A',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} /> {evalMessage}
          </div>
        )}

        {/* Quick KPI Stats Cards */}
        <div
          className="ac-kpi-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginTop: 20,
          }}
        >
          <div
            className="ac-kpi-card"
            style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--border)',
              padding: '12px 14px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>الأتمتات المفعلة</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                {activeRulesCount} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>من {rules.length}</span>
              </div>
            </div>
          </div>

          <div
            className="ac-kpi-card"
            style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--border)',
              padding: '12px 14px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>إجراءات تتطلب تدخلاً</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: liveResults.length > 0 ? '#DC2626' : 'var(--ink)' }}>
                {liveResults.length}
              </div>
            </div>
          </div>

          <div
            className="ac-kpi-card"
            style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--border)',
              padding: '12px 14px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>رسائل واتساب مجهزة</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                {liveResults.filter((r) => r.whatsappMessage).length}
              </div>
            </div>
          </div>

          <div
            className="ac-kpi-card"
            style={{
              background: 'var(--bg-color)',
              border: '1px solid var(--border)',
              padding: '12px 14px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>الوفر التقديري</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                18 <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>ساعة/أسبوع</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs & Filters ─── */}
      <div className="ac-nav-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div className="ac-tabs-bar" style={{ display: 'flex', gap: 4, background: 'var(--card)', padding: 3, borderRadius: 8, border: '1px solid var(--border)', flexWrap: 'wrap', maxWidth: '100%' }}>
          <button
            onClick={() => setActiveTab('rules')}
            className={`ac-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'rules' ? '#0F172A' : 'transparent',
              color: activeTab === 'rules' ? '#FFFFFF' : 'var(--muted)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sliders size={14} /> قواعد الأتمتة ({rules.length})
          </button>

          <button
            onClick={() => setActiveTab('live_actions')}
            className={`ac-tab-btn ${activeTab === 'live_actions' ? 'active' : ''}`}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'live_actions' ? '#0F172A' : 'transparent',
              color: activeTab === 'live_actions' ? '#FFFFFF' : 'var(--muted)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Bell size={14} /> الإجراءات المرصودة ({liveResults.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`ac-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'logs' ? '#0F172A' : 'transparent',
              color: activeTab === 'logs' ? '#FFFFFF' : 'var(--muted)',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Clock size={14} /> سجل النشاطات ({logs.length})
          </button>
        </div>

        {activeTab === 'rules' && (
          <div className="ac-categories-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`ac-cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: activeCategory === cat.key ? '1px solid #0F172A' : '1px solid var(--border)',
                  background: activeCategory === cat.key ? '#0F172A' : 'var(--card)',
                  color: activeCategory === cat.key ? '#FFFFFF' : 'var(--muted)',
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
        <div className="ac-rules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {filteredRules.map((rule) => {
            const ruleActiveMatches = liveResults.filter((r) => r.ruleId === rule.id);

            return (
              <div
                key={rule.id}
                className="panel ac-rule-card"
                style={{
                  border: '1px solid var(--border)',
                  background: rule.enabled ? 'var(--card)' : '#F8FAFC',
                  opacity: rule.enabled ? 1 : 0.7,
                  padding: 18,
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                {/* Header: Title + Toggle */}
                <div>
                  <div className="ac-rule-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Zap size={18} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{rule.name}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              color: '#475569',
                            }}
                          >
                            {rule.badge}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              color: '#64748B',
                            }}
                          >
                            {rule.channel === 'whatsapp_notification' ? 'واتساب + تنبيه' : rule.channel === 'whatsapp_direct' ? 'واتساب مباشر' : 'تنبيه نظام'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer' }}>
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
                          backgroundColor: rule.enabled ? '#0F172A' : '#CBD5E1',
                          borderRadius: 22,
                          transition: '0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: 16,
                            width: 16,
                            left: rule.enabled ? 20 : 3,
                            bottom: 3,
                            backgroundColor: 'white',
                            borderRadius: '50%',
                            transition: '0.2s',
                          }}
                        />
                      </span>
                    </label>
                  </div>

                  <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 12px' }}>
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
                  className="ac-rule-footer"
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
            <div className="ac-live-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {liveResults.map((item) => (
                <div
                  key={item.id}
                  className="panel ac-live-card"
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: item.type === 'critical' ? '#FEF2F2' : '#F1F5F9',
                          color: item.type === 'critical' ? '#DC2626' : '#475569',
                          border: item.type === 'critical' ? '1px solid #FECACA' : '1px solid #E2E8F0',
                        }}
                      >
                        {item.time}
                      </span>

                      <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>
                        {item.category === 'finance' ? 'مالية' : item.category === 'site' ? 'موقع' : item.category === 'quality' ? 'جودة' : 'مبيعات'}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>
                      {item.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {item.desc}
                    </p>
                  </div>

                  <div className="ac-live-card-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    {item.projectId && onNavigateToProject && (
                      <button
                        onClick={() => onNavigateToProject(item.projectId, item.targetTab)}
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: '6px 10px' }}
                      >
                        عرض المشروع
                      </button>
                    )}

                    <button
                      onClick={() => handleExecuteAction(item)}
                      className="btn btn-primary"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 6,
                      }}
                    >
                      {item.whatsappMessage ? <MessageSquare size={13} /> : <Zap size={13} />}
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
        <div className="panel ac-logs-panel" style={{ padding: 18 }}>
          <div className="ac-logs-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#64748B" />
              سجل نشاطات وإجراءات الأتمتة ({logs.length})
            </h3>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="btn btn-ghost ac-btn-clear-logs"
                style={{ color: 'var(--muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={13} /> مسح السجل
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
              لا توجد نشاطات مسجلة بعد. سيتم تسجيل كل إجراء تنبيهي أو إرسال واتساب هنا تلقائياً.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="ac-log-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--bg-color)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {log.type === 'whatsapp_sent' ? <MessageSquare size={14} /> : <Zap size={14} />}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{log.action}</div>
                      {log.target && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>الطرف المستهدف: {log.target}</div>
                      )}
                    </div>
                  </div>

                  <div className="ac-log-date" style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'left', fontWeight: 600 }}>
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
