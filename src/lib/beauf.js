export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const FACE_DETECTED = [
  'Ah te v\'là toi !',
  'La belle tête !',
  'On te voit champion !',
  'Bonjour la beauté !',
  'T\'es là, c\'est l\'essentiel.',
  'Tête connue !',
  'Voilà le beau gosse.',
]

export const CAPTURE_BTN = [
  'Appuie si t\'oses',
  'T\'es prêt chef ?',
  'Allez, souris un peu !',
  'On y va champion ?',
  'C\'est l\'heure de vérité',
  'Maintenant ou jamais',
]

export const VERDICTS = [
  'Sacré gueule quand même...',
  'T\'as bu combien de Ricards ?',
  'La classe absolue.',
  'Un vrai beau gosse.',
  'La photo de l\'année !',
  'On a vu pire, on a vu mieux.',
  'La belle gueule !',
  'Magnifique champion.',
  'Tu vieilles bien dis donc !',
  'Belle gueule de dimanche !',
  'Médaille d\'or de la beauté.',
  'Dieu existe, la preuve.',
  'Même le Ricard ne peut rien contre toi.',
]

export const ALIGNING = [
  'On te remet la tête droite...',
  'T\'as encore bougé...',
  'On corrige les dégâts...',
  'Tiens-toi droit la prochaine fois...',
  'Recadrage en cours...',
]

export const NOTE_PLACEHOLDERS = [
  'T\'as fait quoi de beau aujourd\'hui ?',
  'Un truc à retenir de cette journée ?',
  'Journée de ouf ou journée tranquille ?',
  'Les news importantes du jour...',
  'Ce que ton futur toi doit savoir...',
  'Combien de Ricards aujourd\'hui ?',
  'Le meilleur moment du jour ?',
]

export const MOOD_QUESTION = [
  'Comment tu te sens là ?',
  'Ça va champion ?',
  'T\'as l\'air comment aujourd\'hui ?',
  'État du jour ?',
]

export function streakLabel(n) {
  if (n <= 1) return 'C\'est un début !'
  if (n < 4)  return 'Tu tiens le rythme !'
  if (n < 7)  return 'Bien parti champion !'
  if (n < 14) return 'La régularité du champion !'
  if (n < 30) return 'Deux semaines de beauté !'
  if (n < 60) return 'Un mois de gueule !'
  if (n < 100) return 'T\'es un phénomène !'
  return '🏆 Légende vivante'
}

export function ricardScore(streak) {
  if (streak > 0 && streak % 10 === 0) return streak / 10
  return null
}

export function annualVerdict(pct) {
  if (pct >= 100) return '🏆 Parfait. T\'es une légende.'
  if (pct >= 80)  return '🔥 Quasi parfait, respect champion !'
  if (pct >= 60)  return '💪 Bien parti, continue comme ça !'
  if (pct >= 40)  return '😐 Dans la moyenne du beauf...'
  if (pct >= 20)  return '😴 Peut mieux faire chef...'
  if (pct >= 5)   return '🥃 T\'as dû boire trop de Ricards'
  return '💀 Flemme absolue. Honte à toi.'
}

// 10h — rappel du matin, ton doux
export const NOTIF_10H_TITLES = [
  '☀️ Bonjour la beauté !',
  '📸 Le beau gosse est réveillé ?',
  '🌅 Y\'a une photo qui t\'attend...',
  '☀️ Debout champion !',
]
export const NOTIF_10H_BODIES = [
  'Ta belle gueule du matin se fait attendre.',
  'Même le café peut attendre, pas la photo.',
  'T\'as toute la journée... ou pas.',
  'Allez, une petite photo et après t\'es tranquille.',
  'Mémé a déjà pris la sienne. Rattrape-toi.',
]

// 16h — rappel de l'aprèm, ton insistant
export const NOTIF_16H_TITLES = [
  '😤 Toujours pas ?!',
  '⏰ Il est 16h champion...',
  '🥃 On attend encore...',
  '📸 Sérieux là ?!',
]
export const NOTIF_16H_BODIES = [
  'Ta belle gueule se dégrade à chaque heure qui passe.',
  'C\'est pas sorcier, t\'appuies sur un bouton !',
  'Le Ricard a bon dos, mais t\'as encore le temps.',
  'On va pas y passer la nuit quand même...',
  'T\'as raté le matin, rate pas l\'aprèm aussi.',
]

// 22h — dernier appel, ton désespéré
export const NOTIF_22H_TITLES = [
  '🚨 Dernier appel !',
  '💀 Minuit approche...',
  '😱 La série est en danger !',
  '🌙 Dernière chance beauté !',
]
export const NOTIF_22H_BODIES = [
  'T\'as encore 2h avant de perdre ta série. Bouge-toi.',
  'La photo ou la mort de la série. T\'as le choix.',
  'Demain tu regretteras. Ce soir t\'as encore le temps.',
  'Même en pyjama. Même avec la tête défaite. On s\'en fout.',
  'C\'est maintenant ou jamais. Et jamais c\'est une honte.',
]
