async function check() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('https://tashteebpro.com/?_=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      const text = await res.text();
      const matches = text.match(/assets\/index-[^"]+\.js/g);
      const asset = matches ? matches[0] : 'none';
      console.log(`[Attempt ${i + 1}] Live index.js on tashteebpro.com:`, asset);
      if (asset.includes('CoI5KDIN') || (asset !== 'none' && !asset.includes('C-2-2q9s') && !asset.includes('CjiiPVVN'))) {
        console.log('🎉 NEW DEPLOYMENT IS LIVE ON TASHTEEBPRO.COM!');
        return;
      }
    } catch (e) {
      console.error(e.message);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
}
check();
