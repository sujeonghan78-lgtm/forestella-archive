const urls = [
  'https://itunes.apple.com/search?term=Forestella&media=music&entity=album&limit=5',
  'https://itunes.apple.com/search?term=Forestella&media=music&entity=album&country=kr&limit=5',
  'https://itunes.apple.com/search?term=%ED%8F%AC%EB%A0%88%EC%8A%A4%ED%85%94%EB%9D%BC&media=music&entity=album&country=kr&limit=5',
  'https://itunes.apple.com/search?term=Forestella&entity=musicArtist&country=kr&limit=3',
  'https://api.deezer.com/search/album?q=Forestella',
];
for (const u of urls) {
  try { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); const t = await r.text(); console.log(`::notice::${r.status} ${u.slice(8, 70)} → ${t.trim().slice(0, 160).replace(/\n/g, ' ')}`); }
  catch (e) { console.log(`::notice::ERR ${u} ${e.message}`); }
}
