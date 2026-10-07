async function check() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('https://alofok2948.tashteebpro.com/?_=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const text = await res.text();
      const match = text.match(/src="\/assets\/[^"]+"/g);
      console.log(`[Attempt ${i + 1}] Live asset on alofok2948.tashteebpro.com:`, match ? match[0] : 'none');
      if (match && !match[0].includes('CjiiPVVN')) {
        console.log('🎉 NEW VERCEL DEPLOYMENT IS LIVE!');
        return;
      }
    } catch (e) {
      console.error(e.message);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
}
check();
