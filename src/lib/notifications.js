import { pick, NOTIF_TITLES, NOTIF_BODIES } from './beauf'

const STORAGE_KEY = 'facedaily-notif-time'
const LAST_NOTIF_KEY = 'facedaily-notif-last'

let _pageTimer = null

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

async function fireNotif() {
  const title = pick(NOTIF_TITLES)
  const body = pick(NOTIF_BODIES)
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

// Envoi immédiat pour tester
export async function sendTestNotif() {
  if (Notification.permission !== 'granted') return
  await fireNotif()
}

// Appelé au chargement et sur visibilitychange
export async function checkAndNotify(todayPhotoExists) {
  if (Notification.permission !== 'granted') return
  if (todayPhotoExists) return

  const [hh, mm] = getNotifTime().split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hh, mm, 0, 0)

  if (now < target) return

  const lastNotif = localStorage.getItem(LAST_NOTIF_KEY)
  const todayId = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
  if (lastNotif === todayId) return

  localStorage.setItem(LAST_NOTIF_KEY, todayId)
  await fireNotif()
}

// Timer en-page : se déclenche même si l'app est ouverte en arrière-plan
export function schedulePageTimer(todayPhotoExists) {
  if (_pageTimer) clearTimeout(_pageTimer)
  if (Notification.permission !== 'granted' || todayPhotoExists) return

  const [hh, mm] = getNotifTime().split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hh, mm, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)

  const ms = target.getTime() - now.getTime()
  _pageTimer = setTimeout(async () => {
    const lastNotif = localStorage.getItem(LAST_NOTIF_KEY)
    const t = new Date()
    const todayId = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
    if (lastNotif !== todayId) {
      localStorage.setItem(LAST_NOTIF_KEY, todayId)
      await fireNotif()
    }
  }, ms)
}
