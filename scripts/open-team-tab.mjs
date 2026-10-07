const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          // Click backdrop or close button
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            const btn = backdrop.querySelector('button');
            if (btn) btn.click();
            else backdrop.click();
          }

          // In App.jsx, setTab('settings')
          const navItems = Array.from(document.querySelectorAll('button, a'));
          const settingsBtn = navItems.find(b => b.textContent.includes('الإعدادات'));
          if (settingsBtn) settingsBtn.click();

          return { foundBackdrop: !!backdrop, foundSettings: !!settingsBtn };
        })()
      `,
      returnByValue: true
    }
  }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const teamTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('فريق العمل'));
            if (teamTabBtn) teamTabBtn.click();
            return { clickedTeamTab: !!teamTabBtn };
          })()
        `,
        returnByValue: true
      }
    }));
  }, 1000);

  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 3,
      method: 'Page.captureScreenshot',
      params: { format: 'png' }
    }));
  }, 2000);
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 3) {
    import('fs').then(fs => {
      fs.writeFileSync('scripts/live-team-verified.png', Buffer.from(msg.result.data, 'base64'));
      console.log('Saved screenshot to scripts/live-team-verified.png');
      process.exit(0);
    });
  }
};
