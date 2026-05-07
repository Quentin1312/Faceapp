import { openDB } from 'idb'

const DB_NAME = 'face-daily'
const DB_VERSION = 1
const STORE = 'photos'

let _db = null

async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('date', 'date')
      }
    },
  })
  return _db
}

export function toDateId(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function savePhoto(imageBlob, faceCoordinates = null) {
  const db = await getDB()
  const now = new Date()
  const record = {
    id: toDateId(now),
    date: now.getTime(),
    imageBlob,
    faceCoordinates,
    mood: null,
    note: '',
    eyePositions: null,
  }
  await db.put(STORE, record)
  return record
}

// Merge fields into existing record (used for note/mood/alignment updates)
export async function updatePhoto(dateId, fields) {
  const db = await getDB()
  const existing = await db.get(STORE, dateId)
  if (!existing) return null
  const updated = { ...existing, ...fields }
  await db.put(STORE, updated)
  return updated
}

export async function getPhotoByDate(date) {
  const db = await getDB()
  return db.get(STORE, toDateId(date))
}

export async function getTodayPhoto() {
  return getPhotoByDate(new Date())
}

export async function getAllPhotos() {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all.sort((a, b) => b.date - a.date)
}

export async function getPhotosForMonth(year, month) {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all
    .filter(p => {
      const d = new Date(p.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .sort((a, b) => a.date - b.date)
}

export async function getPhotosForYear(year) {
  const db = await getDB()
  const all = await db.getAll(STORE)
  return all
    .filter(p => new Date(p.date).getFullYear() === year)
    .sort((a, b) => a.date - b.date)
}

export async function getStreak() {
  const db = await getDB()
  const all = await db.getAll(STORE)
  if (all.length === 0) return 0

  const sorted = all.sort((a, b) => b.date - a.date)
  const todayId = toDateId(new Date())
  const yesterdayId = toDateId(new Date(Date.now() - 86400000))

  if (sorted[0].id !== todayId && sorted[0].id !== yesterdayId) return 0

  let streak = 0
  let cursor = new Date(sorted[0].date)
  cursor.setHours(12, 0, 0, 0)

  for (const photo of sorted) {
    if (photo.id === toDateId(cursor)) {
      streak++
      cursor = new Date(cursor.getTime() - 86400000)
    } else {
      break
    }
  }
  return streak
}

export async function deletePhoto(dateId) {
  const db = await getDB()
  await db.delete(STORE, dateId)
}
