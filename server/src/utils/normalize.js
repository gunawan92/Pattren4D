const MONTHS_ID = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  aug: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  oct: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
  dec: 11,
}

const DAY_NAMES_ID = {
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

function pickValue(source, keys) {
  if (!source || typeof source !== 'object') {
    return ''
  }

  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }

  return ''
}

function extractRows(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!payload || typeof payload !== 'object') {
    return []
  }

  const candidates = [
    payload.data,
    payload.result,
    payload.results,
    payload.history,
    payload.histories,
    payload.rows,
    payload.list,
    payload.items,
    payload.aaData,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      return value
    }
  }

  return []
}

function parseDateText(value) {
  if (!value) {
    return null
  }

  const text = String(value).trim()

  const isoLike = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoLike) {
    return new Date(
      Number(isoLike[1]),
      Number(isoLike[2]) - 1,
      Number(isoLike[3]),
    )
  }

  const localLike = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i)
  if (localLike) {
    const month = MONTHS_ID[localLike[2].toLowerCase()]
    if (month !== undefined) {
      return new Date(Number(localLike[3]), month, Number(localLike[1]))
    }
  }

  const slashLike = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (slashLike) {
    return new Date(
      Number(slashLike[3]),
      Number(slashLike[2]) - 1,
      Number(slashLike[1]),
    )
  }

  const direct = new Date(text)

  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  return null
}

function firstResult4d(value) {
  const text = String(value || '').trim()
  const match = text.match(/\d{4}/)
  return match ? match[0] : text
}

function normalizeDayName(value) {
  const text = String(value || '').trim()

  if (!text) {
    return ''
  }

  return DAY_NAMES_ID[text.toLowerCase()] || text
}

function normalizeArrayRow(row) {
  return {
    drawDateText: String(row[0] ?? '').trim(),
    dayName: normalizeDayName(row[1]),
    eventName: String(row[2] ?? '').trim(),
    drawNumber: String(row[3] ?? '').trim(),
    result4d: firstResult4d(row[4] ?? row[3] ?? ''),
  }
}

function normalizeObjectRow(row) {
  const drawDateText = pickValue(row, [
    'drawDateText',
    'draw_date_text',
    'dateText',
    'date',
    'drawDate',
    'draw_date',
    'tanggal',
    'periodeDate',
  ])
  const drawNumber = pickValue(row, [
    'drawNumber',
    'draw_number',
    'drawNo',
    'draw_no',
    'drawId',
    'draw_id',
    'number',
    'no',
    'period',
    'periode',
    'draw',
    'id',
  ])
  const result4d = pickValue(row, [
    'result4d',
    'drawResult',
    'draw_result',
    'result',
    'resultNumber',
    'result_number',
    'winningNumber',
    'winning_number',
    'angka',
    'nomor',
  ])

  return {
    drawDateText,
    dayName: normalizeDayName(
      pickValue(row, ['dayName', 'day_name', 'drawDay', 'draw_day', 'day', 'hari']),
    ),
    eventName: pickValue(row, ['eventName', 'event_name', 'event', 'market', 'name'])
      || 'Logic Pattren',
    drawNumber: drawNumber || result4d,
    result4d: firstResult4d(result4d || drawNumber),
  }
}

export function normalizeDrawResults(payload, { session, sourceUrl }) {
  return extractRows(payload)
    .map((row) => {
      const normalized = Array.isArray(row)
        ? normalizeArrayRow(row)
        : normalizeObjectRow(row)
      const drawDate = parseDateText(normalized.drawDateText)

      return {
        market: 'nex4d',
        session,
        drawDate,
        drawDateText: normalized.drawDateText,
        dayName: normalized.dayName,
        eventName: normalized.eventName,
        drawNumber: normalized.drawNumber,
        result4d: normalized.result4d,
        sourceUrl,
        raw: row,
      }
    })
    .filter((row) => row.drawDateText && row.drawNumber)
}
