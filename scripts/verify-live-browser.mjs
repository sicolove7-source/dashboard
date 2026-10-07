const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  console.log('Reloading active tab on tashteebpro.com...');
  ws.send(JSON.stringify({ id: 1, method: 'Page.reload', params: { ignoreCache: true } }));
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (() => {
            const list = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
            const nglaa = list.find(t => t.id === 'comp_nglaa');
            return {
              totalTenants: list.length,
              nglaa: nglaa ? {
                name: nglaa.name,
                adminEmail: nglaa.adminEmail,
                users: nglaa.users,
                team: nglaa.team
              } : null
            };
          })()
        `,
        returnByValue: true
      }
    }));
  }, 4000);
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 2) {
    console.log('Live Browser Verification:\n', JSON.stringify(msg.result?.result?.value, null, 2));
    process.exit(0);
  }
};
