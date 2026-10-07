import fs from 'fs';

async function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  const pagesRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await pagesRes.json();
  const page = pages.find(p => p.url && p.url.includes('alofok2948'));

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const owner = {
    id: 'u_owner_alofok',
    email: 'alofok2948@tashteebpro.com',
    role: 'owner',
    name: 'م. إبراهيم كمال',
    companyId: 'comp_alofok2948',
    companyName: 'شركة الأفق للمقاولات والديكور 2948'
  };

  // Set cookie and localStorage
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const u = ${JSON.stringify(owner)};
      localStorage.setItem('active_session_user', JSON.stringify(u));
      localStorage.setItem('platform-active-tenant-id', 'comp_alofok2948');
      
      const cookieStr = encodeURIComponent(JSON.stringify(u));
      document.cookie = "tashteeb_session_user=" + cookieStr + "; path=/; domain=.tashteebpro.com; max-age=604800";
      document.cookie = "tashteeb_session_user=" + cookieStr + "; path=/; max-age=604800";
      return { cookieSet: true };
    })()`
  });

  await sendCdp(ws, 'Page.navigate', { url: 'https://alofok2948.tashteebpro.com/overview' });
  await new Promise(r => setTimeout(r, 4000));

  const check = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        url: window.location.href,
        hasSidebar: !!document.querySelector('.sidebar, .app-sidebar, nav'),
        hasOverview: text.includes('نظرة عامة') || text.includes('المشاريع'),
        snippet: text.slice(0, 200).replace(/\\n+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Result:', check.result?.value);

  const { data: shot } = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/Computec/.gemini/antigravity-ide/brain/688c3061-28a0-4b2a-82fa-3e61b705c0d3/41_cookie_auth_check.png', Buffer.from(shot, 'base64'));

  ws.close();
}

run().catch(console.error);
