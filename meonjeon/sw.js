/* 알림을 받는 작은 일꾼.
   앱이 닫혀 있어도 이 파일은 브라우저 안에 남아서 알림을 받습니다.
   ⚠ 여기에는 개인정보를 저장하지 않습니다. 받은 알림을 띄우고 끝입니다. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "손주한통", body: "오늘 챙길 일이 있어요" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      /* 같은 태그면 덮어씁니다 — 부모 알림은 하루 하나면 됩니다.
         어른께 가는 통은 통마다 꼬리표가 달라서 12:10 것과 15:30 것이 따로 남습니다. */
      tag: data.tag || "meonjeon-daily",
      renotify: !!data.tag,
      data: { url: data.url || "/" },
    })
  );
});

/* 알림을 누르면 이미 열려 있는 창으로 갑니다. 없으면 새로 엽니다 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(self.location.origin)) return c.focus();
    }
    return self.clients.openWindow(url);
  })());
});

/* ── 옛 화면을 붙들지 않게 ──────────────────────────
   이 일꾼은 아무것도 저장하지 않습니다. 그런데 홈 화면에 담은 앱은
   브라우저가 아니라 iOS가 들고 있어서, 한 번 받은 화면을 며칠씩 붙들 때가 있습니다.
   그래서 화면(HTML)과 version.json만은 이 일꾼이 가로채서
   iOS 창고를 건너뛰고 늘 새로 받아옵니다.
   못 받아오면(비행기 안 같은 때) 원래대로 돌려보냅니다 — 안 열리는 것보다는 낫습니다. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const fresh = req.mode === "navigate" || req.destination === "document" || req.url.includes("/version.json");
  if (!fresh) return;
  event.respondWith(
    fetch(req.url, { cache: "reload", credentials: "same-origin" }).catch(() => fetch(req))
  );
});
