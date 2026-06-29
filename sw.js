const CACHE = 'timer-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg', './sw.js'];

// Install: 핵심 파일 미리 캐싱 ('./' 추가 — 디렉터리 주소로 열어도 매칭됨)
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: 구 버전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // 페이지(내비게이션) 요청: 캐시된 index.html을 즉시 반환(빠름 + 오프라인 대응),
  // 동시에 백그라운드에서 네트워크로 갱신(stale-while-revalidate).
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(cached => {
        const network = fetch(e.request)
          .then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', clone));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // 그 외 정적 자원: 캐시 우선, 없으면 네트워크 → 캐시에 저장
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached ||
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => cached)
    )
  );
});
