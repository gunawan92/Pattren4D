const MISTIK_LAMA = {
  0: '1',
  1: '0',
  2: '5',
  5: '2',
  3: '8',
  8: '3',
  4: '7',
  7: '4',
  6: '9',
  9: '6',
}

const MISTIK_BARU = {
  0: '8',
  8: '0',
  1: '7',
  7: '1',
  2: '6',
  6: '2',
  3: '9',
  9: '3',
  4: '5',
  5: '4',
}

function transform(number, map) {
  return String(number)
    .split('')
    .map((digit) => map[digit] ?? digit)
    .join('')
}

export function getMistik(number) {
  const original = String(number).trim()

  if (!/^\d+$/.test(original)) {
    const error = new Error('number must contain digits only')
    error.statusCode = 400
    throw error
  }

  return {
    original,
    mistikLama: transform(original, MISTIK_LAMA),
    mistikBaru: transform(original, MISTIK_BARU),
  }
}
