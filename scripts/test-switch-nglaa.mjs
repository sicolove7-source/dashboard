const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (async () => {
          // Find button or call switch
          const buttons = Array.from(document.querySelectorAll('button'));
          const nglaaRow = Array.from(document.querySelectorAll('tr')).find(tr => tr.textContent.includes('نجلا'));
          let switchBtn = null;
          if (nglaaRow) {
            switchBtn = nglaaRow.querySelector('button');
            if (switchBtn) switchBtn.click();
          }
          return {
            nglaaRowFound: !!nglaaRow,
            switchBtnClicked: !!switchBtn
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          (async () => {
            const teamRaw = localStorage.getItem('tenant_comp_nglaa_team');
            const usersRaw = localStorage.getItem('tenant_comp_nglaa_users');
            return {
              activeTenantId: localStorage.getItem('tashteeb_active_company_id') || localStorage.getItem('platform-active-tenant-id'),
              team: teamRaw ? JSON.parse(teamRaw) : null,
              users: usersRaw ? JSON.parse(usersRaw) : null
            };
          })()
        `,
        awaitPromise: true,
        returnByValue: true
      }
    }));
  }, 3000);
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 2) {
    console.log('Result after switching to nglaa:\n', JSON.stringify(msg.result?.result?.value, null, 2));
    process.exit(0);
  }
};
