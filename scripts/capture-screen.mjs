import fs from 'fs';

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Page.captureScreenshot',
    params: { format: 'png' }
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 1) {
    const buffer = Buffer.from(msg.result.data, 'base64');
    fs.writeFileSync('scripts/live-nglaa-screen.png', buffer);
    console.log('Saved screenshot to scripts/live-nglaa-screen.png');
    process.exit(0);
  }
};
