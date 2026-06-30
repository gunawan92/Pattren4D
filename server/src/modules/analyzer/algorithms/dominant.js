import { getDayDominantDigits } from './day-v1.js'
import { getNightDominantDigits } from './night-v1.js'

export function getDominantDigits(session, dayName) {
  if (session === 'day') {
    return getDayDominantDigits(dayName)
  }

  if (session === 'night') {
    return getNightDominantDigits(dayName)
  }

  return []
}
