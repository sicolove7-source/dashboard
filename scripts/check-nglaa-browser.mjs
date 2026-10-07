const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (() => {
          const list = JSON.parse(localStorage.getItem('platform-tenants-master-v1') || '[]');
          const nglaa = list.find(t => t.id === 'comp_nglaa');
          return {
            totalTenants: list.length,
            nglaaFound: !!nglaa,
            nglaa
          };
        })()
      `,
      returnByValue: true
    }
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 1) {
    console.log('Result:\n', JSON.stringify(msg.result?.result?.value, null, 2));
    process.exit(0);
  }
};
