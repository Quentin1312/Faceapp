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
