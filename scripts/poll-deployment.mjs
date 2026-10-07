async function check() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('https://amlak.tashteebpro.com/?_=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const text = await res.text();
      const matches = text.match(/assets\/index-[^"]+\.js/g);
      const asset = matches ? matches[0] : 'unknown';
      console.log(`[Attempt ${i + 1}] Live asset on amlak.tashteebpro.com:`, asset);
      if (asset.includes('COhk7Vkj')) {
        console.log('🎉 NEW VERCEL DEPLOYMENT IS FULLY LIVE!');
        return;
      }
    } catch (e) {
      console.error(e.message);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
}
check();
