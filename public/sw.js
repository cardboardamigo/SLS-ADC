const CACHE_NAME = "census-tracker-v1";

// Install event
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
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
      icon: "/icon-192.png",
      badge: "/icon-192.png",
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
