const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          // Close notification popover if open
          const closePopover = document.querySelector('button[aria-label=\"close\"], .popover button');
          
          const navItems = Array.from(document.querySelectorAll('button, a'));
          const engTab = navItems.find(b => b.textContent.includes('أداء المهندسين'));
          if (engTab) engTab.click();
          return { clickedEngTab: !!engTab };
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
      fs.writeFileSync('scripts/live-engineers-screen.png', Buffer.from(msg.result.data, 'base64'));
      console.log('Saved screenshot to scripts/live-engineers-screen.png');
      process.exit(0);
    });
  }
};
