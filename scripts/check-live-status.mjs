async function main() {
  const urls = [
    'https://tashteebpro.com/',
    'https://tashteebpro.com/tenants',
    'https://tashteeb-67d13.web.app/tenants'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url + '?_=' + Date.now(), {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      console.log('=== URL:', url, '===');
      console.log('Status:', res.status);
      console.log('Server:', res.headers.get('server'));
      console.log('x-vercel-id:', res.headers.get('x-vercel-id'));
      const text = await res.text();
      const match = text.match(/src="\/assets\/index-[^"]+"/g);
      console.log('Asset matches:', match);
      console.log('-----------------------------------');
    } catch (e) {
      console.error('Error for', url, e.message);
    }
  }
}
main();
