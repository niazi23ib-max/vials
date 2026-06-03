// Vial service worker — handles push notifications + clicks.
// (No offline caching yet; installability comes from the manifest.)

self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Vial', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Vial';
  // Action buttons on single-dose reminders (Android/desktop show these; iOS
  // ignores them but the body tap still deep-links to logging the dose).
  const actions =
    data.kind === 'dose'
      ? [
          { action: 'taken', title: '✓ Taken' },
          { action: 'snooze', title: 'Snooze 30m' },
        ]
      : [];
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [80, 40, 80],
    tag: data.tag || 'vial-dose',
    renotify: true,
    actions,
    data: {
      url: data.url || '/',
      sub: data.sub || '',
      date: data.date || '',
      slot: data.slot || '',
      kind: data.kind || '',
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

async function openApp(target) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of list) {
    if ('focus' in client) {
      client.navigate(target);
      return client.focus();
    }
  }
  return self.clients.openWindow(target);
}

// Act on the dose in the background via the authenticated endpoint. The fetch
// carries the user's session cookies (credentials:'include'). If it can't act
// (e.g. the session expired), fall back to opening the app to do it manually.
async function actOnDose(action, d) {
  try {
    const res = await fetch('/api/dose-action', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sub: d.sub, date: d.date, slot: d.slot || '' }),
    });
    if (!res.ok) throw new Error('http ' + res.status);
  } catch {
    await openApp(d.url || '/');
  }
}

self.addEventListener('notificationclick', function (event) {
  const d = (event.notification && event.notification.data) || {};
  const action = event.action;
  event.notification.close();
  if (action === 'taken' || action === 'snooze') {
    event.waitUntil(actOnDose(action, d));
    return;
  }
  // Body tap (or unsupported actions on iOS) → open the app, deep-linked to the
  // dose so it's one tap to log.
  event.waitUntil(openApp(d.url || '/'));
});

// Network-first for page navigations so a reopened (installed) PWA always loads
// the latest build instead of a cached app shell.
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cached = await caches.match(req);
          return cached || Response.error();
        }
      })(),
    );
  }
});

// Activate immediately on update.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
