const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Page.captureScreenshot',
      params: { format: 'png' }
    }));
  }, 1000);
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 1) {
    import('fs').then(fs => {
      fs.writeFileSync('scripts/live-engineers-loaded.png', Buffer.from(msg.result.data, 'base64'));
      console.log('Saved loaded screenshot');
      process.exit(0);
    });
  }
};
