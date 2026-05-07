import { pick, NOTIF_10H_TITLES, NOTIF_10H_BODIES, NOTIF_16H_TITLES, NOTIF_16H_BODIES, NOTIF_22H_TITLES, NOTIF_22H_BODIES } from './beauf'

const KEY_10H = 'facedaily-notif-10h'
const KEY_16H = 'facedaily-notif-16h'
const KEY_22H = 'facedaily-notif-22h'

let _timer10h = null
let _timer16h = null
let _timer22h = null

function todayId() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

async function fire(title, body) {
  const reg = await navigator.serviceWorker?.ready.catch(() => null)
  if (reg) {
    reg.showNotification(title, {
      body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'daily-reminder',
      renotify: true,
    })
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/pwa-192.png' })
  }
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function getPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function sendTestNotif() {
  if (Notification.permission !== 'granted') return
  await fire(pick(NOTIF_10H_TITLES), pick(NOTIF_10H_BODIES))
}

// Appelé au chargement et sur visibilitychange
export async function checkAndNotify(todayPhotoExists) {
  if (Notification.permission !== 'granted') return
  const now = new Date()
  const h = now.getHours()
  const tid = todayId()

  if (h >= 10 && !todayPhotoExists && localStorage.getItem(KEY_10H) !== tid) {
    localStorage.setItem(KEY_10H, tid)
    await fire(pick(NOTIF_10H_TITLES), pick(NOTIF_10H_BODIES))
    return
  }
  if (h >= 16 && !todayPhotoExists && localStorage.getItem(KEY_16H) !== tid) {
    localStorage.setItem(KEY_16H, tid)
    await fire(pick(NOTIF_16H_TITLES), pick(NOTIF_16H_BODIES))
    return
  }
  if (h >= 22 && !todayPhotoExists && localStorage.getItem(KEY_22H) !== tid) {
    localStorage.setItem(KEY_22H, tid)
    await fire(pick(NOTIF_22H_TITLES), pick(NOTIF_22H_BODIES))
  }
}

// Planifie les timers en-page pour les 3 créneaux
export function schedulePageTimer(todayPhotoExists) {
  if (_timer10h) clearTimeout(_timer10h)
  if (_timer16h) clearTimeout(_timer16h)
  if (_timer22h) clearTimeout(_timer22h)
  if (Notification.permission !== 'granted' || todayPhotoExists) return

  const now = new Date()
  const tid = todayId()

  function msUntil(h, m = 0) {
    const t = new Date()
    t.setHours(h, m, 0, 0)
    if (t <= now) t.setDate(t.getDate() + 1)
    return t - now
  }

  if (localStorage.getItem(KEY_10H) !== tid) {
    _timer10h = setTimeout(async () => {
      if (localStorage.getItem(KEY_10H) !== todayId()) {
        localStorage.setItem(KEY_10H, todayId())
        await fire(pick(NOTIF_10H_TITLES), pick(NOTIF_10H_BODIES))
      }
    }, msUntil(10))
  }

  if (localStorage.getItem(KEY_16H) !== tid) {
    _timer16h = setTimeout(async () => {
      if (localStorage.getItem(KEY_16H) !== todayId()) {
        localStorage.setItem(KEY_16H, todayId())
        await fire(pick(NOTIF_16H_TITLES), pick(NOTIF_16H_BODIES))
      }
    }, msUntil(16))
  }

  if (localStorage.getItem(KEY_22H) !== tid) {
    _timer22h = setTimeout(async () => {
      if (localStorage.getItem(KEY_22H) !== todayId()) {
        localStorage.setItem(KEY_22H, todayId())
        await fire(pick(NOTIF_22H_TITLES), pick(NOTIF_22H_BODIES))
      }
    }, msUntil(22))
  }
}
