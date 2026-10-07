const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          // Let's close onboarding tour
          try {
            localStorage.setItem('has_seen_onboarding_tour', 'true');
            sessionStorage.setItem('has_seen_onboarding_tour', 'true');
          } catch (e) {}

          // Find the close button (the SVG X icon button)
          const allButtons = Array.from(document.querySelectorAll('button'));
          const xBtn = allButtons.find(b => b.innerHTML.includes('line') || b.innerHTML.includes('svg') || b.textContent.includes('تخطي'));
          if (xBtn) xBtn.click();

          // Also remove the modal element directly if needed
          const modalBackdrop = document.querySelector('div[style*=\"fixed\"][style*=\"z-index\"]');
          const isModal = document.querySelector('.onboarding-modal, [class*=\"modal\"], [class*=\"tour\"]');

          return {
            buttonsCount: allButtons.length,
            foundX: !!xBtn
          };
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
            // Find settings button in sidebar
            const links = Array.from(document.querySelectorAll('button, a, div[role=\"button\"]'));
            const settingsItem = links.find(el => el.textContent.trim().includes('الإعدادات') || el.textContent.trim() === 'إعدادات');
            if (settingsItem) settingsItem.click();
            return { clickedSettings: !!settingsItem };
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
      fs.writeFileSync('scripts/live-team-screen2.png', Buffer.from(msg.result.data, 'base64'));
      console.log('Saved screenshot 2');
      process.exit(0);
    });
  }
};
