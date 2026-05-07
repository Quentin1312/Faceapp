import { useState } from 'react'
import { pick, NOTE_PLACEHOLDERS, MOOD_QUESTION } from '../lib/beauf'

const MOODS = [
  { emoji: '😐', label: 'Bof' },
  { emoji: '🙂', label: 'Bien' },
  { emoji: '😄', label: 'Super' },
  { emoji: '😴', label: 'Crevé' },
  { emoji: '😤', label: 'Énervé' },
  { emoji: '😢', label: 'Pas top' },
  { emoji: '🤒', label: 'Malade' },
  { emoji: '🥃', label: 'Ricard' },
]

export default function NoteModal({ onSave, onSkip }) {
  const [mood, setMood] = useState(null)
  const [note, setNote] = useState('')
  const [placeholder] = useState(() => pick(NOTE_PLACEHOLDERS))
  const [moodQuestion] = useState(() => pick(MOOD_QUESTION))

  function handleSave() {
    onSave({ mood: mood?.emoji ?? null, note: note.trim() })
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
          <p className="text-white/40 text-xs uppercase tracking-widest">{moodQuestion}</p>
          <div className="flex gap-2.5 flex-wrap">
            {MOODS.map(m => (
              <button
                key={m.emoji}
                onClick={() => setMood(mood?.emoji === m.emoji ? null : m)}
                className={`flex flex-col items-center gap-1 w-14 py-2 rounded-2xl transition-all
                  ${mood?.emoji === m.emoji
                    ? 'bg-white/15 scale-110 ring-1 ring-white/30'
                    : 'bg-white/5 active:bg-white/10'
                  }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-white/40 text-[9px]">{m.label}</span>
              </button>
            ))}
          </div>
          {mood?.emoji === '🥃' && (
            <p className="text-amber-400/60 text-xs">Combien exactement ? 😏</p>
          )}
        </div>

        {/* Note */}
        <div className="flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-widest">Note du jour</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={placeholder}
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
