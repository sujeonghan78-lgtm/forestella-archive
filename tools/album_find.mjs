// 표지 후보 보기: node tools/album_find.mjs "앨범1|앨범2" → 애플뮤직·Deezer에서 이름이 비슷한 앨범과 표지 주소를 알려줘요.
const names = (process.argv[2] || '').split('|').filter(Boolean);
const flat = t => (t || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
const get = async u => JSON.parse((await (await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()).trim());
const wait = ms => new Promise(s => setTimeout(s, ms));
const arts = (await get('https://itunes.apple.com/search?term=Forestella&entity=musicArtist&country=kr&limit=5')).results || [];
const art = arts.find(a => flat(a.artistName) === 'forestella') || arts[0];
await wait(1500);
const list = ((await get(`https://itunes.apple.com/lookup?id=${art.artistId}&entity=album&country=kr&limit=200`)).results || []).filter(x => x.wrapperType === 'collection');
for (const n of names) {
  const k = flat(n);
  for (const a of list.filter(a => flat(a.collectionName).includes(k)))
    console.log(`::notice::애플 ${n} → ${a.collectionName} (${a.releaseDate.slice(0, 10)}, ${a.trackCount}곡) ${a.artworkUrl100.replace('100x100bb', '600x600bb')}`);
  try {
    const d = (await get(`https://api.deezer.com/search/album?q=${encodeURIComponent('Forestella ' + n)}`)).data || [];
    for (const a of d.filter(a => flat(a.title).includes(k)).slice(0, 3))
      console.log(`::notice::디저 ${n} → ${a.title} (${a.nb_tracks}곡) ${a.cover_xl}`);
  } catch (e) { console.log(`::notice::디저 오류 ${n}`); }
  await wait(800);
}
