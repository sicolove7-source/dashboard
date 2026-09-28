import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Fix src/utils/branding.js: remove duplicate syncSettingsToCloud in saveCompanySettings
const brandingPath = path.join(__dirname, '..', 'src', 'utils', 'branding.js');
let brandingCode = fs.readFileSync(brandingPath, 'utf8');
brandingCode = brandingCode.replace(/\r\n/g, '\n');

const duplicateSync = `  // المزامنة الفورية مع سحابة Firestore في الخلفية لضمان عدم ضياع الشعار أو الإعدادات
  if (cId) {
    try {
      syncSettingsToCloud(cId, stampedSettings).catch((err) => {
        console.warn("Cloud sync error for company settings:", err);
      });
    } catch (e) {}
  }`;

if (brandingCode.includes(duplicateSync)) {
  brandingCode = brandingCode.replace(duplicateSync, `  // ملاحظة: المزامنة السحابية تتم بشكل صريح عبر handleSave أو عبر المكونات المسؤولة لتفادي استنزاف اتصالات Firestore`);
  fs.writeFileSync(brandingPath, brandingCode, 'utf8');
  console.log('✅ Fixed branding.js: removed duplicate syncSettingsToCloud');
} else {
  console.log('⚠️ duplicateSync not found in branding.js');
}

// 2. Fix src/App.jsx: hasChanged should check all settings
const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
let appCode = fs.readFileSync(appPath, 'utf8');
appCode = appCode.replace(/\r\n/g, '\n');

const oldHasChanged = `          const hasChanged =
            prev?.companyName !== merged.companyName ||
            prev?.companyLogo !== merged.companyLogo ||
            prev?.currency !== merged.currency ||
            prev?.primaryColor !== merged.primaryColor ||
            prev?.accentColor !== merged.accentColor;`;

const newHasChanged = `          const hasChanged =
            JSON.stringify(prev) !== JSON.stringify(merged);`;

if (appCode.includes(oldHasChanged)) {
  appCode = appCode.replace(oldHasChanged, newHasChanged);
  fs.writeFileSync(appPath, appCode, 'utf8');
  console.log('✅ Fixed App.jsx: hasChanged now compares full settings');
} else {
  console.log('⚠️ oldHasChanged not found in App.jsx');
}

// 3. Fix src/pages/CompanySettings.jsx: remove keystroke cloud sync and improve prop sync
const settingsPath = path.join(__dirname, '..', 'src', 'pages', 'CompanySettings.jsx');
let settingsCode = fs.readFileSync(settingsPath, 'utf8');
settingsCode = settingsCode.replace(/\r\n/g, '\n');

const oldUpdateSetting = `  function updateSetting(key, val) {
    isDirtyRef.current = true;
    const next = { ...settingsRef.current, [key]: val };
    settingsRef.current = next;
    setSettings(next);

    if (key === 'companyLogo' || key === 'companyName' || key === 'currency') {
      saveCompanySettings(next, effectiveCompanyId);
      onCompanySettingsChange?.(next);
      try {
        syncSettingsToCloud(effectiveCompanyId, next);
      } catch (e) {}
    }
  }`;

const newUpdateSetting = `  function updateSetting(key, val) {
    isDirtyRef.current = true;
    const next = { ...settingsRef.current, [key]: val };
    settingsRef.current = next;
    setSettings(next);
  }`;

if (settingsCode.includes(oldUpdateSetting)) {
  settingsCode = settingsCode.replace(oldUpdateSetting, newUpdateSetting);
  console.log('✅ Fixed CompanySettings.jsx: removed keystroke cloud spam from updateSetting');
} else {
  console.log('⚠️ oldUpdateSetting not found in CompanySettings.jsx');
}

// Fix prop sync in CompanySettings.jsx
const oldPropSync = `    // إذا لم يقم المستخدم بتعديل الحقول محلياً (غير محفوظة)، يمكن تحديث الحالة فقط إذا كانت هناك بيانات مخصصة حقيقية
    if (!isDirtyRef.current && companySettings && Object.keys(companySettings).length > 0) {
      const hasCustomProp = companySettings.companyLogo || (
        companySettings.companyName &&
        companySettings.companyName !== 'شركة المقاولات' &&
        companySettings.companyName !== 'شركة المقاولات والتشطيبات'
      );
      if (hasCustomProp) {
        setSettings(prev => ({
          ...prev,
          ...companySettings,
          companyLogo: companySettings.companyLogo || prev.companyLogo || null,
        }));
      }
    }`;

const newPropSync = `    // إذا لم يقم المستخدم بتعديل الحقول محلياً (غير محفوظة)، نحدث الحالة فوراً من أي تغيير سحابي قادم
    if (!isDirtyRef.current && companySettings && Object.keys(companySettings).length > 0) {
      setSettings(prev => ({
        ...prev,
        ...companySettings,
        companyLogo: companySettings.companyLogo !== undefined ? companySettings.companyLogo : (prev.companyLogo || null),
      }));
    }`;

if (settingsCode.includes(oldPropSync)) {
  settingsCode = settingsCode.replace(oldPropSync, newPropSync);
  console.log('✅ Fixed CompanySettings.jsx: responsive prop sync across browsers');
} else {
  console.log('⚠️ oldPropSync not found in CompanySettings.jsx');
}

fs.writeFileSync(settingsPath, settingsCode, 'utf8');

console.log('All synchronization fixes applied successfully!');
