const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Page.navigate',
    params: { url: 'https://tashteebpro.com/tenants' }
  }));
  setTimeout(() => {
    console.log('Navigated back to tashteebpro.com/tenants');
    process.exit(0);
  }, 2000);
};
