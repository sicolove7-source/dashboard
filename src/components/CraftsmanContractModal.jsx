import React, { useState } from 'react';
import {
  X, Printer, Copy, Check, FileText, Wrench, User, MapPin,
  DollarSign, ShieldCheck, Calendar, AlertTriangle, Eye, Edit3, Save, Sparkles, FileDown,
  PenTool, CheckCircle2, Stamp, MessageCircle, Building2, Phone, Briefcase, ChevronLeft
} from 'lucide-react';
import { fmtDate, todayISO, getGlobalCurrency } from '../utils/helpers';
import { printElement } from '../utils/printHelper';
import { loadCompanySettings } from '../utils/branding';
import SignaturePad from './SignaturePad';
import StampRing from './StampRing';

// Detailed engineering specifications for each trade
export const CRAFTSMAN_SPECS = {
  ceramics: {
    name: 'أعمال السيراميك والبورسلين والرخام',
    unitDefault: 'متر مربع (م²)',
    priceDefault: 85,
    quantityDefault: 120,
    specs: [
      'الاستواء التام واستخدام قِدة ألومنيوم 3 متر وميزان مياه ليزر، مع انعدام أي تسنين أو بروز بين البلاطات.',
      'استخدام كلبسات وصلايب التسوية (Tile Leveling System) لتوحيد سمك العراميس (2 مم للبورسلين و3 مم للسيراميك).',
      'فرد المونة الأسمنتية أو مادة اللصق بالكامل أسفل البلاطة بنسبة 100% مع منع التطبيل وتفريغ الهواء تماماً.',
      'شطف وتفريغ زوايا وأركان الحوائط البارزة على زاوية 45 درجة (45° Mitered Edge) بماكينة قص المياه.',
      'ضبط ميول أرضيات الحمامات والمطابخ باتجاه الصرف والبيبة بمعدل (1 إلى 1.5 سم لكل متر طولي).',
      'تفريغ وتنظيف العراميس تماماً وسقيتها بمادة سقية مخصصة معالجة ضد البكتيريا ومسح وتنظيف البلاط فوراً.',
      'يلتزم الصنايعي بفك وإعادة تركيب أي بلاطة بها تطبيل أو اعوجاج على نفقته الخاصة مع تحمله ثمن البلاط التالف.'
    ]
  },
  masonry: {
    name: 'أعمال المباني والقواطع والبلوك',
    unitDefault: 'ألف طوبة / م²',
    priceDefault: 450,
    quantityDefault: 15,
    specs: [
      'غمر الطوب الأحمر أو البلوك بالماء الصالح للشرب قبل البناء بساعة على الأقل لمنع امتصاص مياه المونة.',
      'خلط المونة الأسمنتية بنسبة لا تقل عن 300 كجم أسمنت لكل متر مكعب رمل حرش نظيف.',
      'ملء جميع اللحامات والعراميس الأفقية والرأسية بالمونة تماماً دون أي تفريغ وبسمك منتظم (1 إلى 1.5 سم).',
      'ربط القواطع والمباني بالأعمدة والكمرات الخرسانية بكانات صلب مجلفنة ومسامير صلب كل 3 مداميك.',
      'عمل طرف رباط محكم عند التقاء وتعامد الحوائط، واستخدام الشاغول وميزان الخيط لضمان الرأسية التامة.',
      'صب أو تركيب أعتاب خرسانية مسلحة فوق جميع فتحات الأبواب والشبابيك بركوب لا يقل عن 15 سم من الجانبين.',
      'رش ومعالجة الحوائط المنفذة بالماء مرتين يومياً لمدة 3 أيام متتالية بعد انتهاء البناء.'
    ]
  },
  plaster: {
    name: 'أعمال البياض والمحارة والطرطشة',
    unitDefault: 'متر مربع (م²)',
    priceDefault: 45,
    quantityDefault: 350,
    specs: [
      'تنظيف الأسطح الخرسانية ونقرها، وعمل طرطشة مسمارية كثيفة محببة تغطي 100% من المسطح مع الرش 3 أيام.',
      'تثبيت شبك فايبر أو سلك بقلاوة مجلفن بمسامير وورد عند فواصل التقاء الخرسانة بالمباني ومسارات الكهرباء والسباكة.',
      'عمل بؤج وأوتار رأسية وأفقية باستخدام ميزان الخيط وميزان الليزر والقِدة الألومنيوم.',
      'تربيع وزوايا الغرف والصالات بزوايا قائمة 90 درجة تامة باستخدام الزاوية الحديدية الكبيرة.',
      'استلام المسطحات بالقدة 3 متر بدون أي تموجات أو ريجة أو تنميل، مع استقامة الزوايا والسوك والأكتاف.',
      'يلتزم الصنايعي بتكسير وإعادة أي مسطح غير مستقيم أو به ريجة أو تطبيل على حسابه الخاص.'
    ]
  },
  plumbing: {
    name: 'أعمال تأسيس وتشطيب السباكة والصحي',
    unitDefault: 'مقطوعية / حمام ومطبخ',
    priceDefault: 4500,
    quantityDefault: 1,
    specs: [
      'تثبيت خطوط التغذية PPR بمسامير وفيشر وقوافيز كل 60 سم على شِرب موحد مع مراعاة مسافات الخلاطات (15 سم).',
      'إجراء اختبار كبس شبكة التغذية على ضغط (8 إلى 10 بار) لمدة 24 ساعة متواصلة بحضور مهندس الموقع ومندوب الشركة.',
      'ضبط ميول خطوط الصرف الداخلية بمعدل (1 إلى 2 سم لكل متر) نحو القائم، مع تثبيت مزاريب وتفريغ هواء.',
      'تثبيت شاسيهات الكراسي المعلقة بميزان الليزر والتأكد من متانة التثبيت بالمسامير الجوان والقواطع الحديدية.',
      'التأكد من نظافة خطوط الصرف وتغطية جميع الفتحات بالسدادات المخصصة لمنع سقوط أية مخلفات بناء داخلها.',
      'تركيب أطقم الصحي والخلاطات بعناية فائقة دون إحداث أي خدوش، مع منع أي تسريب بمحابس الزاوية والوصلات.'
    ]
  },
  electrical: {
    name: 'أعمال تأسيس وتشطيب الكهرباء والإنارة',
    unitDefault: 'نقطة / مقطوعية',
    priceDefault: 120,
    quantityDefault: 80,
    specs: [
      'تحديد وتوحيد شِرب العلب الماجيك ومفاتيح الإنارة والبرايز في كامل الوحدة بجهاز الليزر بدقة تامة.',
      'تثبيت العلب الماجيك بالمونة الأسمنتية بعمق غاطس مناسب ومحاذاة البؤج والأوتار قبل المحارة.',
      'استخدام أسلاك نحاس أصلية معتمدة (سويدي أصلي) ومطابقة للأقطار (الإنارة 1.5-2مم، البرايز 3-4مم، التكييف 6مم).',
      'حظر استخدام الشحوم أو الزيوت في سحب الأسلاك داخل الخراطيم، واستخدام بودرة التلك المخصصة فقط.',
      'توزيع وترقيم الخطوط والقواطع داخل اللوحة الرئيسية مع عمل بارة تأريض وتجربة القواطع الأوتوماتيكية.',
      'اختبار جميع خطوط الإنارة وبرايز القوى والدش والنت بكاشف الجهد والتأكد من انعدام أي قفلات أو تسريب تيار.'
    ]
  },
  gypsum: {
    name: 'أعمال الأسقف المعلقة والجبس بورد',
    unitDefault: 'متر مسطح / متر طولي',
    priceDefault: 130,
    quantityDefault: 95,
    specs: [
      'استخدام شاسيهات صاج مجلفن معتمد سمك لا يقل عن 0.5 مم، وتعليق بتياش حديد 6 مم بمسافات لا تزيد عن 70 سم.',
      'استخدام ألواح جبس بورد معتمدة (أخضر مقاوم للرطوبة في الحمامات والمطابخ، وأبيض في الصالات والغرف).',
      'تثبيت الألواح بمسامير صلب غاطسة كل 15 سم مع مراعاة فواصل التمدد بين الألواح وتجنب تقابل اللحامات (Cross Joints).',
      'معالجة الفواصل بشاش فايبر عالي الجودة ومعجون فواصل معتمد، وضبط زوايا بيت النور والإضاءة المخفية.',
      'استلام استواء ونعومة كامل السقف بميزان الليزر والتأكد من صلابة ومتانة الهيكل وعدم وجود أي اهتزاز.'
    ]
  },
  paint: {
    name: 'أعمال الدهانات والنقاشة والديكور',
    unitDefault: 'متر مربع (م²)',
    priceDefault: 55,
    quantityDefault: 380,
    specs: [
      'نظافة الحوائط وصنفرتها وإزالة أي زوائد، ودهان وجه سيلر مائي عازل عالي النفاذية لتقوية السطح.',
      'سحب عدد (3) سكاكين معجون عالي الجودة مع مراعاة مدة الجفاف بين السكاكين والصنفرة الناعمة.',
      'فحص واستلام استواء ونعومة المعجون في الظلام الدامس باستخدام كشاف إضاءة جانبي قوي 5000K.',
      'دهان وجه بطانة مخفف وعدد (2) وجه دهان بلاستيك/أكريليك عالي الجودة قابل للغسيل ومطابق لكود اللون المعتمد.',
      'قص زوايا الألوان وفواصل الأسقف بخطوط مستقيمة تماماً باستخدام شريط لاصق خاص (Masking Tape).',
      'تغطية وحماية الأرضيات والألوميتال والأبواب بالبلاستيك والكرتون، وتسليم الموقع نظيفاً خالياً من أي رذاذ بويات.'
    ]
  },
  carpentry: {
    name: 'أعمال النجارة وتركيب الأبواب والتجاليد',
    unitDefault: 'باب / مقطوعية',
    priceDefault: 350,
    quantityDefault: 7,
    specs: [
      'وزن وضبط رأسية الحلوق الزفرة بميزان الخيط، وتثبيتها بالكانات والمسامير الصلب وحقن الفوم العازل.',
      'استلام الخلوصات المنتظمة حول الضلفة (لا تتعدى 2 إلى 3 مم) لضمان سهولة الفتح والغلق دون احتكاك.',
      'تركيب المفصلات الإيطالية والكوالين والمسكات بعناية تامة وتسكيك الأقفال بنعومة وإحكام.',
      'تثبيت الباب المصفح بحشو المونة الأسمنتية ومسامير التثبيت الجوان الثقيلة وضبط ميزان القفل الرأسي والأفقي.'
    ]
  }
};

export const CRAFTSMAN_PRESETS = CRAFTSMAN_SPECS;

export default function CraftsmanContractModal({ project, initialWorker, onUpdate, onClose, companySettings: propCompanySettings, isInline = false }) {
  const activeCompanySettings = propCompanySettings || loadCompanySettings();
  const [tradeKey, setTradeKey] = useState(initialWorker?.trade ? mapTradeToKey(initialWorker.trade) : 'ceramics');
  const activeTrade = CRAFTSMAN_SPECS[tradeKey] || CRAFTSMAN_SPECS.ceramics;

  const savedCraftsmanContracts = project?.craftsmanContracts || {};
  const savedForThisTrade = savedCraftsmanContracts[tradeKey] || {};

  const [formData, setFormData] = useState({
    contractNumber: savedForThisTrade.contractNumber || `SUB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    contractDate: savedForThisTrade.contractDate || todayISO(),
    
    // First Party (الطرف الأول - الشركة / الجهة المشرفة / صاحب العمل)
    firstPartyRole: savedForThisTrade.firstPartyRole || 'الجهة المشرفة / المقاول العام',
    companyName: savedForThisTrade.companyName || activeCompanySettings?.companyName || 'شركة المقاولات والتشطيبات',
    companyRep: savedForThisTrade.companyRep || project?.engineer || 'مدير المشروعات',
    companyPhone: savedForThisTrade.companyPhone || activeCompanySettings?.phone || '',
    companyAddress: savedForThisTrade.companyAddress || activeCompanySettings?.address || '',

    // Second Party (الطرف الثاني - المعلم / مقاول المصنعية / الحرفي)
    secondPartyRole: savedForThisTrade.secondPartyRole || 'المعلم / مقاول المصنعية',
    craftsmanName: savedForThisTrade.craftsmanName || initialWorker?.name || '',
    craftsmanPhone: savedForThisTrade.craftsmanPhone || initialWorker?.phone || '',
    craftsmanNationalId: savedForThisTrade.craftsmanNationalId || '',
    craftsmanAddress: savedForThisTrade.craftsmanAddress || '',
    craftsmanTitle: savedForThisTrade.craftsmanTitle || (activeTrade.name ? activeTrade.name.replace('أعمال ', 'معلم / مقاول ') : 'مقاول مصنعية وباطن'),

    // Project & Location
    projectName: savedForThisTrade.projectName || project?.name || 'موقع تشطيب دمياط',
    projectLocation: savedForThisTrade.projectLocation || project?.area || 'دمياط الجديدة',
    unitDetails: savedForThisTrade.unitDetails || (project ? `${project.type || 'شقة'} - عميل: ${project.client || ''}` : 'شقة سكنية'),

    // Pricing & Quantities
    pricingType: savedForThisTrade.pricingType || 'unit_price',
    unitMeasure: savedForThisTrade.unitMeasure || activeTrade.unitDefault,
    unitPrice: savedForThisTrade.unitPrice || activeTrade.priceDefault,
    estimatedQty: savedForThisTrade.estimatedQty || activeTrade.quantityDefault,
    totalAgreedAmount: savedForThisTrade.totalAgreedAmount || (activeTrade.priceDefault * activeTrade.quantityDefault),

    // Payment Milestones
    advancePayment: savedForThisTrade.advancePayment || 20,
    progressPayment1: savedForThisTrade.progressPayment1 || 30,
    progressPayment2: savedForThisTrade.progressPayment2 || 30,
    finalRetention: savedForThisTrade.finalRetention || 20,

    // Duration & Timeline
    startWorkDate: savedForThisTrade.startWorkDate || todayISO(),
    finishWorkDate: savedForThisTrade.finishWorkDate || (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })(),
    durationDays: savedForThisTrade.durationDays || 14,
    dailyDelayPenalty: savedForThisTrade.dailyDelayPenalty || 200,

    // Specs list
    specsList: savedForThisTrade.specsList || [...activeTrade.specs],
    customNotes: savedForThisTrade.customNotes || 'يلتزم الطرف الثاني بنظافة موقع العمل يومياً وجمع مخلفات الصنعة في أكياس مخصصة.',
    craftsmanSignature: savedForThisTrade.craftsmanSignature || null,
    signedAt: savedForThisTrade.signedAt || null,
  });

  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'edit'
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  function mapTradeToKey(trade) {
    if (!trade) return 'ceramics';
    if (trade.includes('سيراميك') || trade.includes('بلاط') || trade.includes('رخام')) return 'ceramics';
    if (trade.includes('محارة') || trade.includes('بياض')) return 'plaster';
    if (trade.includes('بناء') || trade.includes('مباني')) return 'masonry';
    if (trade.includes('سباك') || trade.includes('صحي')) return 'plumbing';
    if (trade.includes('كهربا')) return 'electrical';
    if (trade.includes('جبس')) return 'gypsum';
    if (trade.includes('دهان') || trade.includes('نقاش')) return 'paint';
    if (trade.includes('نجار')) return 'carpentry';
    return 'ceramics';
  }

  function handleTradeChange(newKey) {
    setTradeKey(newKey);
    const savedForNew = (project?.craftsmanContracts || {})[newKey];
    const tr = CRAFTSMAN_SPECS[newKey];
    if (savedForNew) {
      setFormData(savedForNew);
    } else {
      setFormData(prev => ({
        ...prev,
        unitMeasure: tr.unitDefault,
        unitPrice: tr.priceDefault,
        estimatedQty: tr.quantityDefault,
        totalAgreedAmount: tr.priceDefault * tr.quantityDefault,
        specsList: [...tr.specs],
        craftsmanTitle: prev.craftsmanTitle || (tr.name ? tr.name.replace('أعمال ', 'معلم / مقاول ') : 'مقاول مصنعية')
      }));
    }
  }

  function handleFieldChange(field, val) {
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'unitPrice' || field === 'estimatedQty') {
        const p = field === 'unitPrice' ? Number(val) : Number(next.unitPrice);
        const q = field === 'estimatedQty' ? Number(val) : Number(next.estimatedQty);
        next.totalAgreedAmount = Math.round(p * q);
      }
      if (field === 'startWorkDate' || field === 'durationDays') {
        const start = field === 'startWorkDate' ? val : next.startWorkDate;
        const days = field === 'durationDays' ? Number(val) : Number(next.durationDays);
        if (start && days > 0) {
          try {
            const d = new Date(start);
            d.setDate(d.getDate() + days);
            next.finishWorkDate = d.toISOString().slice(0, 10);
          } catch (e) {}
        }
      }
      return next;
    });
  }

  function handleSpecChange(idx, val) {
    const updated = [...formData.specsList];
    updated[idx] = val;
    setFormData(prev => ({ ...prev, specsList: updated }));
  }

  function addSpecItem() {
    setFormData(prev => ({ ...prev, specsList: [...prev.specsList, ''] }));
  }

  function removeSpecItem(idx) {
    setFormData(prev => ({ ...prev, specsList: prev.specsList.filter((_, i) => i !== idx) }));
  }

  function handleSave() {
    if (onUpdate && project) {
      const existing = project.craftsmanContracts || {};
      const updated = {
        ...existing,
        [tradeKey]: formData
      };
      onUpdate({ craftsmanContracts: updated });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  }

  const total = Number(formData.totalAgreedAmount) || 0;
  const pAdvance = Math.round((formData.advancePayment / 100) * total);
  const pProg1   = Math.round((formData.progressPayment1 / 100) * total);
  const pProg2   = Math.round((formData.progressPayment2 / 100) * total);
  const pFinal   = Math.round((formData.finalRetention / 100) * total);

  function fmtN(n) {
    return Number(n || 0).toLocaleString('ar-EG');
  }

  function handlePrint() {
    handleSave();
    setActiveTab('preview');
    printElement('craftsman-contract-printable', `عقد_مصنعية_${formData.craftsmanName || 'صنايعي'}`);
  }

  function copyContractText() {
    const el = document.getElementById('craftsman-contract-printable');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  function handleDownloadWord() {
    handleSave();
    const element = document.getElementById('craftsman-contract-printable');
    if (!element) return;

    const htmlContent = element.innerHTML;
    const safeName = (formData.craftsmanName || 'صنايعي').replace(/[\\/:*?"<>|]/g, '_');
    const safeTrade = activeTrade.name.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `عقد_${safeTrade}_${safeName}.doc`;

    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${filename}</title>
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 2cm 2cm 2cm 2cm;
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Cairo', 'Traditional Arabic', 'Tahoma', sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            direction: rtl;
            text-align: right;
            color: #000000;
          }
          h1, h2, h3, h4 {
            font-family: 'Cairo', 'Traditional Arabic', 'Tahoma', sans-serif;
            color: #0f172a;
            text-align: right;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 12px 0;
            direction: rtl;
          }
          th, td {
            border: 1px solid #333333;
            padding: 7px 10px;
            text-align: right;
            font-size: 10.5pt;
          }
          th {
            background-color: #f1f5f9;
            font-weight: bold;
          }
          .legal-contract-frame {
            border: 2px solid #000000;
            padding: 24px;
          }
        </style>
      </head>
      <body dir='rtl'>
        <div class='legal-contract-frame'>
          ${htmlContent}
        </div>
      </body>
      </html>`;

    const blob = new Blob(['\ufeff' + wordHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateCraftsmanWhatsAppMessage() {
    let cleanPhone = (formData.craftsmanPhone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('01')) cleanPhone = '2' + cleanPhone;
    else if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.slice(1);

    let msg = `*مشارطة وعقد اتفاق مقاولة مصنعية (${activeTrade.name})*\n`;
    msg += `📄 كود العقد: ${formData.contractNumber}\n`;
    msg += `🏢 الطرف الأول (${formData.firstPartyRole || 'الجهة المشرفة'}): ${formData.companyName}\n`;
    if (formData.companyRep) msg += `👤 ممثل الطرف الأول: ${formData.companyRep} ${formData.companyPhone ? `(${formData.companyPhone})` : ''}\n`;
    msg += `👷 الطرف الثاني (${formData.secondPartyRole || 'المعلم'}): ${formData.craftsmanName || 'المحترم'}${formData.craftsmanTitle ? ` - ${formData.craftsmanTitle}` : ''}\n`;
    if (formData.craftsmanPhone) msg += `📞 هاتف المعلم: ${formData.craftsmanPhone}\n`;
    msg += `📍 الموقع: ${formData.projectLocation} - ${formData.projectName}\n\n`;
    
    msg += `*💰 الاتفاق المالي وجدول الدفعات:*\n`;
    msg += `• الفئة: ${formData.unitPrice} ${getGlobalCurrency()} لكل ${formData.unitMeasure}\n`;
    msg += `• الكمية المقدرة: ${formData.estimatedQty} ${formData.unitMeasure}\n`;
    msg += `• إجمالي المبلغ المقدر: ${fmtN(formData.totalAgreedAmount)} ${getGlobalCurrency()}\n`;
    msg += `• الدفعة الأولى (تشوين وبدء): ${formData.advancePayment}% (${fmtN(pAdvance)} ${getGlobalCurrency()})\n`;
    msg += `• دفعة إنجاز 50%: ${formData.progressPayment1}% (${fmtN(pProg1)} ${getGlobalCurrency()})\n`;
    msg += `• دفعة إنجاز 80%: ${formData.progressPayment2}% (${fmtN(pProg2)} ${getGlobalCurrency()})\n`;
    msg += `• دفعة الختامي والتسليم بالقِدة: ${formData.finalRetention}% (${fmtN(pFinal)} ${getGlobalCurrency()})\n\n`;

    msg += `*⏱️ البرنامج الزمني:* ${formData.durationDays} يوماً (من ${formData.startWorkDate} إلى ${formData.finishWorkDate})\n`;
    msg += `⚠️ غرامة التأخير: ${formData.dailyDelayPenalty} ${getGlobalCurrency()} عن كل يوم تأخير.\n\n`;

    msg += `*📐 أبرز الشروط والمواصفات الفنية الإلزامية:* \n`;
    (formData.specsList || []).slice(0, 4).forEach((sp, i) => {
      msg += `${i + 1}. ${sp}\n`;
    });
    if ((formData.specsList || []).length > 4) {
      msg += `... ومطابقة باقي بنود العقد المعتمد لدى مهندس الموقع.\n`;
    }

    msg += `\n_${formData.companyName} - إدارة الرقابة الهندسية على الجودة_ ✨`;
    return { cleanPhone, text: msg };
  }

  function handleSendWhatsAppCraftsman() {
    handleSave();
    const { cleanPhone, text } = generateCraftsmanWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  }

  const modalBody = (
    <div
      className={isInline ? "contract-inline-card" : "modal-content"}
      onClick={e => e.stopPropagation()}
      style={{
        maxWidth: isInline ? '100%' : 920,
        width: isInline ? '100%' : '96%',
        maxHeight: isInline ? 'none' : '94vh',
        overflowY: isInline ? 'visible' : 'auto',
        borderRadius: 20,
        border: '1px solid var(--border)',
        background: 'var(--card)',
        padding: 0
      }}
    >
        {/* Header Action Bar (No-Print) */}
        <div className="no-print craftsman-modal-header" style={{
          padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', background: '#0F172A', color: '#fff',
          position: 'sticky', top: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Wrench size={20} color="#94A3B8" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>مشارطة وعقد اتفاق مقاول مصنعية وباطن</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>صياغة فنية مشددة تضمن استلام الشغل بالقِدة والميزان وتعديل الطرفين</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* View Switcher */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', padding: 3, borderRadius: 10 }}>
              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: activeTab === 'preview' ? 'var(--amber)' : 'transparent',
                  color: activeTab === 'preview' ? '#fff' : '#E0E7FF',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <Eye size={14} /> معاينة العقد
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: activeTab === 'edit' ? 'var(--amber)' : 'transparent',
                  color: activeTab === 'edit' ? '#fff' : '#E0E7FF',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <Edit3 size={14} /> تخصيص الطرفين والبنود ✍️
              </button>
            </div>

            {project && onUpdate && (
              <button
                onClick={handleSave}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  background: savedSuccess ? '#10B981' : '#3B82F6', color: '#fff', border: 'none',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer'
                }}
              >
                {savedSuccess ? <Check size={14} /> : <Save size={14} />}
                {savedSuccess ? 'تم الحفظ!' : 'حفظ بالمشروع 💾'}
              </button>
            )}

            <button
              onClick={handleSendWhatsAppCraftsman}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: '#25D366', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
              title="إرسال ملخص العقد وشروط الاستلام والمستحقات للصنايعي على الواتساب فوراً"
            >
              <MessageCircle size={14} /> إرسال واتساب 📱
            </button>

            <button
              onClick={handleDownloadWord}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: '#2B579A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
              title="تحميل العقد كملف Microsoft Word للتعديل عليه بحرية"
            >
              <FileDown size={14} /> Word (.doc) 📄
            </button>

            <button
              onClick={copyContractText}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'تم النسخ' : 'نسخ النص'}
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                background: '#10B981', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
              }}
            >
              <Printer size={14} /> طباعة PDF
            </button>

            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Trade Selector Bar (No-Print) */}
        <div className="no-print" style={{
          padding: '12px 24px', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>اختر نوع الصنعة:</span>
          {Object.entries(CRAFTSMAN_SPECS).map(([k, tr]) => (
            <button
              key={k}
              onClick={() => handleTradeChange(k)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)',
                background: tradeKey === k ? '#4338CA' : 'var(--card)',
                color: tradeKey === k ? '#fff' : 'var(--ink)',
                fontSize: 12, fontWeight: tradeKey === k ? 800 : 600, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
            >
              {tr.name.split(' ')[1] || tr.name}
            </button>
          ))}
        </div>

        {/* TAB 1: EDIT FORM */}
        <div className="no-print" style={{ display: activeTab === 'edit' ? 'flex' : 'none', padding: '24px 32px', flexDirection: 'column', gap: 20 }}>
          
          {/* Section 1: First Party (الطرف الأول) */}
          <div style={{ background: 'var(--bg)', border: '1.5px solid rgba(59, 130, 246, 0.35)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h4 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
                <Building2 size={18} color="#3B82F6" /> بيانات الطرف الأول (الشركة / الجهة المشرفة / صاحب العمل)
              </h4>
              <span style={{ fontSize: 11, color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)', padding: '3px 10px', borderRadius: 12, fontWeight: 700 }}>
                جهة الإشراف والتعاقد
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>
                  صفة الطرف الأول في العقد *
                </label>
                <input
                  value={formData.firstPartyRole}
                  placeholder="مثال: الجهة المشرفة / المقاول العام / المالك"
                  onChange={e => handleFieldChange('firstPartyRole', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>
                  اسم الشركة / المنشأة أو الشخص *
                </label>
                <input
                  value={formData.companyName}
                  placeholder="اسم الشركة أو المالك"
                  onChange={e => handleFieldChange('companyName', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>
                  ممثل الطرف الأول (المهندس / المدير) *
                </label>
                <input
                  value={formData.companyRep}
                  placeholder="مثال: م/ أحمد مصطفى"
                  onChange={e => handleFieldChange('companyRep', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  هاتف التواصل للطرف الأول
                </label>
                <input
                  value={formData.companyPhone}
                  placeholder="010... أو +971..."
                  onChange={e => handleFieldChange('companyPhone', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  عنوان ومقر الطرف الأول
                </label>
                <input
                  value={formData.companyAddress}
                  placeholder="مثال: المقر الرئيسي أو عنوان الإشراف"
                  onChange={e => handleFieldChange('companyAddress', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Second Party (الطرف الثاني) */}
          <div style={{ background: 'var(--bg)', border: '1.5px solid rgba(99, 102, 241, 0.35)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h4 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
                <User size={18} color="#6366F1" /> بيانات الطرف الثاني (المعلم / مقاول المصنعية / الحرفي)
              </h4>
              <span style={{ fontSize: 11, color: '#6366F1', background: 'rgba(99, 102, 241, 0.1)', padding: '3px 10px', borderRadius: 12, fontWeight: 700 }}>
                الجهة المنفذة بالمصنعية
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>
                  صفة الطرف الثاني في العقد *
                </label>
                <input
                  value={formData.secondPartyRole}
                  placeholder="مثال: المعلم / مقاول المصنعية / فني باطن"
                  onChange={e => handleFieldChange('secondPartyRole', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>
                  اسم المعلم / الصنايعي *
                </label>
                <input
                  value={formData.craftsmanName}
                  placeholder="مثال: المعلم مصطفى أحمد"
                  onChange={e => handleFieldChange('craftsmanName', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  المسمى المهني أو التخصص
                </label>
                <input
                  value={formData.craftsmanTitle}
                  placeholder="مثال: معلم سيراميك وبورسلين"
                  onChange={e => handleFieldChange('craftsmanTitle', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3, fontWeight: 700 }}>
                  رقم هاتف المعلم / واتساب *
                </label>
                <input
                  value={formData.craftsmanPhone}
                  placeholder="010-..."
                  onChange={e => handleFieldChange('craftsmanPhone', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  بطاقة الرقم القومي
                </label>
                <input
                  value={formData.craftsmanNationalId}
                  placeholder="285..."
                  onChange={e => handleFieldChange('craftsmanNationalId', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
                  محل إقامة وسكن المعلم
                </label>
                <input
                  value={formData.craftsmanAddress}
                  placeholder="دمياط - ..."
                  onChange={e => handleFieldChange('craftsmanAddress', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Project Location & Duration */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <h4 style={{ margin: '0 0 14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
              <MapPin size={17} color="#0D9488" /> بيانات موقع العمل والبرنامج الزمني
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>اسم الموقع / العمارة</label>
                <input value={formData.projectName} onChange={e => handleFieldChange('projectName', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>المنطقة / الحي</label>
                <input value={formData.projectLocation} onChange={e => handleFieldChange('projectLocation', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>تفاصيل الوحدة / العميل</label>
                <input value={formData.unitDetails} onChange={e => handleFieldChange('unitDetails', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>تاريخ بدء العمل</label>
                <input type="date" value={formData.startWorkDate} onChange={e => handleFieldChange('startWorkDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>المدة المحددة للتنفيذ (أيام)</label>
                <input type="number" value={formData.durationDays} onChange={e => handleFieldChange('durationDays', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>تاريخ التسليم المتوقع</label>
                <input type="date" value={formData.finishWorkDate} onChange={e => handleFieldChange('finishWorkDate', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>غرامة التأخير اليومية ({getGlobalCurrency()})</label>
                <input type="number" value={formData.dailyDelayPenalty} onChange={e => handleFieldChange('dailyDelayPenalty', Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
            </div>
          </div>

          {/* Section 4: Pricing & Calculation */}
          <div style={{ background: 'var(--bg)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: 18 }}>
            <h4 style={{ margin: '0 0 14px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
              <DollarSign size={17} color="#10B981" /> حساب المصنعية والكميات والدفعات
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>وحدة القياس والمحاسبة</label>
                <input value={formData.unitMeasure} onChange={e => handleFieldChange('unitMeasure', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>سعر الوحدة المتفق عليه ({getGlobalCurrency()})</label>
                <input type="number" value={formData.unitPrice} onChange={e => handleFieldChange('unitPrice', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontWeight: 700 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>الكمية المقدرة</label>
                <input type="number" value={formData.estimatedQty} onChange={e => handleFieldChange('estimatedQty', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2, fontWeight: 700 }}>إجمالي القيمة المقدرة ({getGlobalCurrency()})</label>
                <input type="number" value={formData.totalAgreedAmount} onChange={e => handleFieldChange('totalAgreedAmount', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '2px solid #10B981', background: 'var(--card)', color: '#10B981', fontWeight: 800, fontSize: 15 }} />
              </div>
            </div>

            {/* Payment Tranches */}
            <div className="craftsman-tranches-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>دفعة بدء وتشوين (%)</label>
                <input type="number" value={formData.advancePayment} onChange={e => handleFieldChange('advancePayment', Number(e.target.value))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>دفعة إنجاز 50% (%)</label>
                <input type="number" value={formData.progressPayment1} onChange={e => handleFieldChange('progressPayment1', Number(e.target.value))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>دفعة إنجاز 80% (%)</label>
                <input type="number" value={formData.progressPayment2} onChange={e => handleFieldChange('progressPayment2', Number(e.target.value))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', color: '#10B981', fontWeight: 700 }}>تسليم نهائي وقِدة (%)</label>
                <input type="number" value={formData.finalRetention} onChange={e => handleFieldChange('finalRetention', Number(e.target.value))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #10B981', background: 'var(--card)', color: 'var(--ink)', fontWeight: 700 }} />
              </div>
            </div>
          </div>

          {/* Section 5: Technical Specs Checklist */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
                <ShieldCheck size={17} color="#F59E0B" /> الشروط والمواصفات الفنية الإلزامية للاستلام
              </h4>
              <button type="button" onClick={addSpecItem} style={{ padding: '4px 10px', borderRadius: 6, background: '#4338CA', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                + إضافة بند فني
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formData.specsList.map((spec, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#4338CA', width: 22, textAlign: 'center' }}>{i + 1}.</span>
                  <input
                    value={spec}
                    onChange={e => handleSpecChange(i, e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', fontSize: 13 }}
                  />
                  <button type="button" onClick={() => removeSpecItem(i)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Craftsman Digital Signature Pad */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
                <PenTool size={17} color="#10B981" /> توقيع وبصمة المعلم الرقمية (باللمس أو الماوس) ✍️
              </h4>
              {formData.craftsmanSignature && (
                <span style={{ fontSize: 12, color: '#10B981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: 8 }}>
                  ✅ تم التوقيع الرقمي
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
              يمكن للصنايعي التوقيع بإصبعه مباشرة على شاشة الموبايل أو باستخدام الماوس لاعتماد بنود العقد فورياً:
            </p>
            <SignaturePad
              initialSignature={formData.craftsmanSignature}
              onSave={(sigData) => {
                handleFieldChange('craftsmanSignature', sigData);
                handleFieldChange('signedAt', sigData ? todayISO() : null);
              }}
              onClear={() => {
                handleFieldChange('craftsmanSignature', null);
                handleFieldChange('signedAt', null);
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setActiveTab('preview')} style={{ padding: '10px 24px', fontSize: 13, fontWeight: 700 }}>
              عرض العقد النهائي للطباعة والتوقيع ←
            </button>
          </div>
        </div>

        {/* TAB 2: LIVE PRINTABLE CRAFTSMAN CONTRACT PREVIEW */}
        <div style={{ display: activeTab === 'preview' ? 'block' : 'none', padding: '24px', background: '#e2e8f0' }}>
          
          {/* Quick Parties Bar on top of preview (No-Print) */}
          <div className="no-print" style={{
            maxWidth: 840, margin: '0 auto 16px', background: '#fff', border: '1px solid #CBD5E1',
            borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 6, border: '1px solid #DBEAFE' }}>الطرف الأول</span>
                <strong style={{ fontSize: 13, color: '#0F172A' }}>{formData.companyName}</strong>
                <span style={{ fontSize: 11, color: '#64748B' }}>({formData.firstPartyRole || 'الجهة المشرفة'})</span>
              </div>
              <div style={{ width: 1, height: 20, background: '#E2E8F0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '2px 8px', borderRadius: 6, border: '1px solid #EDE9FE' }}>الطرف الثاني</span>
                <strong style={{ fontSize: 13, color: '#0F172A' }}>{formData.craftsmanName || 'صنايعي'}</strong>
                <span style={{ fontSize: 11, color: '#64748B' }}>({formData.secondPartyRole || 'المعلم / مقاول المصنعية'})</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('edit')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                background: '#0F172A', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Edit3 size={13} /> تعديل الطرفين والبيانات ✏️
            </button>
          </div>

          <div id="craftsman-contract-printable" className="print-container legal-contract-frame printable-document-target" style={{
            padding: '36px 44px', color: '#0F172A', background: '#fff', lineHeight: 1.7, fontSize: 13,
            fontFamily: 'Cairo, Tahoma, sans-serif', maxWidth: 840, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #0F172A', paddingBottom: 14, marginBottom: 18, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {activeCompanySettings?.companyLogo && (
                  <img
                    src={activeCompanySettings.companyLogo}
                    alt="شعار الشركة"
                    style={{ maxHeight: 52, maxWidth: 100, objectFit: 'contain' }}
                  />
                )}
                <div>
                  <div style={{ fontSize: 21, fontWeight: 900, color: '#0F172A', letterSpacing: -0.5 }}>{formData.companyName}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>إدارة المشروعات والتنفيذ والرقابة الهندسية على الجودة</div>
                  {formData.companyPhone && <div style={{ fontSize: 11, color: '#64748B' }}>هاتف الإدارة: {formData.companyPhone}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>كود العقد: {formData.contractNumber}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>تاريخ التحرير: {formData.contractDate}</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', margin: '20px 0', border: '2px solid #0F172A', padding: '8px 14px', background: '#F8FAFC', borderRadius: 6 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0F172A' }}>
                مشارطة وعقد اتفاق مقاولة مصنعية ({activeTrade.name})
              </h3>
            </div>

            {/* Parties */}
            <div style={{ marginBottom: 16 }}>
              <p>
                إنه في يوم <strong>{new Date(formData.contractDate).toLocaleDateString('ar-EG', { weekday: 'long' })}</strong> الموافق <strong>{formData.contractDate}</strong>، اتفق كل من:
              </p>
              <div style={{ padding: '12px 16px', background: '#F1F5F9', borderRadius: 6, margin: '8px 0', borderRight: '4px solid #0F172A', lineHeight: 1.8 }}>
                <div>
                  <strong>الطرف الأول ({formData.firstPartyRole || 'الجهة المشرفة'}):</strong> {formData.companyName}، {formData.companyAddress ? `المقر: ${formData.companyAddress}، ` : ''}ويمثلها السيد / <strong>{formData.companyRep}</strong>{formData.companyPhone ? `، هاتف: ${formData.companyPhone}` : ''}.
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>الطرف الثاني ({formData.secondPartyRole || 'المعلم / مقاول المصنعية'}):</strong> السيد / <strong>{formData.craftsmanName || '................................'}</strong>{formData.craftsmanTitle ? ` (${formData.craftsmanTitle})` : ''}، بطاقة رقم قومي: <strong>{formData.craftsmanNationalId || '............................'}</strong>، هاتف: <strong>{formData.craftsmanPhone || '............................'}</strong>، المقيم في: <strong>{formData.craftsmanAddress || '............................'}</strong>.
                </div>
              </div>
            </div>

            {/* Clause 1: Subject & Location */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ borderBottom: '1px solid #CBD5E1', paddingBottom: 2, margin: '12px 0 6px', color: '#0F172A' }}>البند الأول: موضوع العمل ومحل التنفيذ</h4>
              <p>
                يسند الطرف الأول للطرف الثاني تنفيذ كامل <strong>{activeTrade.name}</strong> بالمصنعية فقط لوحدة العمل الكائنة في: <strong>{formData.projectLocation} - {formData.projectName} ({formData.unitDetails})</strong>، طبقاً لأصول الصنعة والمواصفات الفنية المذكورة في هذا العقد وتحت الإشراف الهندسي المباشر.
              </p>
            </div>

            {/* Clause 2: Financials */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ borderBottom: '1px solid #CBD5E1', paddingBottom: 2, margin: '12px 0 6px', color: '#0F172A' }}>البند الثاني: فئات الأسعار وطريقة المحاسبة وجدول الدفعات</h4>
              <p>
                اتفق الطرفان على محاسبة الطرف الثاني بفئة <strong>({formData.unitPrice} {getGlobalCurrency()}) لكل {formData.unitMeasure}</strong>، بإجمالي كمية مقدرة هندسياً <strong>({formData.estimatedQty} {formData.unitMeasure})</strong>، ليكون الإجمالي المقدر للعملية هو <strong>({fmtN(formData.totalAgreedAmount)} {getGlobalCurrency()})</strong>، وتتم المحاسبة الختامية طبقاً للحصر الفعلي المعتمد من مهندس الموقع بعد الاستلام، وتصرف المستحقات على النحو التالي:
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, margin: '8px 0', border: '1px solid #CBD5E1' }}>
                <thead>
                  <tr style={{ background: '#E2E8F0', borderBottom: '1.5px solid #0F172A' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>الدفعة</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>شرط الاستحقاق</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>النسبة</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>المبلغ المقدر</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>الدفعة الأولى (تشوين وبدء)</td>
                    <td style={{ padding: '6px 8px' }}>عند دخول الموقع والبدء الفعلي في تنفيذ الأعمال وتجهيز العدد</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{formData.advancePayment}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{fmtN(pAdvance)} {getGlobalCurrency()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>الدفعة الثانية (منتصف الأعمال)</td>
                    <td style={{ padding: '6px 8px' }}>عند إنجاز 50% من الأعمال ومطابقتها للمواصفات دون ملاحظات</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{formData.progressPayment1}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{fmtN(pProg1)} {getGlobalCurrency()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>الدفعة الثالثة (استلام أولي)</td>
                    <td style={{ padding: '6px 8px' }}>عند إتمام 80% من الأعمال واعتماد الاستلام المبدئي بالقِدة</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{formData.progressPayment2}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{fmtN(pProg2)} {getGlobalCurrency()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1.5px solid #0F172A', background: '#F8FAFC' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>الدفعة الرابعة (الختامي والتسليم)</td>
                    <td style={{ padding: '6px 8px' }}>تصرف بعد الاستلام النهائي بالقِدة والميزان ونظافة الموقع وتصفية الهالك</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#0F766E', fontWeight: 800 }}>{formData.finalRetention}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, color: '#0F766E' }}>{fmtN(pFinal)} {getGlobalCurrency()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Clause 3: Technical Specifications */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ borderBottom: '1px solid #CBD5E1', paddingBottom: 2, margin: '12px 0 6px', color: '#0F172A' }}>البند الثالث: المواصفات الفنية الإلزامية وشروط الاستلام</h4>
              <p>يلتزم الطرف الثاني بالتقيد التام بالمواصفات والاشتراطات الهندسية التالية:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '6px 0' }}>
                {formData.specsList.map((sp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                    <strong style={{ color: '#0F172A' }}>{i + 1}.</strong>
                    <span>{sp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clause 4: Duration & Penalty */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ borderBottom: '1px solid #CBD5E1', paddingBottom: 2, margin: '12px 0 6px', color: '#0F172A' }}>البند الرابع: مدة التنفيذ وغرامات التأخير وإهدار الخامات</h4>
              <p>
                يلتزم الطرف الثاني بإنهاء وتسليم كافة الأعمال الموكلة إليه في مدة أقصاها <strong>({formData.durationDays}) يوماً</strong>، تبدأ من <strong>{formData.startWorkDate}</strong> وتنتهي في <strong>{formData.finishWorkDate}</strong>.
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>الشرط الجزائي:</strong> في حال تأخر الطرف الثاني عن موعد التسليم دون عذر قهري معتمد من مهندس الموقع، يُخصم منه مبلغ <strong>({formData.dailyDelayPenalty} {getGlobalCurrency()}) عن كل يوم تأخير</strong>. كما يلتزم الطرف الثاني بالمحافظة على خامات المالك والشركة، وفي حال تسببه في إهدار زائد عن النسبة الهندسية المقبولة (3%) أو تلف بالخامات لسوء المصنعية، يتم خصم ثمن الخامات التالفة من مستحقاته فوراً.
              </p>
            </div>

            {/* Signatures */}
            <div style={{ marginTop: 30, paddingTop: 16, borderTop: '2px solid #0F172A' }}>
              <p style={{ textAlign: 'center', fontSize: 12, marginBottom: 20 }}>
                تحرر هذا العقد من نسختين موقعتين للعمل بموجبها وتعتبر بنوده ملزمة للطرفين فور التوقيع.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, textAlign: 'center', alignItems: 'start' }}>
                {/* First Party (Company / Owner) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>الطرف الأول ({formData.firstPartyRole || 'الجهة المشرفة'})</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{formData.companyName}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>الممثل: {formData.companyRep}</div>
                  
                  {/* Official Company Seal & Signature */}
                  <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ transform: 'scale(0.85)', margin: '-10px 0' }}>
                      <StampRing value={100} size={84} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F766E' }}>
                      معتمد ومختوم إلكترونياً ✓
                    </span>
                  </div>
                  <div style={{ borderBottom: '1.5px solid #0F172A', width: '80%', margin: '6px auto 0' }} />
                </div>

                {/* Second Party (Craftsman) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>الطرف الثاني ({formData.secondPartyRole || 'المعلم / مقاول المصنعية'})</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{formData.craftsmanTitle ? `${formData.craftsmanTitle} / ` : 'المعلم / '}{formData.craftsmanName || '...............................'}</div>
                  {formData.craftsmanPhone && <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>هاتف: {formData.craftsmanPhone}</div>}
                  
                  {formData.craftsmanSignature ? (
                    <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={formData.craftsmanSignature}
                        alt="توقيع المعلم"
                        style={{ maxHeight: 75, maxWidth: 200, objectFit: 'contain' }}
                      />
                      <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 800 }}>
                        توقيع وبصمة إلكترونية معتمدة ✅ ({formData.signedAt || formData.contractDate})
                      </span>
                    </div>
                  ) : (
                    <div style={{ width: '100%', maxWidth: 260, margin: '0 auto' }} className="no-print">
                      <SignaturePad
                        onSave={(sigData) => {
                          handleFieldChange('craftsmanSignature', sigData);
                          handleFieldChange('signedAt', sigData ? todayISO() : null);
                        }}
                        onClear={() => {
                          handleFieldChange('craftsmanSignature', null);
                          handleFieldChange('signedAt', null);
                        }}
                      />
                    </div>
                  )}
                  
                  <div style={{ borderBottom: '1.5px solid #0F172A', width: '80%', margin: '6px auto 0' }} />
                  {!formData.craftsmanSignature && (
                    <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 4 }} className="no-print">
                      (وقّع أعلاه بإصبعك أو الماوس لاعتماد العقد)
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
  );

  if (isInline) {
    return (
      <div className="contract-inline-wrapper tab-fade">
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: 'var(--card)',
              color: 'var(--ink)',
              border: '1px solid var(--border)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <ChevronLeft size={16} /> <span>← العودة إلى مركز العقود والعميل</span>
          </button>
        </div>
        {modalBody}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999, background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(6px)' }}>
      {modalBody}
    </div>
  );
}
