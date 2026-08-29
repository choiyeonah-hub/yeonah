/* 알림을 받는 작은 일꾼.
   앱이 닫혀 있어도 이 파일은 브라우저 안에 남아서 알림을 받습니다.
   ⚠ 여기에는 개인정보를 저장하지 않습니다. 받은 알림을 띄우고 끝입니다. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "먼저ON", body: "오늘 챙길 일이 있어요" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "meonjeon-daily",     /* 같은 태그면 덮어씁니다 — 알림이 쌓이지 않게 */
      renotify: false,
      data: { url: "/" },
    })
  );
});

/* 알림을 누르면 이미 열려 있는 창으로 갑니다. 없으면 새로 엽니다 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(self.location.origin)) return c.focus();
    }
    return self.clients.openWindow("/");
  })());
});
