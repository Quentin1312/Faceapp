import { useState, useEffect } from 'react'
import { requestPermission, getPermission, sendTestNotif, schedulePageTimer } from '../lib/notifications'
import { getAllPhotos } from '../lib/db'

export default function Settings() {
  const [permission, setPermission] = useState(getPermission())
  const [stats, setStats] = useState({ total: 0, firstDate: null })
  const [tested, setTested] = useState(false)

  useEffect(() => {
    getAllPhotos().then(photos => {
      if (photos.length === 0) return
      const sorted = [...photos].sort((a, b) => a.date - b.date)
      setStats({ total: photos.length, firstDate: new Date(sorted[0].date) })
    })
  }, [])

  async function handleRequestPermission() {
    const result = await requestPermission()
    setPermission(result)
    if (result === 'granted') schedulePageTimer(false)
  }

  async function handleTest() {
    await sendTestNotif()
    setTested(true)
    setTimeout(() => setTested(false), 3000)
  }

  const permLabel = {
    granted: { text: 'Activées ✓', color: 'text-green-400' },
    denied: { text: 'Refusées', color: 'text-red-400' },
    default: { text: 'Non configurées', color: 'text-white/50' },
    unsupported: { text: 'Non supportées', color: 'text-white/30' },
  }[permission] || { text: '…', color: 'text-white/40' }

  const schedule = [
    { time: '10h00', label: 'Rappel du matin', desc: 'si pas de photo', emoji: '☀️' },
    { time: '16h00', label: 'Rappel de l\'aprèm', desc: 'si toujours pas', emoji: '😤' },
    { time: '22h00', label: 'Dernier appel', desc: 'si toujours pas', emoji: '🚨' },
  ]

  return (
    <div className="px-6 pt-8 pb-24 flex flex-col gap-8">
      <h2 className="text-white font-semibold text-lg">Paramètres</h2>

      {/* Notifications section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-xs uppercase tracking-widest">Rappels quotidiens</p>
          <p className={`text-xs ${permLabel.color}`}>{permLabel.text}</p>
        </div>

        <div className="bg-surface rounded-2xl overflow-hidden border border-border">
          {schedule.map((s, i) => (
            <div key={s.time}>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-base">{s.emoji}</span>
                  <div>
                    <p className="text-white text-sm">{s.label}</p>
                    <p className="text-white/35 text-[11px] mt-0.5">{s.desc}</p>
                  </div>
                </div>
                <p className="text-white/50 text-sm tabular-nums">{s.time}</p>
              </div>
              {i < schedule.length - 1 && <div className="h-px bg-border" />}
            </div>
          ))}
        </div>

        {permission === 'granted' && (
          <button
            onClick={handleTest}
            className="w-full py-3.5 rounded-2xl border border-white/15 text-white/70 text-sm active:bg-white/5 transition-colors"
          >
            {tested ? '✓ Envoyée !' : '📲 Tester maintenant'}
          </button>
        )}

        {permission !== 'granted' && permission !== 'unsupported' && (
          <button
            onClick={handleRequestPermission}
            className="w-full py-3.5 rounded-2xl bg-white text-black font-medium text-sm active:bg-white/80 transition-colors"
          >
            Activer les notifications
          </button>
        )}

        {permission !== 'granted' && (
          <p className="text-white/30 text-xs text-center px-4">
            iOS : installe l'app sur l'écran d'accueil via Safari pour recevoir des notifications.
          </p>
        )}
      </section>

      {/* Stats section */}
      <section className="flex flex-col gap-4">
        <p className="text-white/40 text-xs uppercase tracking-widest">Statistiques</p>
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <Row label="Photos capturées" value={stats.total} />
          <div className="h-px bg-border" />
          <Row label="Première capture" value={stats.firstDate ? stats.firstDate.toLocaleDateString('fr-FR') : '—'} />
          <div className="h-px bg-border" />
          <Row label="Stockage" value="Local (IndexedDB)" sub />
        </div>
      </section>

      {/* Info section */}
      <section className="flex flex-col gap-4">
        <p className="text-white/40 text-xs uppercase tracking-widest">À propos</p>
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <Row label="Application" value="Face Daily" />
          <div className="h-px bg-border" />
          <Row label="Version" value="1.0.0" />
          <div className="h-px bg-border" />
          <Row label="Données" value="100% local, aucun serveur" sub />
        </div>
      </section>
    </div>
  )
}

function Row({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <p className="text-white text-sm">{label}</p>
      <p className={`text-sm text-right ${sub ? 'text-white/40' : 'text-white/70'}`}>{value}</p>
    </div>
  )
}
