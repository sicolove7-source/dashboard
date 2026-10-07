const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4213B1E7C4C9EAACF986ACBD35101DD9');

ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
        (async () => {
          try {
            const raw = localStorage.getItem('platform-tenants-master-v1');
            const currentUser = localStorage.getItem('active_session_user');
            
            // Let's call loadAllTenantsAsync directly from window or evaluate fetch
            let cloudFetchResult = 'not_called';
            let cloudFetchError = null;
            try {
              const { db } = await import('/src/firebase.js');
              const { doc, getDoc } = await import('firebase/firestore');
              const snap = await getDoc(doc(db, 'platform_metadata', 'tenants'));
              cloudFetchResult = snap.exists() ? snap.data() : 'not_exists';
            } catch (err) {
              cloudFetchError = err.message;
            }

            return {
              localTenants: raw ? JSON.parse(raw) : null,
              currentUser: currentUser ? JSON.parse(currentUser) : null,
              cloudFetchResult: cloudFetchResult ? { count: cloudFetchResult.tenants?.length, hasNglaa: cloudFetchResult.tenants?.some(t => t.id === 'comp_nglaa') } : null,
              cloudFetchError
            };
          } catch (e) {
            return { error: e.message };
          }
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    }
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id === 1) {
    console.log('Browser result:\n', JSON.stringify(msg.result?.result?.value, null, 2));
    process.exit(0);
  }
};
