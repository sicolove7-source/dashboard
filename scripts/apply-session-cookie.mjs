import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsxPath = path.join(__dirname, '..', 'src', 'App.jsx');
const loginJsxPath = path.join(__dirname, '..', 'src', 'pages', 'Login.jsx');

// 1. Update App.jsx
let appCode = fs.readFileSync(appJsxPath, 'utf8');

// Update currentUser
const oldCurrentUser = `  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('active_session_user');
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (e) {
      return null;
    }
  });`;

const newCurrentUser = `  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('active_session_user');
      if (cached) {
        return JSON.parse(cached);
      }
      const cookieUser = getCrossSubdomainCookie('tashteeb_session_user');
      if (cookieUser && typeof cookieUser === 'object') {
        try { localStorage.setItem('active_session_user', JSON.stringify(cookieUser)); } catch (e) {}
        return cookieUser;
      }
      return null;
    } catch (e) {
      return null;
    }
  });`;

const oldIsAuth = `  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return !!localStorage.getItem('active_session_user');
    } catch (e) {
      return false;
    }
  });`;

const newIsAuth = `  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      if (localStorage.getItem('active_session_user')) return true;
      if (getCrossSubdomainCookie('tashteeb_session_user')) return true;
      return false;
    } catch (e) {
      return false;
    }
  });`;

const oldAuthLoading = `  const [authLoading, setAuthLoading] = useState(() => {
    try {
      return !localStorage.getItem('active_session_user');
    } catch (e) {
      return true;
    }
  });`;

const newAuthLoading = `  const [authLoading, setAuthLoading] = useState(() => {
    try {
      return !localStorage.getItem('active_session_user') && !getCrossSubdomainCookie('tashteeb_session_user');
    } catch (e) {
      return true;
    }
  });`;

// Normalize line endings for replacement
appCode = appCode.replace(/\r\n/g, '\n');
if (appCode.includes(oldCurrentUser.replace(/\r\n/g, '\n'))) {
  appCode = appCode.replace(oldCurrentUser.replace(/\r\n/g, '\n'), newCurrentUser.replace(/\r\n/g, '\n'));
  console.log('Updated currentUser in App.jsx');
} else {
  console.log('Could not find oldCurrentUser in App.jsx');
}

if (appCode.includes(oldIsAuth.replace(/\r\n/g, '\n'))) {
  appCode = appCode.replace(oldIsAuth.replace(/\r\n/g, '\n'), newIsAuth.replace(/\r\n/g, '\n'));
  console.log('Updated isAuthenticated in App.jsx');
}

if (appCode.includes(oldAuthLoading.replace(/\r\n/g, '\n'))) {
  appCode = appCode.replace(oldAuthLoading.replace(/\r\n/g, '\n'), newAuthLoading.replace(/\r\n/g, '\n'));
  console.log('Updated authLoading in App.jsx');
}

// Update handleLogin: save session cookie
const oldRedirectLogin = `        try {
          // حفظ الجلسة أولاً قبل الانتقال
          localStorage.setItem('active_session_user', JSON.stringify(userData));
          setActiveTenantId(compId);
        } catch (e) {}`;

const newRedirectLogin = `        try {
          // حفظ الجلسة أولاً قبل الانتقال
          localStorage.setItem('active_session_user', JSON.stringify(userData));
          setCrossSubdomainCookie('tashteeb_session_user', userData);
          setActiveTenantId(compId);
        } catch (e) {}`;

if (appCode.includes(oldRedirectLogin.replace(/\r\n/g, '\n'))) {
  appCode = appCode.replace(oldRedirectLogin.replace(/\r\n/g, '\n'), newRedirectLogin.replace(/\r\n/g, '\n'));
  console.log('Updated redirect login in App.jsx');
}

const oldNormalLogin = `    try {
      localStorage.setItem('active_session_user', JSON.stringify(finalUserData));
    } catch (e) {}`;

const newNormalLogin = `    try {
      localStorage.setItem('active_session_user', JSON.stringify(finalUserData));
      setCrossSubdomainCookie('tashteeb_session_user', finalUserData);
    } catch (e) {}`;

if (appCode.includes(oldNormalLogin.replace(/\r\n/g, '\n'))) {
  appCode = appCode.replace(oldNormalLogin.replace(/\r\n/g, '\n'), newNormalLogin.replace(/\r\n/g, '\n'));
  console.log('Updated normal login in App.jsx');
}

// Update handleLogout
const oldLogout = `    try {
      localStorage.removeItem('active_session_user');
      localStorage.removeItem(ACTIVE_TENANT_ID_KEY);`;

const newLogout = `    try {
      localStorage.removeItem('active_session_user');
      removeCrossSubdomainCookie('tashteeb_session_user');
      localStorage.removeItem(ACTIVE_TENANT_ID_KEY);`;

if (appCode.includes(oldLogout.replace(/\r\n/g, '\n'))) {
  appCode = appCode.replace(oldLogout.replace(/\r\n/g, '\n'), newLogout.replace(/\r\n/g, '\n'));
  console.log('Updated handleLogout in App.jsx');
}

fs.writeFileSync(appJsxPath, appCode, 'utf8');
console.log('Saved App.jsx');

// 2. Update Login.jsx
let loginCode = fs.readFileSync(loginJsxPath, 'utf8');
loginCode = loginCode.replace(/\r\n/g, '\n');

// Import removeCrossSubdomainCookie
loginCode = loginCode.replace(
  `import { isCompanySubdomain, getSubdomain, getSubdomainUrl, getCrossSubdomainCookie, setCrossSubdomainCookie } from "../services/subdomainResolver";`,
  `import { isCompanySubdomain, getSubdomain, getSubdomainUrl, getCrossSubdomainCookie, setCrossSubdomainCookie, removeCrossSubdomainCookie } from "../services/subdomainResolver";`
);

// Save session cookie on register
const oldRegSave = `      // حفظ بيانات الجلسة مبكراً لتفادي شاشة Login عند الانتقال
      try {
        localStorage.setItem('active_session_user', JSON.stringify(res.user));
      } catch (e) {}`;

const newRegSave = `      // حفظ بيانات الجلسة مبكراً لتفادي شاشة Login عند الانتقال
      try {
        localStorage.setItem('active_session_user', JSON.stringify(res.user));
        setCrossSubdomainCookie('tashteeb_session_user', res.user);
      } catch (e) {}`;

if (loginCode.includes(oldRegSave.replace(/\r\n/g, '\n'))) {
  loginCode = loginCode.replace(oldRegSave.replace(/\r\n/g, '\n'), newRegSave.replace(/\r\n/g, '\n'));
  console.log('Updated reg save in Login.jsx');
}

// Auto redirect timer: give user 6 seconds or 1-click button
loginCode = loginCode.replace(`}, 1800);`, `}, 6000);`);

// Logout cleanup in Login.jsx
loginCode = loginCode.replace(
  `        await logoutUser();
        localStorage.removeItem('active_session_user');`,
  `        await logoutUser();
        localStorage.removeItem('active_session_user');
        removeCrossSubdomainCookie('tashteeb_session_user');`
);

fs.writeFileSync(loginJsxPath, loginCode, 'utf8');
console.log('Saved Login.jsx');
