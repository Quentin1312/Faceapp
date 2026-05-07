const STORAGE_KEY = 'facedaily-notif-time' // "HH:MM"
const LAST_NOTIF_KEY = 'facedaily-notif-last'

export function getNotifTime() {
  return localStorage.getItem(STORAGE_KEY) || '09:00'
}

export function setNotifTime(time) {
  localStorage.setItem(STORAGE_KEY, time)
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function getPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// Call on app load — fires a notification if it's past the scheduled time and we haven't notified today
export async function checkAndNotify(todayPhotoExists) {
  if (Notification.permission !== 'granted') return
  if (todayPhotoExists) return

  const [hh, mm] = getNotifTime().split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hh, mm, 0, 0)

  if (now < target) return // not yet time

  const lastNotif = localStorage.getItem(LAST_NOTIF_KEY)
  const todayId = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  if (lastNotif === todayId) return // already notified today

  localStorage.setItem(LAST_NOTIF_KEY, todayId)

  const reg = await navigator.serviceWorker?.ready
  if (reg) {
    reg.showNotification('Face Daily 📸', {
      body: 'Heure de ta capture quotidienne !',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'daily-reminder',
      renotify: false,
    })
  } else {
    new Notification('Face Daily 📸', { body: 'Heure de ta capture quotidienne !' })
  }
}

// Returns ms until next scheduled notification
export function msUntilNextNotif() {
  const [hh, mm] = getNotifTime().split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hh, mm, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}
