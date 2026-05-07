import { useState, useEffect } from 'react'
import Camera from './components/Camera'
import Timeline from './components/Timeline'
import Calendar from './components/Calendar'
import VideoReview from './components/VideoReview'
import Settings from './components/Settings'
import BottomNav from './components/BottomNav'
import { checkAndNotify } from './lib/notifications'
import { getTodayPhoto } from './lib/db'

export default function App() {
  const [tab, setTab] = useState('camera')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    getTodayPhoto().then(p => checkAndNotify(!!p))
  }, [])

  function handleCaptureDone() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div
      className="bg-black text-white flex flex-col overflow-hidden"
      style={{
        height: '100%',
        paddingTop: 'var(--sat)',
      }}
    >
      {/* min-h-0 est obligatoire pour que flex-1 ne déborde pas sur iOS */}
      <main className="flex-1 overflow-y-auto min-h-0">
        {tab === 'camera'    && <Camera onCaptureDone={handleCaptureDone} key={refreshKey} />}
        {tab === 'timeline'  && <Timeline refreshKey={refreshKey} />}
        {tab === 'calendar'  && <Calendar refreshKey={refreshKey} />}
        {tab === 'video'     && <VideoReview />}
        {tab === 'settings'  && <Settings />}
      </main>

      {/* Nav dans le flux flex — ne flotte plus, ne remonte plus */}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
