// 한 번 연 화면 파일을 저장해 두고, 다음부터 빨리 열거나 인터넷이 없을 때 써요.
// 시트 데이터는 data.js가 따로 저장하니까 여기서는 사이트 파일만 다뤄요.
const CACHE = 'soopbyeol-v175';
const SHELL = ['./', 'index.html', 'style.css?v=162', 'config.js?v=162', 'data.js?v=162', 'app.js?v=162', 'lib/fuse.min.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 같은 사이트 파일: 새 버전을 먼저 받아보고, 안 되면 저장해 둔 걸 써요.
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== location.origin) return;
  ev.respondWith(
    fetch(ev.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(ev.request, copy)); }
        return res;
      })
      .catch(() => caches.match(ev.request).then(hit => hit || caches.match('index.html')))
  );
});
