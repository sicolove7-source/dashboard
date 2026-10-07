async function main() {
  const res = await fetch('https://tashteebpro.com/login?_=' + Date.now(), {
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
  });
  const html = await res.text();
  const matches = html.match(/src="\/assets\/[^"]+"/g);
  console.log('Status:', res.status);
  console.log('Live Assets:', matches);
}
main();
