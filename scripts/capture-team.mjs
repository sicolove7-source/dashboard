const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          // Click skip on onboarding modal if present
          const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('تخطي') || b.textContent.includes('سأستكشف'));
          if (skipBtn) skipBtn.click();
          const closeBtn = document.querySelector('.onboarding-modal button');
          if (closeBtn) closeBtn.click();
          
          // Navigate to settings tab and team subtab
          const settingsBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('إعدادات') || b.textContent.includes('الإعدادات'));
          if (settingsBtn) settingsBtn.click();

          return { clickedSkip: !!skipBtn, clickedSettings: !!settingsBtn };
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
            // Click on team sub-tab in settings
            const teamSubTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('فريق العمل'));
            if (teamSubTab) teamSubTab.click();
            return { clickedTeamSubTab: !!teamSubTab };
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
  }, 2500);
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 3) {
    import('fs').then(fs => {
      fs.writeFileSync('scripts/live-team-screen.png', Buffer.from(msg.result.data, 'base64'));
      console.log('Saved live team screenshot to scripts/live-team-screen.png');
      process.exit(0);
    });
  }
};
