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
    <div className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-[72px]" style={{ height: '100%' }}>
        {tab === 'camera' && <Camera onCaptureDone={handleCaptureDone} key={refreshKey} />}
        {tab === 'timeline' && <Timeline refreshKey={refreshKey} />}
        {tab === 'calendar' && <Calendar refreshKey={refreshKey} />}
        {tab === 'video' && <VideoReview />}
        {tab === 'settings' && <Settings />}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
