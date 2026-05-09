import { useState, useEffect } from 'react'
import Camera from './components/Camera'
import Timeline from './components/Timeline'
import Calendar from './components/Calendar'
import VideoReview from './components/VideoReview'
import Settings from './components/Settings'
import BottomNav from './components/BottomNav'
import { checkAndNotify, schedulePageTimer } from './lib/notifications'
import { getTodayPhoto } from './lib/db'

export default function App() {
  const [tab, setTab] = useState('camera')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function init() {
      const p = await getTodayPhoto()
      const hasPic = !!p
      checkAndNotify(hasPic)
      schedulePageTimer(hasPic)
    }
    init()

    function onVisible() {
      if (document.visibilityState === 'visible') {
        getTodayPhoto().then(p => checkAndNotify(!!p))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  function handleCaptureDone() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div
      className="bg-black text-white flex flex-col overflow-hidden"
      style={{ position: 'fixed', inset: 0, paddingTop: 'var(--sat)' }}
    >
      {/* min-h-0 est obligatoire pour que flex-1 ne déborde pas sur iOS */}
      <main className="flex-1 overflow-y-auto min-h-0 overscroll-none">
        {tab === 'camera'    && <Camera onCaptureDone={handleCaptureDone} key={refreshKey} />}
        {tab === 'timeline'  && <Timeline refreshKey={refreshKey} />}
        {tab === 'calendar'  && <Calendar refreshKey={refreshKey} />}
        {tab === 'video'     && <VideoReview />}
        {tab === 'settings'  && <Settings />}
      </main>

      {/* Nav toujours au-dessus du contenu caméra */}
      <div className="relative z-50">
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </div>
  )
}
