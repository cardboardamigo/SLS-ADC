const CACHE_NAME = "census-tracker-v1";

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event - required for PWA install prompt to fire
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

// Push notification event
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "Census Tracker",
    body: "Don't forget to enter today's census data!",
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/CT_App_Icon.png",
      badge: "/CT_App_Icon.png",
      tag: "census-reminder",
      renotify: true,
      actions: [
        { action: "open", title: "Open App" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "open" || !event.action) {
    event.waitUntil(clients.openWindow("/dashboard"));
  }
});
