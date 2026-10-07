const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          // Close notification card by clicking its X
          const notifCard = Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('التنبيهات الذكية'));
          if (notifCard) {
            const xBtn = notifCard.querySelector('button');
            if (xBtn) xBtn.click();
          }
          // Also click the bell icon to toggle off
          const bell = document.querySelector('button .lucide-bell')?.parentElement;
          if (bell) bell.click();

          // Click "أداء المهندسين"
          const engTab = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('أداء المهندسين'));
          if (engTab) engTab.click();

          return { closedNotif: !!notifCard, clickedEng: !!engTab };
        })()
      `,
      returnByValue: true
    }
  }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 2,
      method: 'Page.captureScreenshot',
      params: { format: 'png' }
    }));
  }, 1500);
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 2) {
    import('fs').then(fs => {
      fs.writeFileSync('scripts/live-engineers-tab.png', Buffer.from(msg.result.data, 'base64'));
      console.log('Saved screenshot to scripts/live-engineers-tab.png');
      process.exit(0);
    });
  }
};
