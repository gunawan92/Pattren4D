const NIGHT_DOMINANT_DIGITS = {
  senin: ['4', '5', '0', '1', '6'],
  selasa: ['6', '7', '0', '3', '5'],
  rabu: ['1', '2', '4', '6', '0'],
  kamis: ['4', '0', '2', '3', '7'],
  jumat: ['8', '7', '5', '4', '3'],
  sabtu: ['5', '3', '1', '9', '8'],
  minggu: ['2', '1', '8', '7', '0'],
}

const V1_SOURCE_RULES = {
  senin: { main: 'previousDayMistikLama', support: 'sameDayLastWeekMistikBaru' },
  selasa: { main: 'previousDayMistikBaru', support: 'sameDayLastWeekOriginal' },
  rabu: { main: 'previousDayMistikLama', support: 'sameDayLastWeekMistikBaru' },
  kamis: { main: 'previousDayMistikBaru', support: 'sameDayLastWeekMistikLama' },
  jumat: { main: 'previousDayMistikLama', support: 'sameDayLastWeekMistikLama' },
  sabtu: { main: 'previousDayOriginal', support: 'sameDayLastWeekMistikBaru' },
  minggu: { main: 'previousDayMistikLama', support: 'sameDayLastWeekOriginal' },
}

function normalizeDay(day) {
  return String(day || '').trim().toLowerCase()
}

function digitsOf(value) {
  return String(value || '').replace(/\D/g, '').split('')
}

function uniqueDigits(value) {
  return [...new Set(digitsOf(value))]
}

function addScore(weighted, digit, score) {
  if (!digit) {
    return
  }

  weighted[digit] = (weighted[digit] || 0) + score
}

function scoreDigits(weighted, value, score, repeatExtra = 0) {
  const counts = digitsOf(value).reduce((result, digit) => {
    result[digit] = (result[digit] || 0) + 1
    return result
  }, {})

  for (const [digit, count] of Object.entries(counts)) {
    addScore(weighted, digit, score)

    if (count > 1) {
      addScore(weighted, digit, repeatExtra * (count - 1))
    }
  }
}

function sortWeightedDigits(weighted, preferred = []) {
  const preferredRank = new Map(preferred.map((digit, index) => [digit, index]))

  return Object.entries(weighted)
    .sort((a, b) => {
      const scoreDiff = b[1] - a[1]
      if (scoreDiff !== 0) {
        return scoreDiff
      }

      const aPreferred = preferredRank.has(a[0]) ? preferredRank.get(a[0]) : 99
      const bPreferred = preferredRank.has(b[0]) ? preferredRank.get(b[0]) : 99
      if (aPreferred !== bPreferred) {
        return aPreferred - bPreferred
      }

      return Number(a[0]) - Number(b[0])
    })
    .map(([digit]) => digit)
}

function uniquePush(result, value, limit) {
  if (result.length >= limit || result.includes(value)) {
    return
  }

  result.push(value)
}

function generatePairs(digits, limit = 12) {
  const result = []
  const pool = [...new Set(digits)]

  for (const first of pool) {
    for (const second of pool) {
      if (first !== second) {
        uniquePush(result, `${first}${second}`, limit)
      }
    }
  }

  return result
}

function generateCandidates(weightedDigits, dominantDigits, selectedMainSource, selectedSupportSource) {
  const result = []
  const top = [...new Set([...weightedDigits, ...dominantDigits])].slice(0, 8)
  const mainDigits = uniqueDigits(selectedMainSource)
  const supportDigits = uniqueDigits(selectedSupportSource)
  const sourceTemplates = [
    [mainDigits[0], supportDigits[0], mainDigits[2], supportDigits[1]],
    [supportDigits[0], mainDigits[0], mainDigits[2], supportDigits[1]],
    [supportDigits[0], mainDigits[2], mainDigits[0], supportDigits[1]],
    [mainDigits[0], supportDigits[1], mainDigits[2], supportDigits[0]],
    [supportDigits[0], mainDigits[2], supportDigits[1], mainDigits[0]],
    digitsOf(selectedMainSource).slice(0, 4),
    [mainDigits[1], supportDigits[0], supportDigits[1], mainDigits[2]],
    digitsOf(selectedSupportSource).slice(0, 4),
  ]
  const topA = top[0]
  const topB = top[1]
  const dominantA = dominantDigits.find((digit) => digit !== topA && digit !== topB) || top[2]
  const dominantB = dominantDigits.find((digit) => {
    return digit !== topA && digit !== topB && digit !== dominantA
  }) || top[3]
  const templates = [
    [topA, topB, dominantA, dominantB],
    [topA, topB, dominantB, dominantA],
    [topA, dominantA, topB, dominantB],
    [topA, top[2], topB, dominantA],
    [dominantA, topB, topA, dominantB],
    [topB, topA, dominantB, dominantA],
    [topB, top[2], topA, dominantB],
    [dominantA, top[1], top[3], topA],
  ]

  for (const template of sourceTemplates) {
    const value = template.filter(Boolean).join('')
    if (value.length === 4) {
      uniquePush(result, value, 8)
    }
  }

  for (const template of templates) {
    const value = template.filter(Boolean).join('')
    if (value.length === 4) {
      uniquePush(result, value, 8)
    }
  }

  let index = 0
  while (result.length < 8 && top.length >= 4 && index < top.length * top.length) {
    const rotated = [
      top[index % top.length],
      top[(index + 1) % top.length],
      top[(index + 3) % top.length],
      top[(index + 5) % top.length],
    ].join('')
    uniquePush(result, rotated, 8)
    index += 1
  }

  return result
}

function sourceDigits(sources) {
  return [...new Set(sources.flatMap((source) => digitsOf(source)))]
}

function intersection(first, second) {
  const secondSet = new Set(second)
  return [...new Set(first)].filter((digit) => secondSet.has(digit))
}

function orderByScore(digits, weighted, preferred = []) {
  const preferredRank = new Map(preferred.map((digit, index) => [digit, index]))

  return [...new Set(digits)].sort((first, second) => {
    const scoreDiff = (weighted[second] || 0) - (weighted[first] || 0)
    if (scoreDiff !== 0) {
      return scoreDiff
    }

    const firstRank = preferredRank.has(first) ? preferredRank.get(first) : 99
    const secondRank = preferredRank.has(second) ? preferredRank.get(second) : 99
    if (firstRank !== secondRank) {
      return firstRank - secondRank
    }

    return Number(first) - Number(second)
  })
}

function pushDigits(result, digits, limit) {
  for (const digit of digits) {
    uniquePush(result, digit, limit)
  }
}

function pushAvailableDigits(result, digits, limit, excluded = []) {
  for (const digit of digits) {
    if (!excluded.includes(digit)) {
      uniquePush(result, digit, limit)
    }
  }
}

function hasDigit(source, digit) {
  return uniqueDigits(source).includes(digit)
}

function addCrossScore(weighted, firstDigits, secondDigits, score) {
  for (const digit of intersection(firstDigits, secondDigits)) {
    addScore(weighted, digit, score)
  }
}

function crossPairs(firstDigits, secondDigits, limit = 12, includeReverse = true) {
  const result = []

  for (const first of [...new Set(firstDigits)]) {
    for (const second of [...new Set(secondDigits)]) {
      if (first !== second) {
        uniquePush(result, `${first}${second}`, limit)

        if (includeReverse) {
          uniquePush(result, `${second}${first}`, limit)
        }
      }
    }
  }

  return result
}

function buildMondayNightInput(context, dominantDigits, sourceIncomplete) {
  return {
    previousDayResult: context.previousDayOriginal,
    sameDayLastWeekResult: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoResult: context.sameDayTwoWeeksAgoOriginal,
    sameDayThreeWeeksAgoResult: context.sameDayThreeWeeksAgoOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    sameDayTwoWeeksAgoMistikBaru: context.sameDayTwoWeeksAgoMistikBaru,
    selectedMainSource: context.previousDayMistikLama,
    selectedSupportSource: context.sameDayLastWeekMistikBaru,
    activeMistikSource: [
      context.previousDayMistikLama,
      context.sameDayLastWeekMistikBaru,
    ].filter(Boolean),
    dominantDigits,
    sourceIncomplete,
    sourceRule: {
      main: 'previousDayMistikLama',
      support: 'sameDayLastWeekMistikBaru',
      anchor: 'sameDayLastWeekOriginal',
    },
  }
}

function scoreMondayNightV1(context, dominantDigits) {
  const weighted = {}

  scoreDigits(weighted, context.previousDayMistikLama, 40, 10)
  scoreDigits(weighted, context.sameDayLastWeekMistikBaru, 30, 8)
  scoreDigits(weighted, context.sameDayLastWeekOriginal, 22, 6)
  scoreDigits(weighted, context.sameDayTwoWeeksAgoOriginal, 14)
  scoreDigits(weighted, context.sameDayTwoWeeksAgoMistikBaru, 14)
  scoreDigits(weighted, context.sameDayLastWeekMistikLama, 10)
  scoreDigits(weighted, context.previousDayOriginal, 8)
  dominantDigits.forEach((digit) => addScore(weighted, digit, 6))
  scoreDigits(weighted, context.sameDayThreeWeeksAgoOriginal, 6)

  addCrossScore(
    weighted,
    uniqueDigits(context.previousDayMistikLama),
    uniqueDigits(context.sameDayLastWeekOriginal),
    15,
  )
  addCrossScore(
    weighted,
    uniqueDigits(context.previousDayMistikLama),
    uniqueDigits(context.sameDayLastWeekMistikBaru),
    12,
  )
  addCrossScore(
    weighted,
    uniqueDigits(context.sameDayLastWeekMistikBaru),
    uniqueDigits(context.sameDayLastWeekOriginal),
    12,
  )
  addCrossScore(
    weighted,
    uniqueDigits(context.previousDayMistikLama),
    dominantDigits,
    8,
  )

  const weeklySources = [
    uniqueDigits(context.sameDayLastWeekOriginal),
    uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    uniqueDigits(context.sameDayThreeWeeksAgoOriginal),
  ]
  for (const digit of sourceDigits([
    context.sameDayLastWeekOriginal,
    context.sameDayTwoWeeksAgoOriginal,
    context.sameDayThreeWeeksAgoOriginal,
  ])) {
    const sourceCount = weeklySources.filter((source) => source.includes(digit)).length
    if (sourceCount > 1) {
      addScore(weighted, digit, 10)
    }
  }

  return weighted
}

function buildMondayNightPools({ context, dominantDigits, ranked, weighted }) {
  const main = []
  const support = []
  const reserve = []
  const mainSourceDigits = uniqueDigits(context.previousDayMistikLama)
  const supportSourceDigits = uniqueDigits(context.sameDayLastWeekMistikBaru)
  const anchorDigits = uniqueDigits(context.sameDayLastWeekOriginal)
  const secondaryDigits = sourceDigits([
    context.sameDayTwoWeeksAgoOriginal,
    context.sameDayTwoWeeksAgoMistikBaru,
  ])
  const engineDigits = sourceDigits([
    context.previousDayMistikLama,
    context.sameDayLastWeekMistikBaru,
    context.sameDayLastWeekOriginal,
    context.sameDayTwoWeeksAgoOriginal,
    context.sameDayTwoWeeksAgoMistikBaru,
    context.sameDayLastWeekMistikLama,
    context.previousDayOriginal,
    context.sameDayThreeWeeksAgoOriginal,
  ])

  pushDigits(main, orderByScore(mainSourceDigits, weighted, mainSourceDigits), 4)

  pushAvailableDigits(support, orderByScore(mainSourceDigits, weighted, mainSourceDigits), 4, main)
  pushAvailableDigits(support, orderByScore(supportSourceDigits, weighted, supportSourceDigits), 4, main)
  pushAvailableDigits(
    support,
    orderByScore(intersection(anchorDigits, mainSourceDigits), weighted, anchorDigits),
    4,
    main,
  )
  pushAvailableDigits(support, orderByScore(secondaryDigits, weighted), 4, main)

  const selected = [...main, ...support]
  const dominantOnly = dominantDigits.filter((digit) => {
    return !engineDigits.includes(digit)
  })
  const previousOriginalOnly = uniqueDigits(context.previousDayOriginal).filter((digit) => {
    return !sourceDigits([
      context.previousDayMistikLama,
      context.sameDayLastWeekMistikBaru,
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayLastWeekMistikLama,
    ]).includes(digit)
  })

  pushAvailableDigits(reserve, orderByScore(supportSourceDigits, weighted, supportSourceDigits), 8, selected)
  pushAvailableDigits(reserve, orderByScore(secondaryDigits, weighted), 8, selected)
  pushAvailableDigits(reserve, dominantOnly, 8, selected)
  pushAvailableDigits(reserve, previousOriginalOnly, 8, selected)
  pushAvailableDigits(reserve, ranked, 8, selected)

  return {
    main,
    support: support.slice(0, 4),
    reserve: reserve.slice(0, 8),
  }
}

function buildMondayNightPairs(context, weighted, limit, back = false) {
  const result = []
  const mainDigits = orderByScore(
    uniqueDigits(context.previousDayMistikLama),
    weighted,
    uniqueDigits(context.previousDayMistikLama),
  )
  const supportDigits = orderByScore(
    uniqueDigits(context.sameDayLastWeekMistikBaru),
    weighted,
    uniqueDigits(context.sameDayLastWeekMistikBaru),
  )
  const anchorDigits = uniqueDigits(context.sameDayLastWeekOriginal)
  const mainSourceDigits = digitsOf(context.previousDayMistikLama)

  if (back) {
    pushDigits(result, [
      `${mainSourceDigits[2]}${mainSourceDigits[3]}`,
      `${mainSourceDigits[3]}${mainSourceDigits[2]}`,
      `${mainSourceDigits[1]}${mainSourceDigits[3]}`,
      `${mainSourceDigits[3]}${mainSourceDigits[1]}`,
      `${mainSourceDigits[0]}${mainSourceDigits[3]}`,
      `${mainSourceDigits[3]}${mainSourceDigits[0]}`,
      `${mainSourceDigits[1]}${mainSourceDigits[2]}`,
      `${mainSourceDigits[2]}${mainSourceDigits[1]}`,
    ], limit)
    pushDigits(result, crossPairs(supportDigits.slice(1), supportDigits, 12), limit)
    pushDigits(result, crossPairs(mainDigits, supportDigits, 16), limit)
  } else {
    pushDigits(result, crossPairs(mainDigits, mainDigits, 16), limit)
    pushDigits(result, crossPairs(mainDigits, supportDigits, 20), limit)
  }

  pushDigits(result, crossPairs(anchorDigits, anchorDigits, 16), limit)
  pushDigits(result, crossPairs(supportDigits, supportDigits, 16), limit)
  pushDigits(result, crossPairs(mainDigits, supportDigits, 24), limit)

  return result
}

function mondayRawSources(context) {
  return new Set([
    context.previousDayOriginal,
    context.previousDayMistikLama,
    context.previousDayMistikBaru,
    context.sameDayLastWeekOriginal,
    context.sameDayLastWeekMistikLama,
    context.sameDayLastWeekMistikBaru,
    context.sameDayTwoWeeksAgoOriginal,
    context.sameDayTwoWeeksAgoMistikBaru,
    context.sameDayThreeWeeksAgoOriginal,
  ].filter(Boolean))
}

function pushCandidate(result, context, template, limit) {
  const value = template.filter(Boolean).join('')
  if (value.length === 4 && !mondayRawSources(context).has(value)) {
    uniquePush(result, value, limit)
  }
}

function generateMondayNightCandidates(context) {
  const result = []
  const mainDigits = uniqueDigits(context.previousDayMistikLama)
  const supportDigits = uniqueDigits(context.sameDayLastWeekMistikBaru)
  const anchorDigits = uniqueDigits(context.sameDayLastWeekOriginal)
  const secondaryDigits = uniqueDigits(context.sameDayTwoWeeksAgoOriginal)
  const secondaryMbDigits = uniqueDigits(context.sameDayTwoWeeksAgoMistikBaru)
  const templates = [
    [mainDigits[0], mainDigits[3], mainDigits[2], anchorDigits[2]],
    [mainDigits[0], mainDigits[1], mainDigits[3], supportDigits[1]],
    [mainDigits[0], mainDigits[3], supportDigits[1], mainDigits[1]],
    [mainDigits[2], mainDigits[1], supportDigits[1], mainDigits[3]],
    [mainDigits[1], mainDigits[2], mainDigits[3], supportDigits[1]],
    [supportDigits[0], supportDigits[1], supportDigits[2], mainDigits[1]],
    [mainDigits[0], mainDigits[2], supportDigits[2], supportDigits[3]],
    [mainDigits[1], supportDigits[0], supportDigits[2], supportDigits[3]],
    [mainDigits[1], mainDigits[3], secondaryDigits[0], secondaryMbDigits[1]],
  ]

  for (const template of templates) {
    pushCandidate(result, context, template, 8)
  }

  return result
}

function buildMondayNightV1(context) {
  const dominantDigits = getNightDominantDigits(context.targetDay)
  const sourceIncomplete = !context.previousDayOriginal || !context.sameDayLastWeekOriginal
  const weighted = scoreMondayNightV1(context, dominantDigits)
  const dominantOnlyDigits = dominantDigits.filter((digit) => {
    return ![
      context.previousDayMistikLama,
      context.sameDayLastWeekMistikBaru,
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayLastWeekMistikLama,
      context.previousDayOriginal,
      context.sameDayThreeWeeksAgoOriginal,
    ].some((source) => hasDigit(source, digit))
  })
  const ranked = sortWeightedDigits(weighted, [
    ...uniqueDigits(context.previousDayMistikLama),
    ...uniqueDigits(context.sameDayLastWeekMistikBaru),
    ...uniqueDigits(context.sameDayLastWeekOriginal),
    ...uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    ...dominantDigits,
  ])
    .filter((digit) => !dominantOnlyDigits.includes(digit))
    .concat(dominantOnlyDigits)
  const { main, support, reserve } = buildMondayNightPools({
    context,
    dominantDigits,
    ranked,
    weighted,
  })
  const notes = [
    'Senin Night V1 memakai ML previousDay Minggu sebagai main source dan MB sameDayLastWeek Senin sebagai support source. Dominant Senin Night hanya filter kecil.',
  ]

  if (sourceIncomplete) {
    notes.push('Senin Night source incomplete: previousDay/sameDayLastWeek not available.')
  }

  return {
    input: buildMondayNightInput(context, dominantDigits, sourceIncomplete),
    digitPool: {
      main,
      support,
      reserve,
      weighted,
    },
    front2d: buildMondayNightPairs(context, weighted, 20),
    back2d: buildMondayNightPairs(context, weighted, 20, true),
    candidates4d: generateMondayNightCandidates(context),
    notes,
  }
}

function buildInput(context, selectedMainSource, selectedSupportSource) {
  return {
    previousDayResult: context.previousDayOriginal,
    sameDayLastWeekResult: context.sameDayLastWeekOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    selectedMainSource,
    selectedSupportSource,
  }
}

export function getNightDominantDigits(targetDay) {
  return NIGHT_DOMINANT_DIGITS[normalizeDay(targetDay)] || []
}

export function runNightV1(context) {
  const dayKey = normalizeDay(context.targetDay)
  const rule = V1_SOURCE_RULES[dayKey]

  if (!rule) {
    const error = new Error('targetDay is not supported for night_v1')
    error.statusCode = 400
    throw error
  }

  if (dayKey === 'senin' && context.session === 'night') {
    return buildMondayNightV1(context)
  }

  const selectedMainSource = context[rule.main]
  const selectedSupportSource = context[rule.support]
  const dominantDigits = getNightDominantDigits(context.targetDay)
  const weighted = {}

  scoreDigits(weighted, selectedMainSource, 40, 15)
  scoreDigits(weighted, selectedSupportSource, 30)
  dominantDigits.forEach((digit) => addScore(weighted, digit, 20))
  scoreDigits(weighted, context.previousDayOriginal, 10)
  scoreDigits(weighted, context.sameDayLastWeekOriginal, 10)

  const ranked = sortWeightedDigits(weighted, [
    ...uniqueDigits(selectedMainSource),
    ...dominantDigits,
    ...uniqueDigits(selectedSupportSource),
  ])
  const main = ranked.slice(0, 3)
  const support = ranked.slice(3, 5)
  const reserve = dominantDigits.filter((digit) => !main.includes(digit) && !support.includes(digit))
  const pairPool = [...ranked.slice(0, 5), ...dominantDigits]

  return {
    input: buildInput(context, selectedMainSource, selectedSupportSource),
    digitPool: {
      main,
      support,
      reserve,
      weighted,
    },
    front2d: generatePairs(ranked.slice(0, 4), 12),
    back2d: generatePairs(pairPool, 16),
    candidates4d: generateCandidates(
      ranked,
      dominantDigits,
      selectedMainSource,
      selectedSupportSource,
    ),
    notes: [
      'night_v1 emphasizes active mistik sources',
      `main source: ${rule.main}`,
      `support source: ${rule.support}`,
    ],
  }
}
