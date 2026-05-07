import { useState } from 'react'

const MOODS = ['😐', '🙂', '😄', '😴', '😤', '😢', '🤒', '🔥']

export default function NoteModal({ onSave, onSkip }) {
  const [mood, setMood] = useState(null)
  const [note, setNote] = useState('')

  function handleSave() {
    onSave({ mood, note: note.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in"
      style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={onSkip} className="text-white/40 text-sm active:text-white/70">
          Passer
        </button>
        <p className="text-white/60 text-xs tracking-widest uppercase">Journal</p>
        <button
          onClick={handleSave}
          className="text-white text-sm font-medium active:text-white/70"
        >
          Enregistrer
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 gap-8">
        {/* Mood picker */}
        <div className="flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Comment tu te sens ?</p>
          <div className="flex gap-3 flex-wrap">
            {MOODS.map(m => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? null : m)}
                className={`text-3xl w-14 h-14 rounded-2xl flex items-center justify-center transition-all
                  ${mood === m
                    ? 'bg-white/15 scale-110 ring-1 ring-white/30'
                    : 'bg-white/5 active:bg-white/10'
                  }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Note du jour</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Quelque chose à retenir aujourd'hui…"
            maxLength={200}
            rows={4}
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm
              placeholder:text-white/20 resize-none outline-none focus:border-white/25 transition-colors"
          />
          <p className="text-white/20 text-xs text-right">{note.length}/200</p>
        </div>
      </div>
    </div>
  )
}
