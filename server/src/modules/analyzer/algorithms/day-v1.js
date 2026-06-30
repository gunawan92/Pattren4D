const DAY_DOMINANT_DIGITS = {
  senin: ['1', '3', '5', '7', '9'],
  selasa: ['1', '2', '3', '5', '7'],
  rabu: ['1', '2', '3', '5', '7', '8'],
  kamis: ['1', '4', '5', '7', '8'],
  jumat: ['0', '3', '4', '6', '8'],
  sabtu: ['2', '3', '5', '7', '8'],
  minggu: ['1', '2', '4', '6', '7', '8'],
}

const DAY_V1_RULES = {
  senin: {
    main: 'sameDayLastWeekMistikBaru',
    support: 'previousDayMistikBaru',
    active: ['sameDayLastWeekMistikBaru', 'previousDayMistikBaru'],
  },
  selasa: {
    main: 'sameDayLastWeekOriginal',
    support: 'previousDayOriginal',
    active: ['previousDayMistikLama'],
  },
  rabu: {
    main: 'previousDayOriginal',
    support: 'sameDayLastWeekOriginal',
    active: ['previousDayMistikLama', 'previousDayMistikBaru'],
  },
  kamis: {
    main: 'previousDayOriginal',
    support: 'sameDayLastWeekOriginal',
    active: ['sameDayLastWeekMistikBaru'],
  },
  jumat: {
    main: 'previousDayMistikLama',
    support: 'sameDayLastWeekOriginal',
    active: ['previousDayMistikLama'],
  },
  sabtu: {
    main: 'sameDayLastWeekMistikLama',
    support: 'previousDayOriginal',
    active: ['previousDayMistikBaru'],
  },
  minggu: {
    main: 'sameDayLastWeekMistikBaru',
    support: 'previousDayMistikLama',
    active: ['sameDayLastWeekMistikBaru', 'previousDayMistikLama'],
  },
}

export function normalizeDayName(dayName) {
  return String(dayName || '').trim().toLowerCase()
}

export function getDayDominantDigits(dayName) {
  return DAY_DOMINANT_DIGITS[normalizeDayName(dayName)] || []
}

export function digitsOf(value) {
  return String(value || '').replace(/\D/g, '').split('')
}

export function uniqueDigits(value) {
  return [...new Set(digitsOf(value))]
}

export function addScore(weighted, digit, score) {
  if (digit) {
    weighted[digit] = (weighted[digit] || 0) + score
  }
}

export function scoreDigits(weighted, value, score, repeatExtra = 0) {
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

export function scoreCrossRepeats(weighted, first, second, score) {
  const firstSet = new Set(digitsOf(first))
  const secondSet = new Set(digitsOf(second))

  for (const digit of firstSet) {
    if (secondSet.has(digit)) {
      addScore(weighted, digit, score)
    }
  }
}

function digitCounts(value) {
  return digitsOf(value).reduce((result, digit) => {
    result[digit] = (result[digit] || 0) + 1
    return result
  }, {})
}

function hasRepeatedDigit(value, digit) {
  return (digitCounts(value)[digit] || 0) > 1
}

function intersection(first, second) {
  const secondSet = new Set(second)
  return [...new Set(first)].filter((digit) => secondSet.has(digit))
}

function sourceDigits(sources) {
  return [...new Set(sources.flatMap((source) => digitsOf(source)))]
}

export function sortWeightedDigits(weighted, preferred = []) {
  const preferredRank = new Map(preferred.map((digit, index) => [digit, index]))

  return Object.entries(weighted)
    .sort((a, b) => {
      const diff = b[1] - a[1]
      if (diff !== 0) {
        return diff
      }

      const aRank = preferredRank.has(a[0]) ? preferredRank.get(a[0]) : 99
      const bRank = preferredRank.has(b[0]) ? preferredRank.get(b[0]) : 99
      if (aRank !== bRank) {
        return aRank - bRank
      }

      return Number(a[0]) - Number(b[0])
    })
    .map(([digit]) => digit)
}

function uniquePush(result, value, limit) {
  if (result.length < limit && !result.includes(value)) {
    result.push(value)
  }
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

export function buildReserve(ranked, dominantDigits, main, support) {
  const reserve = dominantDigits.filter((digit) => !main.includes(digit) && !support.includes(digit))

  if (reserve.length) {
    return reserve
  }

  return ranked.filter((digit) => !main.includes(digit) && !support.includes(digit))
}

export function buildReserveFromSources(sources, main, support) {
  return [...new Set(sources.flatMap((source) => digitsOf(source)))]
    .filter((digit) => !main.includes(digit) && !support.includes(digit))
}

export function capFridaySecondaryNoise(weighted, context, dominantDigits, maxScore = 24) {
  const protectedDigits = new Set([
    ...dominantDigits,
    ...uniqueDigits(context.sameDayLastWeekOriginal),
    ...uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
  ])

  for (const digit of Object.keys(weighted)) {
    if (!protectedDigits.has(digit) && weighted[digit] > maxScore) {
      weighted[digit] = maxScore
    }
  }
}

export function generatePairs(digits, limit = 8) {
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

function orderedByRank(digits, ranked) {
  const rank = new Map(ranked.map((digit, index) => [digit, index]))
  return [...new Set(digits)]
    .sort((first, second) => {
      const firstRank = rank.has(first) ? rank.get(first) : 99
      const secondRank = rank.has(second) ? rank.get(second) : 99

      if (firstRank !== secondRank) {
        return firstRank - secondRank
      }

      return Number(first) - Number(second)
    })
}

function sourceAdjacentPairs(value, limit = 8) {
  const result = []
  const digits = digitsOf(value)

  for (let index = 0; index < digits.length - 1; index += 1) {
    uniquePush(result, `${digits[index]}${digits[index + 1]}`, limit)
    uniquePush(result, `${digits[index + 1]}${digits[index]}`, limit)
  }

  return result
}

function crossPairs(firstDigits, secondDigits, limit = 8, includeReverse = true) {
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

function buildDayV1Pools({
  ranked,
  dominantDigits,
  sameDayLastWeekOriginal,
  sameDayTwoWeeksAgoOriginal,
  previousDayOriginal,
  sameDayLastWeekMistikLama,
  correctionSource,
}) {
  const main = []
  const support = []
  const reserve = []
  const weeklyOriginalDigits = sourceDigits([
    sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoOriginal,
  ])
  const weeklySharedDigits = intersection(
    uniqueDigits(sameDayLastWeekOriginal),
    uniqueDigits(sameDayTwoWeeksAgoOriginal),
  )
  const dominantAndWeeklyMistikLama = intersection(
    dominantDigits,
    uniqueDigits(sameDayLastWeekMistikLama),
  )
  const correctionDigits = sourceDigits(correctionSource)
  const dominantAndCorrection = intersection(dominantDigits, correctionDigits)
  const previousRelevantDigits = intersection(
    uniqueDigits(previousDayOriginal),
    [...dominantDigits, ...correctionDigits],
  )

  pushDigits(main, orderedByRank(weeklySharedDigits, ranked), 3)
  pushDigits(main, orderedByRank(weeklyOriginalDigits, ranked), 3)
  pushDigits(support, orderedByRank(dominantAndWeeklyMistikLama, ranked), 3)
  pushDigits(
    support,
    orderedByRank(
      dominantAndWeeklyMistikLama.filter((digit) => hasRepeatedDigit(sameDayLastWeekMistikLama, digit)),
      ranked,
    ),
    3,
  )
  pushDigits(support, orderedByRank(dominantAndCorrection, ranked), 3)
  pushDigits(support, orderedByRank(uniqueDigits(sameDayLastWeekMistikLama), ranked), 3)
  pushDigits(support, orderedByRank(previousRelevantDigits, ranked), 3)

  const cleanSupport = support.filter((digit) => !main.includes(digit)).slice(0, 3)

  pushDigits(reserve, dominantDigits, 4)
  pushDigits(reserve, orderedByRank(correctionDigits, ranked), 4)
  pushDigits(reserve, ranked, 4)

  return {
    main,
    support: cleanSupport,
    reserve: reserve
      .filter((digit) => !main.includes(digit) && !cleanSupport.includes(digit))
      .slice(0, 4),
  }
}

function buildDayV1Front2d({
  ranked,
  main,
  sameDayLastWeekOriginal,
  sameDayTwoWeeksAgoOriginal,
}) {
  const result = []

  pushDigits(result, sourceAdjacentPairs(sameDayLastWeekOriginal), 8)
  pushDigits(result, sourceAdjacentPairs(sameDayTwoWeeksAgoOriginal), 8)
  pushDigits(result, generatePairs(main, 8), 8)
  pushDigits(result, generatePairs(ranked.slice(0, 4), 8), 8)

  return result
}

function buildDayV1Back2d({
  dayKey,
  ranked,
  main,
  support,
  dominantDigits,
  sameDayTwoWeeksAgoOriginal,
  sameDayLastWeekMistikLama,
  correctionSource,
}) {
  const result = []
  const correctionDigits = sourceDigits(correctionSource)
  const weeklyMistikLamaDigits = uniqueDigits(sameDayLastWeekMistikLama)
  const memoryDigits = uniqueDigits(sameDayTwoWeeksAgoOriginal)

  if (dayKey === 'selasa') {
    const correctionSupport = support.filter((digit) => correctionDigits.includes(digit))
    const memoryBridge = memoryDigits.filter((digit) => !main.includes(digit))
    pushDigits(result, crossPairs(correctionSupport, memoryBridge, 8), 8)
  }

  pushDigits(result, crossPairs(support, main, 8), 8)
  pushDigits(result, crossPairs(weeklyMistikLamaDigits, dominantDigits, 8), 8)
  pushDigits(result, crossPairs(weeklyMistikLamaDigits, memoryDigits, 8), 8)
  pushDigits(result, crossPairs(correctionDigits, dominantDigits, 8), 8)
  pushDigits(result, generatePairs([...main, ...support, ...ranked], 8), 8)

  return result
}

function digitSet(value) {
  return new Set(digitsOf(value))
}

function hasDigit(value, digit) {
  return digitSet(value).has(digit)
}

function addFridayCrossScore(weighted, firstDigits, secondDigits, score) {
  for (const digit of intersection(firstDigits, secondDigits)) {
    addScore(weighted, digit, score)
  }
}

function pairScore(pair, weighted, bonus = 0) {
  return pair
    .split('')
    .reduce((score, digit) => score + (weighted[digit] || 0), bonus)
}

function collectScoredPairs(groups, weighted, limit = 8) {
  const seen = new Map()

  for (const group of groups) {
    for (const pair of group.pairs) {
      if (pair.length !== 2 || pair[0] === pair[1]) {
        continue
      }

      const score = pairScore(pair, weighted, group.bonus || 0)
      if (!seen.has(pair) || seen.get(pair) < score) {
        seen.set(pair, score)
      }
    }
  }

  return [...seen.entries()]
    .sort((first, second) => {
      const diff = second[1] - first[1]
      if (diff !== 0) {
        return diff
      }

      return Number(first[0]) - Number(second[0])
    })
    .slice(0, limit)
    .map(([pair]) => pair)
}

function scoredCrossPairs(firstDigits, secondDigits, weighted, limit, bonus = 0) {
  return collectScoredPairs(
    [
      {
        pairs: crossPairs(firstDigits, secondDigits, 40, false),
        bonus,
      },
    ],
    weighted,
    limit,
  )
}

function orderByScore(digits, weighted) {
  return [...new Set(digits)].sort((first, second) => {
    const diff = (weighted[second] || 0) - (weighted[first] || 0)
    if (diff !== 0) {
      return diff
    }

    return Number(first) - Number(second)
  })
}

function orderFridayOriginalDigits(value, weighted) {
  const unique = uniqueDigits(value)
  const repeated = unique.filter((digit) => hasRepeatedDigit(value, digit))
  const rest = unique.filter((digit) => !repeated.includes(digit))

  return [
    ...orderByScore(repeated, weighted),
    ...orderByScore(rest, weighted),
  ]
}

function orderFridayCorrectionDigits(digits, weighted, dominantDigits, primarySource = []) {
  const unique = [...new Set(digits)]
  const fresh = unique.filter((digit) => !dominantDigits.includes(digit) && !primarySource.includes(digit))
  const rest = unique.filter((digit) => !fresh.includes(digit))

  return [
    ...orderByScore(fresh, weighted),
    ...orderByScore(rest, weighted),
  ]
}

function orderFridayMlDigits(digits, weighted, mbDigits) {
  const unique = [...new Set(digits)]
  const mbSet = new Set(mbDigits)
  const mlOnly = unique.filter((digit) => !mbSet.has(digit))
  const rest = unique.filter((digit) => mbSet.has(digit))

  return [
    ...orderByScore(mlOnly, weighted),
    ...orderByScore(rest, weighted),
  ]
}

function buildFridayInput(context, dominantDigits) {
  return {
    previousDayResult: context.previousDayOriginal,
    sameDayLastWeekResult: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoResult: context.sameDayTwoWeeksAgoOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    sameDayTwoWeeksAgoMistikLama: context.sameDayTwoWeeksAgoMistikLama,
    sameDayTwoWeeksAgoMistikBaru: context.sameDayTwoWeeksAgoMistikBaru,
    selectedMainSource: context.sameDayLastWeekOriginal,
    selectedSupportSource: context.sameDayTwoWeeksAgoOriginal,
    activeMistikSource: [
      context.sameDayLastWeekMistikLama,
      context.sameDayLastWeekMistikBaru,
    ].filter(Boolean),
    dominantDigits,
    sourceRule: {
      main: 'sameDayLastWeekOriginal',
      support: 'sameDayTwoWeeksAgoOriginal',
      active: ['sameDayLastWeekMistikLama', 'sameDayLastWeekMistikBaru'],
    },
  }
}

function scoreFridayDayV1(context, dominantDigits) {
  const weighted = {}
  const lastWeek = context.sameDayLastWeekOriginal
  const twoWeeks = context.sameDayTwoWeeksAgoOriginal
  const lastWeekMl = context.sameDayLastWeekMistikLama
  const lastWeekMb = context.sameDayLastWeekMistikBaru

  scoreDigits(weighted, lastWeek, 35, 10)
  scoreDigits(weighted, twoWeeks, 30, 8)
  scoreDigits(weighted, lastWeekMl, 20, 10)
  scoreDigits(weighted, lastWeekMb, 18, 8)
  dominantDigits.forEach((digit) => addScore(weighted, digit, 10))
  scoreDigits(weighted, context.previousDayOriginal, 8)
  scoreDigits(weighted, context.previousDayMistikLama, 10)
  scoreDigits(weighted, context.previousDayMistikBaru, 6)

  scoreCrossRepeats(weighted, lastWeek, twoWeeks, 15)
  addFridayCrossScore(weighted, uniqueDigits(lastWeek), dominantDigits, 10)
  addFridayCrossScore(weighted, uniqueDigits(twoWeeks), dominantDigits, 10)
  addFridayCrossScore(weighted, uniqueDigits(lastWeekMl), dominantDigits, 15)
  addFridayCrossScore(weighted, uniqueDigits(lastWeekMb), dominantDigits, 15)
  addFridayCrossScore(
    weighted,
    sourceDigits([lastWeekMl, lastWeekMb]),
    uniqueDigits(twoWeeks),
    12,
  )

  return weighted
}

function buildFridayDayV1Pools({
  ranked,
  dominantDigits,
  sameDayLastWeekOriginal,
  sameDayTwoWeeksAgoOriginal,
  previousDayOriginal,
  previousDayMistikLama,
  previousDayMistikBaru,
  sameDayLastWeekMistikLama,
  sameDayLastWeekMistikBaru,
  sameDayTwoWeeksAgoMistikLama,
  sameDayTwoWeeksAgoMistikBaru,
}) {
  const main = []
  const support = []
  const reserve = []
  const lastWeekDigits = uniqueDigits(sameDayLastWeekOriginal)
  const twoWeeksDigits = uniqueDigits(sameDayTwoWeeksAgoOriginal)
  const weeklyDigits = sourceDigits([sameDayLastWeekOriginal, sameDayTwoWeeksAgoOriginal])
  const weeklySharedDigits = intersection(lastWeekDigits, twoWeeksDigits)
  const lastWeekMistikDigits = sourceDigits([
    sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru,
  ])
  const correctionDigits = sourceDigits([
    sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru,
    sameDayTwoWeeksAgoMistikLama,
    sameDayTwoWeeksAgoMistikBaru,
    previousDayMistikLama,
    previousDayMistikBaru,
  ])

  pushDigits(main, orderedByRank(weeklySharedDigits, ranked), 3)
  pushDigits(main, orderedByRank(weeklyDigits, ranked), 3)
  pushDigits(main, orderedByRank(intersection(weeklyDigits, dominantDigits), ranked), 3)

  pushAvailableDigits(support, orderedByRank(intersection(lastWeekMistikDigits, dominantDigits), ranked), 4, main)
  pushAvailableDigits(support, orderedByRank(intersection(lastWeekMistikDigits, twoWeeksDigits), ranked), 4, main)
  pushAvailableDigits(support, orderedByRank(intersection(lastWeekDigits, dominantDigits), ranked), 4, main)
  pushAvailableDigits(support, orderedByRank(intersection(twoWeeksDigits, dominantDigits), ranked), 4, main)
  pushAvailableDigits(support, orderedByRank(lastWeekMistikDigits, ranked), 4, main)
  pushAvailableDigits(support, orderedByRank(weeklyDigits, ranked), 4, main)

  const cleanSupport = support.slice(0, 4)
  const selected = [...main, ...cleanSupport]

  pushAvailableDigits(reserve, dominantDigits, 4, selected)
  pushAvailableDigits(reserve, orderedByRank(correctionDigits, ranked), 4, selected)
  pushAvailableDigits(reserve, orderedByRank(uniqueDigits(previousDayOriginal), ranked), 4, selected)
  pushAvailableDigits(reserve, ranked, 4, selected)

  return {
    main,
    support: cleanSupport,
    reserve: reserve.slice(0, 4),
  }
}

function buildFridayDayV1Front2d({
  weighted,
  main,
  support,
  sameDayLastWeekOriginal,
  sameDayTwoWeeksAgoOriginal,
  sameDayLastWeekMistikLama,
  sameDayLastWeekMistikBaru,
}) {
  const result = []
  const originalWeeklyDigits = orderFridayOriginalDigits(sameDayLastWeekOriginal, weighted)
  const mbWeeklyDigits = orderFridayCorrectionDigits(
    uniqueDigits(sameDayLastWeekMistikBaru),
    weighted,
    getDayDominantDigits('Jumat'),
    originalWeeklyDigits,
  )
  const mlWeeklyDigits = orderFridayMlDigits(
    uniqueDigits(sameDayLastWeekMistikLama),
    weighted,
    mbWeeklyDigits,
  )
  const originalMlDigits = [
    ...originalWeeklyDigits.filter((digit) => !mbWeeklyDigits.includes(digit)),
    ...originalWeeklyDigits.filter((digit) => mbWeeklyDigits.includes(digit)),
  ]

  pushDigits(result, crossPairs(originalWeeklyDigits, mbWeeklyDigits, 12, false), 8)
  result.splice(3)
  pushDigits(result, crossPairs(mbWeeklyDigits, originalWeeklyDigits, 12, false), 5)
  pushDigits(result, crossPairs(originalMlDigits, mlWeeklyDigits, 12, false), 7)
  pushDigits(result, crossPairs(mlWeeklyDigits, originalMlDigits, 12, false), 8)
  pushDigits(result, sourceAdjacentPairs(sameDayLastWeekOriginal, 12), 8)
  pushDigits(result, sourceAdjacentPairs(sameDayTwoWeeksAgoOriginal, 12), 8)
  pushDigits(result, generatePairs([...main, ...support], 16), 8)

  return result
}

function buildFridayDayV1Back2d({
  weighted,
  main,
  support,
  dominantDigits,
  sameDayLastWeekOriginal,
  sameDayTwoWeeksAgoOriginal,
  sameDayLastWeekMistikLama,
  sameDayLastWeekMistikBaru,
  previousDayMistikLama,
    previousDayMistikBaru,
}) {
  const result = []
  const lastWeekMistikDigits = sourceDigits([
    sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru,
  ])
  const correctionDigits = sourceDigits([
    sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru,
    previousDayMistikLama,
    previousDayMistikBaru,
  ])
  const supportMainBridge = []

  for (const digit of support.slice(0, 2)) {
    if (main[0] && digit !== main[0]) {
      uniquePush(supportMainBridge, `${digit}${main[0]}`, 4)
      uniquePush(supportMainBridge, `${main[0]}${digit}`, 4)
    }
  }

  pushDigits(result, supportMainBridge, 8)
  pushDigits(result, collectScoredPairs(
    [
      { pairs: crossPairs(correctionDigits, dominantDigits, 24), bonus: 45 },
    ],
    weighted,
    4,
  ), 8)
  pushDigits(result, collectScoredPairs(
    [
      { pairs: crossPairs(support, main, 24), bonus: 100 },
      { pairs: crossPairs(lastWeekMistikDigits, uniqueDigits(sameDayTwoWeeksAgoOriginal), 24), bonus: 45 },
      { pairs: crossPairs(uniqueDigits(sameDayLastWeekOriginal), dominantDigits, 24), bonus: 40 },
    ],
    weighted,
    8,
  ), 8)

  return result
}

function replaceAt(digits, index, value) {
  const next = [...digits]
  next[index] = value
  return next
}

function generateFridayDayCandidates({
  ranked,
  main,
  support,
  front2d,
  back2d,
  sameDayLastWeekOriginal,
  sameDayTwoWeeksAgoOriginal,
}) {
  const result = []
  const top = [...new Set([...main, ...support, ...ranked])].slice(0, 8)
  const lastWeekDigits = digitsOf(sameDayLastWeekOriginal)
  const twoWeeksDigits = digitsOf(sameDayTwoWeeksAgoOriginal)
  const supportFallback = support.length ? support : top
  const templates = [
    [...String(front2d[0] || '').split(''), ...String(back2d[0] || '').split('')],
    [...String(front2d[1] || '').split(''), ...String(back2d[0] || '').split('')],
    [...String(front2d[0] || '').split(''), ...String(back2d[1] || '').split('')],
    [...String(front2d[2] || '').split(''), ...String(back2d[2] || '').split('')],
    replaceAt(lastWeekDigits, 3, supportFallback[0]),
    replaceAt(lastWeekDigits, 2, supportFallback[1] || supportFallback[0]),
    replaceAt(twoWeeksDigits, 3, supportFallback[0]),
    replaceAt(twoWeeksDigits, 2, supportFallback[1] || supportFallback[0]),
    [top[0], top[1], top[2], top[3]],
    [top[0], top[2], top[3], top[1]],
    [top[1], top[3], top[0], top[2]],
    [top[2], top[0], top[3], top[1]],
  ]

  for (const template of templates) {
    const value = template.filter(Boolean).join('')
    if (value.length === 4) {
      uniquePush(result, value, 8)
    }
  }

  let index = 0
  while (result.length < 8 && front2d.length && back2d.length && index < front2d.length * back2d.length) {
    const front = front2d[index % front2d.length]
    const back = back2d[Math.floor(index / front2d.length) % back2d.length]
    uniquePush(result, `${front}${back}`, 8)
    index += 1
  }

  return result
}

function buildFridayDayV1(context) {
  const dominantDigits = getDayDominantDigits(context.targetDay)
  const weighted = scoreFridayDayV1(context, dominantDigits)
  const dominantOnlyDigits = dominantDigits.filter((digit) => {
    return ![
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.previousDayOriginal,
      context.previousDayMistikLama,
      context.previousDayMistikBaru,
      context.sameDayLastWeekMistikLama,
      context.sameDayLastWeekMistikBaru,
      context.sameDayTwoWeeksAgoMistikLama,
      context.sameDayTwoWeeksAgoMistikBaru,
    ].some((source) => hasDigit(source, digit))
  })
  const preferredDigits = [
    ...uniqueDigits(context.sameDayLastWeekOriginal),
    ...uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    ...uniqueDigits(context.sameDayLastWeekMistikLama),
    ...uniqueDigits(context.sameDayLastWeekMistikBaru),
    ...dominantDigits,
    ...uniqueDigits(context.previousDayMistikLama),
    ...uniqueDigits(context.previousDayOriginal),
  ]
  const ranked = sortWeightedDigits(weighted, preferredDigits)
    .filter((digit) => !dominantOnlyDigits.includes(digit))
    .concat(dominantOnlyDigits)
  const { main, support, reserve } = buildFridayDayV1Pools({
    ranked,
    dominantDigits,
    sameDayLastWeekOriginal: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
    previousDayOriginal: context.previousDayOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    sameDayTwoWeeksAgoMistikLama: context.sameDayTwoWeeksAgoMistikLama,
    sameDayTwoWeeksAgoMistikBaru: context.sameDayTwoWeeksAgoMistikBaru,
  })
  const front2d = buildFridayDayV1Front2d({
    weighted,
    main,
    support,
    sameDayLastWeekOriginal: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
  })
  const back2d = buildFridayDayV1Back2d({
    weighted,
    main,
    support,
    dominantDigits,
    sameDayLastWeekOriginal: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
  })

  return {
    input: buildFridayInput(context, dominantDigits),
    digitPool: {
      main,
      support,
      reserve,
      weighted,
    },
    front2d,
    back2d,
    candidates4d: generateFridayDayCandidates({
      ranked,
      main,
      support,
      front2d,
      back2d,
      sameDayLastWeekOriginal: context.sameDayLastWeekOriginal,
      sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
    }),
    notes: [
      'Jumat Day V1 memakai weekly memory + mistik Jumat minggu lalu sebagai sumber utama. Kamis sebelumnya hanya secondary. Dominant Jumat dipakai sebagai filter, bukan sumber utama.',
    ],
  }
}

function scoreMondayDayV1(context, dominantDigits) {
  const weighted = {}

  scoreDigits(weighted, context.sameDayLastWeekOriginal, 30, 8)
  scoreDigits(weighted, context.sameDayTwoWeeksAgoOriginal, 35, 10)
  scoreDigits(weighted, context.sameDayThreeWeeksAgoOriginal, 28, 10)
  scoreDigits(weighted, context.sameDayThreeWeeksAgoMistikBaru, 25, 12)
  scoreDigits(weighted, context.sameDayTwoWeeksAgoMistikBaru, 18, 8)
  scoreDigits(weighted, context.sameDayLastWeekMistikBaru, 15, 6)
  scoreDigits(weighted, context.previousDayOriginal, 8)
  scoreDigits(weighted, context.previousDayMistikBaru, 8)
  scoreDigits(weighted, context.sameDayLastWeekMistikLama, 6)
  scoreDigits(weighted, context.sameDayTwoWeeksAgoMistikLama, 8)
  scoreDigits(weighted, context.sameDayThreeWeeksAgoMistikLama, 8)
  dominantDigits.forEach((digit) => addScore(weighted, digit, 8))

  addFridayCrossScore(
    weighted,
    uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    uniqueDigits(context.sameDayThreeWeeksAgoOriginal),
    18,
  )
  addFridayCrossScore(
    weighted,
    uniqueDigits(context.sameDayThreeWeeksAgoOriginal),
    uniqueDigits(context.sameDayThreeWeeksAgoMistikBaru),
    18,
  )
  addFridayCrossScore(
    weighted,
    uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    uniqueDigits(context.sameDayThreeWeeksAgoMistikBaru),
    15,
  )
  addFridayCrossScore(
    weighted,
    uniqueDigits(context.sameDayLastWeekOriginal),
    uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    12,
  )
  addFridayCrossScore(
    weighted,
    uniqueDigits(context.previousDayOriginal),
    sourceDigits([
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayThreeWeeksAgoOriginal,
      context.sameDayLastWeekMistikBaru,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayThreeWeeksAgoMistikBaru,
    ]),
    8,
  )

  const mbSources = [
    uniqueDigits(context.sameDayLastWeekMistikBaru),
    uniqueDigits(context.sameDayTwoWeeksAgoMistikBaru),
    uniqueDigits(context.sameDayThreeWeeksAgoMistikBaru),
  ]
  const mbDigits = sourceDigits([
    context.sameDayLastWeekMistikBaru,
    context.sameDayTwoWeeksAgoMistikBaru,
    context.sameDayThreeWeeksAgoMistikBaru,
  ])

  for (const digit of mbDigits) {
    const sourceCount = mbSources.filter((source) => source.includes(digit)).length
    if (sourceCount > 1) {
      addScore(weighted, digit, 12)
    }
  }

  return weighted
}

function buildMondayInput(context, dominantDigits, sameDayThreeWeeksAgoAvailable) {
  return {
    previousDayResult: context.previousDayOriginal,
    sameDayLastWeekResult: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoResult: context.sameDayTwoWeeksAgoOriginal,
    sameDayThreeWeeksAgoResult: context.sameDayThreeWeeksAgoOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    sameDayTwoWeeksAgoMistikLama: context.sameDayTwoWeeksAgoMistikLama,
    sameDayTwoWeeksAgoMistikBaru: context.sameDayTwoWeeksAgoMistikBaru,
    sameDayThreeWeeksAgoMistikLama: context.sameDayThreeWeeksAgoMistikLama,
    sameDayThreeWeeksAgoMistikBaru: context.sameDayThreeWeeksAgoMistikBaru,
    selectedMainSource: [
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayThreeWeeksAgoOriginal,
    ].filter(Boolean),
    selectedSupportSource: [
      context.sameDayThreeWeeksAgoMistikBaru,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayLastWeekMistikBaru,
    ].filter(Boolean),
    activeMistikSource: [
      context.sameDayThreeWeeksAgoMistikBaru,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayLastWeekMistikBaru,
    ].filter(Boolean),
    dominantDigits,
    sameDayThreeWeeksAgoAvailable,
    sourceRule: {
      main: [
        'sameDayLastWeekOriginal',
        'sameDayTwoWeeksAgoOriginal',
        'sameDayThreeWeeksAgoOriginal',
      ],
      support: [
        'sameDayThreeWeeksAgoMistikBaru',
        'sameDayTwoWeeksAgoMistikBaru',
        'sameDayLastWeekMistikBaru',
      ],
    },
  }
}

function buildMondayDayV1Pools({ context, ranked, dominantDigits, weighted }) {
  const main = []
  const support = []
  const reserve = []
  const lastWeekDigits = uniqueDigits(context.sameDayLastWeekOriginal)
  const twoWeeksDigits = uniqueDigits(context.sameDayTwoWeeksAgoOriginal)
  const threeWeeksDigits = uniqueDigits(context.sameDayThreeWeeksAgoOriginal)
  const threeWeeksMbDigits = uniqueDigits(context.sameDayThreeWeeksAgoMistikBaru)
  const twoWeeksMbDigits = uniqueDigits(context.sameDayTwoWeeksAgoMistikBaru)
  const lastWeekMbDigits = uniqueDigits(context.sameDayLastWeekMistikBaru)
  const lagDigits = sourceDigits([
    context.sameDayTwoWeeksAgoOriginal,
    context.sameDayThreeWeeksAgoOriginal,
  ])
  const repeatedTwoWeeksDigits = twoWeeksDigits.filter((digit) => {
    return hasRepeatedDigit(context.sameDayTwoWeeksAgoOriginal, digit)
  })
  const repeatedThreeMbDigits = threeWeeksMbDigits.filter((digit) => {
    return hasRepeatedDigit(context.sameDayThreeWeeksAgoMistikBaru, digit)
  })
  const threeWeeksMbOverlap = [
    ...intersection(repeatedThreeMbDigits, threeWeeksDigits),
    ...intersection(threeWeeksDigits, threeWeeksMbDigits),
  ]
  const lagPriority = [
    ...repeatedTwoWeeksDigits,
    ...twoWeeksDigits.filter((digit) => !repeatedTwoWeeksDigits.includes(digit)),
    ...threeWeeksDigits,
  ]
  const previousOnlyDigits = uniqueDigits(context.previousDayOriginal).filter((digit) => {
    return !sourceDigits([
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayThreeWeeksAgoOriginal,
      context.sameDayLastWeekMistikBaru,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayThreeWeeksAgoMistikBaru,
      context.sameDayLastWeekMistikLama,
      context.sameDayTwoWeeksAgoMistikLama,
      context.sameDayThreeWeeksAgoMistikLama,
    ]).includes(digit)
  })
  const dominantOnlyDigits = dominantDigits.filter((digit) => {
    return !sourceDigits([
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayThreeWeeksAgoOriginal,
      context.previousDayOriginal,
      context.sameDayLastWeekMistikBaru,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayThreeWeeksAgoMistikBaru,
      context.sameDayLastWeekMistikLama,
      context.sameDayTwoWeeksAgoMistikLama,
      context.sameDayThreeWeeksAgoMistikLama,
    ]).includes(digit)
  })

  pushDigits(
    main,
    orderedByRank(intersection(twoWeeksDigits, threeWeeksDigits), ranked),
    4,
  )
  pushDigits(main, [...new Set(threeWeeksMbOverlap)], 4)
  pushDigits(main, [...new Set(lagPriority)], 4)
  pushDigits(
    main,
    orderedByRank(intersection(lastWeekDigits, twoWeeksDigits), ranked),
    4,
  )

  const mainSet = new Set(main)
  pushAvailableDigits(support, orderByScore(threeWeeksMbDigits, weighted), 4, main)
  pushAvailableDigits(support, orderByScore(twoWeeksMbDigits, weighted), 4, main)
  pushAvailableDigits(support, orderByScore(lastWeekMbDigits, weighted), 4, main)
  pushAvailableDigits(
    support,
    orderByScore(
      uniqueDigits(context.previousDayOriginal).filter((digit) => {
        return !mainSet.has(digit) && sourceDigits([
          context.sameDayLastWeekOriginal,
          context.sameDayTwoWeeksAgoOriginal,
          context.sameDayThreeWeeksAgoOriginal,
          context.sameDayLastWeekMistikBaru,
          context.sameDayTwoWeeksAgoMistikBaru,
          context.sameDayThreeWeeksAgoMistikBaru,
        ]).includes(digit)
      }),
      weighted,
    ),
    4,
    main,
  )
  pushAvailableDigits(support, ranked, 4, main)

  const selected = [...main, ...support]
  const mlOnlyDigits = sourceDigits([
    context.sameDayLastWeekMistikLama,
    context.sameDayTwoWeeksAgoMistikLama,
    context.sameDayThreeWeeksAgoMistikLama,
  ]).filter((digit) => {
    return !sourceDigits([
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayThreeWeeksAgoOriginal,
      context.sameDayLastWeekMistikBaru,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayThreeWeeksAgoMistikBaru,
    ]).includes(digit)
  })

  pushAvailableDigits(reserve, previousOnlyDigits, 6, selected)
  pushAvailableDigits(reserve, dominantOnlyDigits, 6, selected)
  pushAvailableDigits(reserve, mlOnlyDigits, 6, selected)
  pushAvailableDigits(reserve, ranked, 6, selected)

  return {
    main,
    support: support.slice(0, 4),
    reserve: reserve.slice(0, 6),
  }
}

function mondayBridgeDigits(context, weighted) {
  const twoWeeksDigits = uniqueDigits(context.sameDayTwoWeeksAgoOriginal)
  const threeWeeksDigits = uniqueDigits(context.sameDayThreeWeeksAgoOriginal)
  const threeWeeksMbDigits = uniqueDigits(context.sameDayThreeWeeksAgoMistikBaru)
  const repeatedTwoWeeksDigits = twoWeeksDigits.filter((digit) => {
    return hasRepeatedDigit(context.sameDayTwoWeeksAgoOriginal, digit)
  })
  const repeatedThreeMbDigits = threeWeeksMbDigits.filter((digit) => {
    return hasRepeatedDigit(context.sameDayThreeWeeksAgoMistikBaru, digit)
  })
  const bridgeOverlap = intersection(threeWeeksDigits, threeWeeksMbDigits)
  const lagA = repeatedTwoWeeksDigits[0] || twoWeeksDigits[0]
  const bridge = intersection(repeatedThreeMbDigits, threeWeeksDigits)[0]
    || bridgeOverlap[0]
    || threeWeeksMbDigits[0]
  const lagB = twoWeeksDigits.find((digit) => digit !== lagA)
  const bridgeB = bridgeOverlap.find((digit) => digit !== bridge)
    || threeWeeksDigits.find((digit) => digit !== bridge)

  return { lagA, lagB, bridge, bridgeB }
}

function pushPairTemplate(result, template, limit) {
  const value = template.filter(Boolean).join('')
  if (value.length === 2 && template[0] !== template[1]) {
    uniquePush(result, value, limit)
  }
}

function buildMondayDayV1Pairs({ context, main, support, weighted, limit }) {
  const result = []
  const twoWeeksDigits = uniqueDigits(context.sameDayTwoWeeksAgoOriginal)
  const threeWeeksDigits = uniqueDigits(context.sameDayThreeWeeksAgoOriginal)
  const threeWeeksMbDigits = uniqueDigits(context.sameDayThreeWeeksAgoMistikBaru)
  const lastWeekDigits = uniqueDigits(context.sameDayLastWeekOriginal)
  const { lagA, lagB, bridge, bridgeB } = mondayBridgeDigits(context, weighted)
  const bridgePairs = [
    [lagA, bridge],
    [bridge, lagA],
    [lagA, lagB],
    [lagB, lagA],
    [bridge, lagB],
    [lagB, bridge],
    [bridge, bridgeB],
    [bridgeB, bridge],
  ]

  bridgePairs.forEach((template) => pushPairTemplate(result, template, limit))
  pushDigits(result, sourceAdjacentPairs(context.sameDayTwoWeeksAgoOriginal, 12), limit)
  pushDigits(result, sourceAdjacentPairs(context.sameDayThreeWeeksAgoOriginal, 12), limit)
  pushDigits(result, sourceAdjacentPairs(context.sameDayThreeWeeksAgoMistikBaru, 12), limit)
  pushDigits(result, crossPairs(twoWeeksDigits, threeWeeksMbDigits, 24), limit)
  pushDigits(result, crossPairs(threeWeeksMbDigits, twoWeeksDigits, 24), limit)
  pushDigits(result, crossPairs(lastWeekDigits, [...main, ...support], 24), limit)
  pushDigits(result, generatePairs([...main, ...support], 24), limit)

  return result
}

function mondayRawSourceSet(context) {
  return new Set([
    context.sameDayLastWeekOriginal,
    context.sameDayTwoWeeksAgoOriginal,
    context.sameDayThreeWeeksAgoOriginal,
    context.sameDayLastWeekMistikLama,
    context.sameDayLastWeekMistikBaru,
    context.sameDayTwoWeeksAgoMistikLama,
    context.sameDayTwoWeeksAgoMistikBaru,
    context.sameDayThreeWeeksAgoMistikLama,
    context.sameDayThreeWeeksAgoMistikBaru,
    context.previousDayOriginal,
    context.previousDayMistikBaru,
  ].filter(Boolean))
}

function pushMondayCandidate(result, context, template, limit) {
  const value = template.filter(Boolean).join('')
  if (value.length === 4 && !mondayRawSourceSet(context).has(value)) {
    uniquePush(result, value, limit)
  }
}

function generateMondayDayCandidates({ context, weighted, main, support, front2d, back2d }) {
  const result = []
  const { lagA, lagB, bridge, bridgeB } = mondayBridgeDigits(context, weighted)
  const lastWeekDigits = orderByScore(uniqueDigits(context.sameDayLastWeekOriginal), weighted)
  const residue = orderByScore([...main, ...support], weighted)
    .find((digit) => ![lagA, lagB, bridge, bridgeB].includes(digit))
  const lagMemory = [
    [lagA, bridge, lagB, bridge],
    [lagA, lagB, bridge, bridge],
    [bridge, lagA, lagB, bridge],
  ]
  const crossLag = [
    [lagA, bridge, bridgeB, bridge],
    [lagA, lagB, bridgeB, bridge],
    [bridge, lagB, lagA, bridge],
  ]
  const anchor = [
    [lagB, bridge, lagA, bridge],
    [lagA, bridgeB, bridge, lagB],
  ]
  const correction = [
    [lastWeekDigits[0], bridge, lagB, bridge],
    [lagA, bridge, residue, lagB],
    [...String(front2d[0] || '').split(''), ...String(back2d[0] || '').split('')],
  ]

  lagMemory.forEach((template) => pushMondayCandidate(result, context, template, 8))
  crossLag.forEach((template) => pushMondayCandidate(result, context, template, 8))
  pushMondayCandidate(result, context, anchor[0], 8)
  pushMondayCandidate(result, context, anchor[1], 8)

  for (const template of [...anchor, ...correction]) {
    pushMondayCandidate(result, context, template, 8)
  }

  return result
}

function buildMondayDayV1(context) {
  const dominantDigits = getDayDominantDigits(context.targetDay)
  const sameDayThreeWeeksAgoAvailable = Boolean(context.sameDayThreeWeeksAgoOriginal)
  const weighted = scoreMondayDayV1(context, dominantDigits)
  const dominantOnlyDigits = dominantDigits.filter((digit) => {
    return ![
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.sameDayThreeWeeksAgoOriginal,
      context.previousDayOriginal,
      context.sameDayLastWeekMistikLama,
      context.sameDayLastWeekMistikBaru,
      context.sameDayTwoWeeksAgoMistikLama,
      context.sameDayTwoWeeksAgoMistikBaru,
      context.sameDayThreeWeeksAgoMistikLama,
      context.sameDayThreeWeeksAgoMistikBaru,
      context.previousDayMistikBaru,
    ].some((source) => hasDigit(source, digit))
  })
  const preferredDigits = [
    ...uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    ...uniqueDigits(context.sameDayThreeWeeksAgoOriginal),
    ...uniqueDigits(context.sameDayThreeWeeksAgoMistikBaru),
    ...uniqueDigits(context.sameDayTwoWeeksAgoMistikBaru),
    ...uniqueDigits(context.sameDayLastWeekOriginal),
    ...dominantDigits,
  ]
  const ranked = sortWeightedDigits(weighted, preferredDigits)
    .filter((digit) => !dominantOnlyDigits.includes(digit))
    .concat(dominantOnlyDigits)
  const { main, support, reserve } = buildMondayDayV1Pools({
    context,
    ranked,
    dominantDigits,
    weighted,
  })
  const front2d = buildMondayDayV1Pairs({
    context,
    main,
    support,
    weighted,
    limit: 20,
  })
  const back2d = buildMondayDayV1Pairs({
    context,
    main,
    support,
    weighted,
    limit: 20,
  })
  const notes = [
    'Senin Day V1 memakai lag memory 2-3 minggu. sameDayTwoWeeksAgo, sameDayThreeWeeksAgo, dan Mistik Baru sameDayThreeWeeksAgo diberi bobot tinggi. sameDayLastWeek hanya anchor, bukan kandidat mentah.',
  ]

  if (sameDayThreeWeeksAgoAvailable) {
    notes.push('sameDayThreeWeeksAgo digunakan sebagai correction kuat.')
  } else {
    notes.push('sameDayThreeWeeksAgo not available')
  }

  return {
    input: buildMondayInput(context, dominantDigits, sameDayThreeWeeksAgoAvailable),
    digitPool: {
      main,
      support,
      reserve,
      weighted,
    },
    front2d,
    back2d,
    candidates4d: generateMondayDayCandidates({
      context,
      weighted,
      main,
      support,
      front2d,
      back2d,
    }),
    notes,
  }
}

export function generateDayCandidates({
  ranked,
  dominantDigits,
  selectedMainSource,
  selectedSupportSource,
  front2d,
  back2d,
  sameDayLastWeekOriginal,
  sameDayTwoWeeksAgoOriginal,
  support = [],
}) {
  const result = []
  const top = [...new Set([...ranked, ...dominantDigits])].slice(0, 8)
  const mainDigits = digitsOf(selectedMainSource)
  const supportDigits = digitsOf(selectedSupportSource)
  const weeklyDigits = digitsOf(sameDayLastWeekOriginal)
  const memoryDigits = digitsOf(sameDayTwoWeeksAgoOriginal)
  const templates = [
    [...String(front2d[0] || '').split(''), ...String(back2d[0] || '').split('')],
    [...String(front2d[0] || '').split(''), ...String(back2d[1] || '').split('')],
    [...String(front2d[1] || '').split(''), ...String(back2d[0] || '').split('')],
    [weeklyDigits[0], weeklyDigits[1], support[0], support[1]],
    [weeklyDigits[0], weeklyDigits[1], support[1], support[0]],
    [weeklyDigits[0], weeklyDigits[1], weeklyDigits[2], support[0]],
    [memoryDigits[0], memoryDigits[1], memoryDigits[2], support[0]],
    [weeklyDigits[0], weeklyDigits[1], weeklyDigits[2], weeklyDigits[3]],
    [top[0], top[1], top[2], top[3]],
    [top[0], top[2], top[1], top[3]],
    [top[1], top[0], top[3], top[2]],
    [top[0], top[3], top[1], top[4]],
    [mainDigits[0], top[0], mainDigits[2], top[1]],
    [supportDigits[0], top[0], supportDigits[2], top[2]],
    [top[2], top[0], top[4], top[1]],
    [top[1], top[3], top[0], top[2]],
  ]

  for (const template of templates) {
    const value = template.filter(Boolean).join('')
    if (value.length === 4) {
      uniquePush(result, value, 8)
    }
  }

  let index = 0
  while (result.length < 8 && top.length >= 4 && index < top.length * top.length) {
    uniquePush(
      result,
      [
        top[index % top.length],
        top[(index + 2) % top.length],
        top[(index + 1) % top.length],
        top[(index + 4) % top.length],
      ].join(''),
      8,
    )
    index += 1
  }

  return result
}

function buildInput(context, rule, selectedMainSource, selectedSupportSource, activeMistikSource, dominantDigits) {
  return {
    previousDayResult: context.previousDayOriginal,
    sameDayLastWeekResult: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoResult: context.sameDayTwoWeeksAgoOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    selectedMainSource,
    selectedSupportSource,
    activeMistikSource,
    dominantDigits,
    sourceRule: rule,
  }
}

export function runDayV1(context) {
  const dayKey = normalizeDayName(context.targetDay)
  const rule = DAY_V1_RULES[dayKey]

  if (!rule) {
    const error = new Error('targetDay is not supported for day_v1')
    error.statusCode = 400
    throw error
  }

  const dominantDigits = getDayDominantDigits(context.targetDay)

  if (dayKey === 'senin' && context.session === 'day') {
    return buildMondayDayV1(context)
  }

  if (dayKey === 'jumat') {
    return buildFridayDayV1(context)
  }

  const selectedMainSource = dayKey === 'selasa'
    ? context.sameDayLastWeekOriginal
    : context[rule.main]
  const selectedSupportSource = dayKey === 'selasa'
    ? context.sameDayTwoWeeksAgoOriginal
    : context[rule.support]
  const activeMistikSource = rule.active.map((key) => context[key]).filter(Boolean)
  const correctionSource = [
    context.sameDayLastWeekMistikLama,
    context.sameDayLastWeekMistikBaru,
    context.previousDayMistikLama,
    context.previousDayMistikBaru,
  ].filter(Boolean)
  const weighted = {}
  const dominantSet = new Set(dominantDigits)
  const weeklyMistikLamaDigits = uniqueDigits(context.sameDayLastWeekMistikLama)
  const correctionDigits = sourceDigits(correctionSource)

  scoreDigits(weighted, context.sameDayLastWeekOriginal, 40, 10)
  scoreDigits(weighted, context.sameDayTwoWeeksAgoOriginal, 25, 8)
  scoreDigits(weighted, context.previousDayOriginal, 15, 5)
  dominantDigits.forEach((digit) => addScore(weighted, digit, 10))
  scoreDigits(weighted, context.sameDayLastWeekMistikLama, 20, 10)
  scoreDigits(weighted, context.sameDayLastWeekMistikBaru, 10)
  activeMistikSource.forEach((source) => scoreDigits(weighted, source, 10))
  scoreCrossRepeats(weighted, context.sameDayLastWeekOriginal, context.sameDayTwoWeeksAgoOriginal, 15)

  for (const digit of dominantDigits) {
    if (weeklyMistikLamaDigits.includes(digit)) {
      addScore(weighted, digit, 15)
    }

    if (correctionDigits.includes(digit)) {
      addScore(weighted, digit, 10)
    }

    if (digitsOf(context.previousDayOriginal).includes(digit)) {
      addScore(weighted, digit, 8)
    }
  }

  const dominantOnlyDigits = dominantDigits.filter((digit) => {
    const supportedByOtherSource = [
      context.sameDayLastWeekOriginal,
      context.sameDayTwoWeeksAgoOriginal,
      context.previousDayOriginal,
      ...correctionSource,
    ].some((source) => digitsOf(source).includes(digit))

    return dominantSet.has(digit) && !supportedByOtherSource
  })
  const preferredDigits = [
    ...uniqueDigits(context.sameDayLastWeekOriginal),
    ...uniqueDigits(context.sameDayTwoWeeksAgoOriginal),
    ...weeklyMistikLamaDigits,
    ...dominantDigits,
    ...uniqueDigits(context.previousDayOriginal),
  ]
  const ranked = sortWeightedDigits(weighted, preferredDigits)
    .filter((digit) => !dominantOnlyDigits.includes(digit))
    .concat(dominantOnlyDigits)
  const { main, support, reserve } = buildDayV1Pools({
    ranked,
    dominantDigits,
    sameDayLastWeekOriginal: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
    previousDayOriginal: context.previousDayOriginal,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    correctionSource,
  })
  const front2d = buildDayV1Front2d({
    ranked,
    main,
    sameDayLastWeekOriginal: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
  })
  const back2d = buildDayV1Back2d({
    dayKey,
    ranked,
    main,
    support,
    dominantDigits,
    sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    correctionSource,
  })

  return {
    input: buildInput(
      context,
      rule,
      selectedMainSource,
      selectedSupportSource,
      activeMistikSource,
      dominantDigits,
    ),
    digitPool: {
      main,
      support,
      reserve,
      weighted,
    },
    front2d,
    back2d,
    candidates4d: generateDayCandidates({
      ranked,
      dominantDigits,
      selectedMainSource,
      selectedSupportSource,
      front2d,
      back2d,
      sameDayLastWeekOriginal: context.sameDayLastWeekOriginal,
      sameDayTwoWeeksAgoOriginal: context.sameDayTwoWeeksAgoOriginal,
      support,
    }),
    notes: [
      'day_v1 uses weekly original as main direction and dominant digits as day-character filter',
      'sameDayTwoWeeksAgo is used as memory source',
      'mistik is used as correction layer without overpowering weekly original',
      `main source: ${dayKey === 'selasa' ? 'sameDayLastWeekOriginal' : rule.main}`,
      `support source: ${dayKey === 'selasa' ? 'sameDayTwoWeeksAgoOriginal' : rule.support}`,
      ...(dayKey === 'selasa'
        ? [
            'Target Selasa Day: sameDayLastWeek original menjadi main source, sameDayTwoWeeksAgo menjadi memory source, dan Mistik Lama sameDayLastWeek menjadi correction source.',
          ]
        : []),
      ...(dayKey === 'jumat'
        ? [
            'Target Jumat Day: sameDayTwoWeeksAgo dan digit dominan Jumat dinaikkan karena backtest menunjukkan digit bisa muncul dari Jumat dua minggu lalu.',
          ]
        : []),
    ],
  }
}
