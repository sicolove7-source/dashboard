import { fmtDate, todayISO, getGlobalCurrency } from './helpers';
import { WHATSAPP_TEMPLATES } from './whatsappTemplates';
import { notifyOnce } from './notifications';

export const AUTOMATIONS_SETTINGS_KEY = 'dashboard_automations_settings_v1';
export const AUTOMATIONS_LOG_KEY = 'dashboard_automations_log_v1';

/**
 * القواعد الافتراضية للأتمتة مع الإعدادات القابلة للتخصيص
 */
export const DEFAULT_AUTOMATION_RULES = [
  {
    id: 'client_payment_reminder',
    name: 'تذكير دفعات العملاء المستحقة',
    desc: 'فحص تواريخ استحقاق الدفعات وتجهيز رسائل الواتساب والتنبيهات للعميل قبل موعد السداد.',
    category: 'finance',
    icon: 'Wallet',
    enabled: true,
    channel: 'whatsapp_notification',
    thresholdDays: 3, // قبل الاستحقاق بـ 3 أيام
    targetRole: 'accountant',
    badge: 'مالية وعملاء',
    color: '#0F172A',
  },
  {
    id: 'budget_overrun_alert',
    name: 'إنذار تجاوز ميزانية المشروع',
    desc: 'تنبيه عاجل وفوري للإدارة عند وصول مصروفات المشروع إلى نسبة حرجة من الميزانية المرصودة.',
    category: 'finance',
    icon: 'AlertTriangle',
    enabled: true,
    channel: 'system_alert',
    thresholdPercent: 90, // عند بلوغ 90%
    targetRole: 'owner',
    badge: 'مراقبة التكاليف',
    color: '#0F172A',
  },
  {
    id: 'missing_daily_log',
    name: 'تذكير يوميات الموقع المفقودة',
    desc: 'فحص يوميات المواقع النشطة وتنبيه المهندس المشرف في نهاية اليوم لتسجيل التقرير قبل مغادرة الموقع.',
    category: 'site',
    icon: 'CalendarCheck',
    enabled: true,
    channel: 'whatsapp_notification',
    targetRole: 'engineer',
    badge: 'متابعة ميدانية',
    color: '#0F172A',
  },
  {
    id: 'craftsman_snag_dispatch',
    name: 'تكليف الصنايعي بالملاحظات الجديدة',
    desc: 'إرسال تفاصيل الملاحظة الهندسية وموقعها وصورها تلقائياً للصنايعي/المقاول بالواتساب مع تحديد مهلة.',
    category: 'quality',
    icon: 'Wrench',
    enabled: true,
    channel: 'whatsapp_direct',
    targetRole: 'engineer',
    badge: 'جودة واستلامات',
    color: '#0F172A',
  },
  {
    id: 'stale_lead_followup',
    name: 'متابعة العملاء المحتملين الراكدين (CRM)',
    desc: 'تنبيه مسؤول المبيعات لمتابعة العملاء الذين مر عليهم أكثر من 4 أيام بعد تقديم المقايسة دون استجابة.',
    category: 'sales',
    icon: 'BadgePercent',
    enabled: true,
    channel: 'system_alert',
    thresholdDays: 4,
    targetRole: 'owner',
    badge: 'مبيعات CRM',
    color: '#0F172A',
  },
  {
    id: 'schedule_delay_cascade',
    name: 'تنبيه تأخير المراحل والمسار الحرج',
    desc: 'رصد تأخر مراحل التنفيذ عن موعدها المحدد واقتراح تعديل الجداول وتفادي تعارض مواعيد الصنايعية.',
    category: 'schedule',
    icon: 'Clock',
    enabled: true,
    channel: 'system_alert',
    targetRole: 'owner',
    badge: 'جدول زمني',
    color: '#0F172A',
  },
];

/**
 * استرجاع إعدادات الأتمتة المخزنة أو الافتراضية
 */
export function loadAutomationRules() {
  try {
    const raw = localStorage.getItem(AUTOMATIONS_SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return DEFAULT_AUTOMATION_RULES.map((rule) => {
        const found = saved.find((r) => r.id === rule.id);
        return found ? { ...rule, ...found } : rule;
      });
    }
  } catch (e) {
    console.error('Error loading automation rules', e);
  }
  return DEFAULT_AUTOMATION_RULES;
}

/**
 * حفظ إعدادات الأتمتة
 */
export function saveAutomationRules(rules) {
  try {
    localStorage.setItem(AUTOMATIONS_SETTINGS_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Error saving automation rules', e);
  }
}

/**
 * سجل نشاطات الأتمتة المنفذة
 */
export function loadAutomationLogs() {
  try {
    const raw = localStorage.getItem(AUTOMATIONS_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading automation logs', e);
  }
  return [];
}

export function logAutomationActivity(activity) {
  try {
    const logs = loadAutomationLogs();
    const newEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      ...activity,
    };
    const updated = [newEntry, ...logs.slice(0, 49)]; // يحتفظ بآخر 50 نشاط
    localStorage.setItem(AUTOMATIONS_LOG_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error logging automation activity', e);
    return [];
  }
}

/**
 * محرك الفحص الشامل لتقييم جميع قواعد الأتمتة على بيانات النظام الحالية
 */
export function evaluateAutomations({ projects = [], leads = [], team = null, companySettings = {} }) {
  const rules = loadAutomationRules();
  const ruleMap = Object.fromEntries(rules.map((r) => [r.id, r]));
  const results = [];
  const todayStr = todayISO();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const companyName = companySettings?.companyName || 'إدارة التشطيبات';

  // 1. فحص تذكير دفعات العملاء (client_payment_reminder)
  if (ruleMap.client_payment_reminder?.enabled) {
    const thresholdDays = ruleMap.client_payment_reminder.thresholdDays ?? 3;

    projects.forEach((proj) => {
      const milestones = proj.paymentMilestones || [];
      milestones.forEach((m, idx) => {
        if (m.status !== 'collected' && m.dueDate) {
          const d = new Date(m.dueDate);
          d.setHours(0, 0, 0, 0);
          const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));

          // إذا كانت الدفعة مستحقة خلال الأيام المحددة أو متأخرة
          if (diffDays <= thresholdDays) {
            const isOverdue = diffDays < 0;
            const waMsg = WHATSAPP_TEMPLATES.paymentDue(
              proj.client,
              companyName,
              m.label || `الدفعة رقم ${idx + 1}`,
              m.amount || 0,
              fmtDate(m.dueDate)
            );

            results.push({
              id: `auto-pay-${proj.id}-${m.id || idx}`,
              ruleId: 'client_payment_reminder',
              type: isOverdue ? 'critical' : 'warning',
              category: 'finance',
              title: isOverdue
                ? `دفعة متأخرة لم تسدد: ${proj.name}`
                : `استحقاق دفعة قادمة: ${proj.name}`,
              desc: `المرحلة: "${m.label || 'دفعة'}" بمبلغ ${Number(m.amount || 0).toLocaleString('ar-EG')} ${getGlobalCurrency()} مستحقة في ${fmtDate(m.dueDate)} (${isOverdue ? `متأخرة منذ ${Math.abs(diffDays)} يوم` : diffDays === 0 ? 'اليوم' : `خلال ${diffDays} أيام`}).`,
              projectId: proj.id,
              targetTab: 'finance',
              clientName: proj.client,
              clientPhone: proj.clientPhone || '',
              whatsappMessage: waMsg,
              amount: m.amount,
              dueDate: m.dueDate,
              actionType: 'whatsapp_payment',
              actionLabel: 'إرسال تذكير بالواتساب 💬',
              time: isOverdue ? 'دفعة متأخرة' : 'دفعة مستحقة',
            });
          }
        }
      });
    });
  }

  // 2. فحص إنذار تجاوز الميزانية (budget_overrun_alert)
  if (ruleMap.budget_overrun_alert?.enabled) {
    const thresholdPct = ruleMap.budget_overrun_alert.thresholdPercent ?? 90;

    projects.forEach((proj) => {
      const budget = parseFloat(proj.budget) || 0;
      const spent = parseFloat(proj.spent) || 0;
      if (budget > 0) {
        const ratio = (spent / budget) * 100;
        if (ratio >= thresholdPct && proj.progress < 100) {
          const isCritical = ratio >= 100;
          results.push({
            id: `auto-budget-${proj.id}`,
            ruleId: 'budget_overrun_alert',
            type: isCritical ? 'critical' : 'warning',
            category: 'finance',
            title: isCritical
              ? `🚨 تجاوز الميزانية بنسبة ${Math.round(ratio)}%: ${proj.name}`
              : `⚠️ اقتراب استنفاد الميزانية (${Math.round(ratio)}%): ${proj.name}`,
            desc: `تم إنفاق ${Math.round(spent).toLocaleString('ar-EG')} ${getGlobalCurrency()} من أصل ${Math.round(budget).toLocaleString('ar-EG')} ${getGlobalCurrency()} بينما نسبة الإنجاز ${proj.progress}%.`,
            projectId: proj.id,
            targetTab: 'finance',
            actionType: 'open_finance',
            actionLabel: 'مراجعة المصروفات 📊',
            time: 'إنذار الميزانية',
          });
        }
      }
    });
  }

  // 3. فحص يوميات الموقع المفقودة لليوم (missing_daily_log)
  if (ruleMap.missing_daily_log?.enabled) {
    projects.forEach((proj) => {
      // إذا كان المشروع قيد التنفيذ
      if (proj.progress > 0 && proj.progress < 100) {
        const logs = proj.dailyLogs || [];
        const hasTodayLog = logs.some((l) => l.date === todayStr);

        if (!hasTodayLog) {
          const engineerName = proj.engineer || 'مهندس الموقع';
          const waMsg = WHATSAPP_TEMPLATES.engineerDailyReminder(
            engineerName,
            companyName,
            proj.name
          );

          results.push({
            id: `auto-log-${proj.id}-${todayStr}`,
            ruleId: 'missing_daily_log',
            type: 'warning',
            category: 'site',
            title: `لم تسجل يوميات اليوم: ${proj.name}`,
            desc: `المشروع نشط ولم يقم ${engineerName} بتسجيل تقرير الأعمال أو العمالة لليوم (${fmtDate(todayStr)}).`,
            projectId: proj.id,
            targetTab: 'diary',
            engineerName,
            whatsappMessage: waMsg,
            actionType: 'open_diary_or_wa',
            actionLabel: 'تسجيل اليوميات بالصوت 🎙️',
            time: 'تذكير اليوميات',
          });
        }
      }
    });
  }

  // 4. فحص تكليف الصنايعي بالملاحظات المفتوحة (craftsman_snag_dispatch)
  if (ruleMap.craftsman_snag_dispatch?.enabled) {
    projects.forEach((proj) => {
      const snags = proj.snags || [];
      const openSnags = snags.filter((s) => s.status !== 'done');

      openSnags.forEach((s) => {
        if (s.assignee) {
          const waMsg = WHATSAPP_TEMPLATES.craftsmanSnagDispatch(
            s.assignee,
            companyName,
            proj.name,
            s.desc || 'ملاحظة تشطيب',
            s.location || 'الموقع',
            '48 ساعة'
          );

          results.push({
            id: `auto-snag-${proj.id}-${s.id}`,
            ruleId: 'craftsman_snag_dispatch',
            type: s.priority === 'urgent' ? 'critical' : 'warning',
            category: 'quality',
            title: `ملاحظة استلام معلقة: ${s.desc || 'ملاحظة'} (${proj.name})`,
            desc: `المسؤول: ${s.assignee} | المكان: ${s.location || 'غير محدد'} | الحالة: ${s.status === 'progress' ? 'جاري العمل' : 'لم تنجز بعد'}.`,
            projectId: proj.id,
            targetTab: 'snags',
            craftsmanName: s.assignee,
            whatsappMessage: waMsg,
            actionType: 'whatsapp_craftsman',
            actionLabel: 'إرسال تكليف للصنايعي 📲',
            time: 'ملاحظة جودة',
          });
        }
      });
    });
  }

  // 5. فحص العملاء المحتملين الراكدين بالـ CRM (stale_lead_followup)
  if (ruleMap.stale_lead_followup?.enabled && Array.isArray(leads)) {
    const thresholdDays = ruleMap.stale_lead_followup.thresholdDays ?? 4;

    leads.forEach((lead) => {
      if (['quotation', 'negotiation', 'inspection'].includes(lead.stage) && lead.createdAt) {
        const leadDate = new Date(lead.updatedAt || lead.createdAt);
        leadDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today - leadDate) / (1000 * 60 * 60 * 24));

        if (diffDays >= thresholdDays) {
          const waMsg = WHATSAPP_TEMPLATES.leadFollowupNudge(
            lead.name,
            companyName,
            lead.type || 'الوحدة'
          );

          results.push({
            id: `auto-lead-${lead.id}`,
            ruleId: 'stale_lead_followup',
            type: 'info',
            category: 'sales',
            title: `متابعة عميل راكد (${diffDays} أيام): ${lead.name}`,
            desc: `العميل في مرحلة "${lead.stage === 'quotation' ? 'عرض السعر' : lead.stage === 'negotiation' ? 'المفاوضات' : 'المعاينة'}" منذ ${diffDays} أيام دون تحديث.`,
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone || '',
            targetTab: 'crm',
            whatsappMessage: waMsg,
            actionType: 'whatsapp_lead',
            actionLabel: 'إرسال متابعة بالواتساب 💬',
            time: 'متابعة مبيعات',
          });
        }
      }
    });
  }

  // 6. فحص تأخير الجداول والمسار الحرج (schedule_delay_cascade)
  if (ruleMap.schedule_delay_cascade?.enabled) {
    projects.forEach((proj) => {
      if (proj.status === 'delayed' && proj.progress < 100) {
        results.push({
          id: `auto-delay-${proj.id}`,
          ruleId: 'schedule_delay_cascade',
          type: 'critical',
          category: 'schedule',
          title: `تعثر زمني ومسار حرج: ${proj.name}`,
          desc: `المشروع متأخر عن تاريخ التسليم (${fmtDate(proj.dueDate)}) ونسبة الإنجاز ${proj.progress}%. يلزم إعادة جدولة المراحل اللاحقة.`,
          projectId: proj.id,
          targetTab: 'schedule',
          actionType: 'open_schedule',
          actionLabel: 'فتح الجدول الزمني وجانت ⏱️',
          time: 'تأخير زمني',
        });
      }
    });
  }

  // إرسال إشعارات النظام المباشرة (Native Web Push) للإنذارات الحرجة والملاحظات العاجلة
  try {
    results.forEach((alert) => {
      if (alert.type === 'critical' || alert.ruleId === 'budget_overrun_alert' || alert.ruleId === 'missing_daily_log') {
        notifyOnce(
          alert.id,
          alert.title,
          {
            body: alert.desc,
            tag: alert.id,
            data: { url: `/#${alert.targetTab || 'overview'}` }
          },
          8 // منع التكرار لنفس الإشعار لمدة 8 ساعات
        );
      }
    });
  } catch (e) {
    console.warn('Native notification dispatch error:', e);
  }

  return results;
}
