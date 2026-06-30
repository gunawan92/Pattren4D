export function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function displayDate(value, fallback = '-') {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const DAY_NAMES = {
  sunday: 'Minggu',
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  minggu: 'Minggu',
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
}

export function displayDayName(value, fallback = '-') {
  if (!value) {
    return fallback
  }

  const key = String(value).trim().toLowerCase()
  return DAY_NAMES[key] || String(value)
}

export function displaySession(value) {
  return value === 'night' ? 'Malam' : 'Siang'
}

export function asArray(value) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

export function digitList(value) {
  return String(value || '').replace(/\D/g, '').split('')
}

export function booleanLabel(value) {
  return value ? 'HIT' : 'MISS'
}
