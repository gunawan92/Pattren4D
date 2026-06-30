import { getNightDominantDigits } from './night-v1.js'

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
  if (digit) {
    weighted[digit] = (weighted[digit] || 0) + score
  }
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

function generatePairs(digits, limit) {
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

function generateV2Candidates(ranked, dominantDigits) {
  const result = []
  const preferred = [...new Set([...ranked.slice(0, 5), ...dominantDigits])]
  const topA = preferred[0]
  const topB = preferred[1]
  const topC = preferred[2]
  const dominantA = dominantDigits.find((digit) => digit !== topA && digit !== topB) || preferred[3]
  const dominantB = dominantDigits.find((digit) => {
    return digit !== topA && digit !== topB && digit !== dominantA
  }) || preferred[4]
  const templates = [
    [topA, dominantA, topB, dominantB],
    [topA, topB, dominantA, dominantB],
    [topA, dominantB, dominantA, topB],
    [topA, topC, topB, dominantB],
    [dominantA, topB, topA, dominantB],
    [topA, topB, dominantB, dominantA],
    [topA, dominantB, topC, topB],
    [dominantA, topB, topC, dominantB],
  ]

  for (const template of templates) {
    const value = template.filter(Boolean).join('')
    if (value.length === 4) {
      uniquePush(result, value, 8)
    }
  }

  let index = 0
  while (result.length < 8 && preferred.length >= 4 && index < preferred.length * preferred.length) {
    uniquePush(
      result,
      [
        preferred[index % preferred.length],
        preferred[(index + 2) % preferred.length],
        preferred[(index + 1) % preferred.length],
        preferred[(index + 4) % preferred.length],
      ].join(''),
      8,
    )
    index += 1
  }

  return result
}

function hasDigit(source, digit) {
  return uniqueDigits(source).includes(digit)
}

function pushDigit(result, digit, limit) {
  if (digit && result.length < limit && !result.includes(digit)) {
    result.push(digit)
  }
}

function pushDigits(result, digits, limit) {
  for (const digit of digits) {
    pushDigit(result, digit, limit)
  }
}

function sortDigitsByWeight(digits, weighted, preferred = []) {
  const preferredRank = new Map(preferred.map((digit, index) => [digit, index]))

  return [...new Set(digits)].sort((a, b) => {
    const diff = (weighted[b] || 0) - (weighted[a] || 0)
    if (diff !== 0) {
      return diff
    }

    const aRank = preferredRank.has(a) ? preferredRank.get(a) : 99
    const bRank = preferredRank.has(b) ? preferredRank.get(b) : 99
    if (aRank !== bRank) {
      return aRank - bRank
    }

    return Number(a) - Number(b)
  })
}

function intersection(first, second) {
  const secondSet = new Set(second)
  return first.filter((digit) => secondSet.has(digit))
}

function engineSources(context) {
  return [
    context.previousDayOriginal,
    context.sameDayLastWeekOriginal,
    context.previousDayMistikBaru,
    context.sameDayLastWeekMistikLama,
    context.sameDayLastWeekMistikBaru,
  ]
}

function isEngineDigit(context, digit) {
  return engineSources(context).some((source) => hasDigit(source, digit))
}

function buildThursdayNightInput(context, activeMistikSources) {
  return {
    previousDayResult: context.previousDayOriginal,
    sameDayLastWeekResult: context.sameDayLastWeekOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    naturalDigits: context.naturalDigits || [],
    naturalLabel: context.naturalLabel || null,
    activeMistikSources,
  }
}

function buildThursdayNightPool({
  context,
  weighted,
  ranked,
  dominantDigits,
  naturalDigits,
}) {
  const previousMistikBaru = uniqueDigits(context.previousDayMistikBaru)
  const sameMistikLama = uniqueDigits(context.sameDayLastWeekMistikLama)
  const sameMistikBaru = uniqueDigits(context.sameDayLastWeekMistikBaru)
  const sameOriginal = uniqueDigits(context.sameDayLastWeekOriginal)
  const previousOriginal = uniqueDigits(context.previousDayOriginal)
  const sameCorrection = [...new Set([...sameMistikLama, ...sameMistikBaru])]
  const correctionOverlap = sortDigitsByWeight(
    intersection(previousMistikBaru, sameCorrection),
    weighted,
    previousMistikBaru,
  )
  const originalDominant = sortDigitsByWeight(
    intersection(sameOriginal, dominantDigits),
    weighted,
    sameOriginal,
  )
  const correctionRanked = sortDigitsByWeight(
    [...previousMistikBaru, ...sameCorrection],
    weighted,
    [...previousMistikBaru, ...sameMistikLama, ...sameMistikBaru],
  )
  const naturalEngine = naturalDigits.filter((digit) => isEngineDigit(context, digit))
  const main = []
  const support = []
  const reserve = []

  pushDigits(main, correctionOverlap, 3)
  pushDigits(main, originalDominant, 3)
  pushDigits(main, correctionRanked, 3)

  const promoteToSupport = [
    ...previousMistikBaru,
    ...sameCorrection,
    ...naturalEngine,
    ...dominantDigits.filter((digit) => {
      return isEngineDigit(context, digit) && !main.includes(digit)
    }),
    ...ranked,
  ].filter((digit) => !main.includes(digit))
  pushDigits(support, promoteToSupport, 4)

  const naturalOnly = naturalDigits.filter((digit) => !isEngineDigit(context, digit))
  const unsupportedDominant = dominantDigits.filter((digit) => {
    return !main.includes(digit) && !support.includes(digit) && !isEngineDigit(context, digit)
  })
  const weakOriginal = [...previousOriginal, ...sameOriginal].filter((digit) => {
    return !main.includes(digit) && !support.includes(digit)
  })

  pushDigits(reserve, naturalOnly, 10)
  pushDigits(reserve, unsupportedDominant, 10)
  pushDigits(reserve, weakOriginal, 10)
  pushDigits(
    reserve,
    ranked.filter((digit) => !main.includes(digit) && !support.includes(digit)),
    10,
  )

  return { main, support, reserve }
}

function pushCrossPairs(result, firstDigits, secondDigits, limit) {
  for (const first of firstDigits) {
    for (const second of secondDigits) {
      if (first !== second) {
        uniquePush(result, `${first}${second}`, limit)
      }
    }
  }
}

function generateThursdayPairs({
  context,
  main,
  support,
  dominantDigits,
  weighted,
  limit,
}) {
  const result = []
  const previousMistikBaru = uniqueDigits(context.previousDayMistikBaru)
  const sameMistikLama = uniqueDigits(context.sameDayLastWeekMistikLama)
  const sameMistikBaru = uniqueDigits(context.sameDayLastWeekMistikBaru)
  const sameOriginal = uniqueDigits(context.sameDayLastWeekOriginal)
  const preferredCorrection = sortDigitsByWeight(
    [...previousMistikBaru, ...sameMistikLama, ...sameMistikBaru],
    weighted,
    [...previousMistikBaru, ...sameMistikLama, ...sameMistikBaru],
  )
  const preferredAnchors = sortDigitsByWeight(
    [...sameOriginal, ...dominantDigits],
    weighted,
    [...sameOriginal, ...dominantDigits],
  )
  const sameWeekOverlap = intersection(sameMistikLama, sameMistikBaru)
  const anchor = sortDigitsByWeight(
    intersection(sameOriginal, dominantDigits),
    weighted,
    sameOriginal,
  )[0] || sameOriginal[0]
  const previousTail = [...previousMistikBaru]
    .reverse()
    .find((digit) => digit !== anchor && preferredCorrection.some((sameDigit) => sameDigit !== digit))
  const sameA = sameWeekOverlap[0] || preferredCorrection[0]
  const sameB = sameWeekOverlap.find((digit) => digit !== sameA) || preferredCorrection[1]

  const bridgePairs = [
    [anchor, previousTail],
    [previousTail, anchor],
    [anchor, sameA],
    [sameA, anchor],
    [sameB, sameA],
    [sameA, sameB],
    [previousTail, sameA],
    [sameA, previousTail],
    [previousTail, sameB],
    [sameB, previousTail],
  ]

  bridgePairs.forEach((pair) => {
    const value = pair.filter(Boolean).join('')
    if (value.length === 2 && pair[0] !== pair[1]) {
      uniquePush(result, value, limit)
    }
  })

  pushCrossPairs(result, preferredAnchors, preferredCorrection, limit)
  pushCrossPairs(result, preferredCorrection, preferredAnchors, limit)
  pushCrossPairs(result, previousMistikBaru, sameMistikLama, limit)
  pushCrossPairs(result, sameMistikLama, previousMistikBaru, limit)
  pushCrossPairs(result, previousMistikBaru, sameMistikBaru, limit)
  pushCrossPairs(result, sameMistikBaru, previousMistikBaru, limit)
  pushCrossPairs(result, main, support, limit)
  pushCrossPairs(result, support, main, limit)

  return result
}

function pushCandidate(result, template, limit) {
  const value = template.filter(Boolean).join('')
  if (value.length === 4) {
    uniquePush(result, value, limit)
  }
}

function generateThursdayCandidates({ context, weighted, dominantDigits, naturalDigits }) {
  const result = []
  const previousMistikBaru = uniqueDigits(context.previousDayMistikBaru)
  const sameMistikLama = uniqueDigits(context.sameDayLastWeekMistikLama)
  const sameMistikBaru = uniqueDigits(context.sameDayLastWeekMistikBaru)
  const sameOriginal = uniqueDigits(context.sameDayLastWeekOriginal)
  const sameCorrection = [...new Set([...sameMistikLama, ...sameMistikBaru])]
  const sameWeekOverlap = intersection(sameMistikLama, sameMistikBaru)
  const anchor = sortDigitsByWeight(
    intersection(sameOriginal, dominantDigits),
    weighted,
    sameOriginal,
  )[0] || sameOriginal[0]
  const previousTail = [...previousMistikBaru]
    .reverse()
    .find((digit) => digit !== anchor && sameCorrection.some((sameDigit) => sameDigit !== digit))
  const sameA = sameWeekOverlap[0] || sameCorrection[0]
  const sameB = sameWeekOverlap.find((digit) => digit !== sameA) || sameCorrection[1]
  const naturalEngine = naturalDigits.find((digit) => isEngineDigit(context, digit))

  const correctionCross = [
    [anchor, previousTail, sameB, sameA],
    [anchor, previousTail, sameA, sameB],
    [previousTail, anchor, sameB, sameA],
    [previousTail, sameB, sameA, anchor],
  ]
  const sameWeekCorrection = [
    [anchor, sameA, sameB, previousTail],
    [previousTail, sameA, sameB, sameA],
    [sameB, sameA, anchor, previousTail],
  ]
  const originalAnchor = [
    [sameA, previousTail, sameB, anchor],
    [anchor, sameA, previousTail, sameB],
    [sameOriginal[0], previousMistikBaru[0], sameB, sameA],
  ]
  const naturalReserve = [
    [anchor, previousTail, naturalEngine, sameA],
    [naturalEngine, anchor, sameB, sameA],
  ]

  correctionCross.slice(0, 3).forEach((template) => pushCandidate(result, template, 8))
  sameWeekCorrection.slice(0, 2).forEach((template) => pushCandidate(result, template, 8))
  originalAnchor.slice(0, 2).forEach((template) => pushCandidate(result, template, 8))

  if (naturalEngine) {
    naturalReserve.forEach((template) => pushCandidate(result, template, 8))
  }

  for (const template of [...correctionCross, ...sameWeekCorrection, ...originalAnchor]) {
    pushCandidate(result, template, 8)
  }

  return result
}

function buildThursdayNightV2(context) {
  const dominantDigits = getNightDominantDigits(context.targetDay)
  const naturalDigits = [...new Set((context.naturalDigits || []).flatMap(digitsOf))]
  const weighted = {}
  const activeMistikSources = [
    context.previousDayMistikBaru,
    context.sameDayLastWeekMistikLama,
    context.sameDayLastWeekMistikBaru,
  ].filter(Boolean)

  scoreDigits(weighted, context.previousDayOriginal, 25, 8)
  scoreDigits(weighted, context.sameDayLastWeekOriginal, 25, 8)
  scoreDigits(weighted, context.previousDayMistikBaru, 28, 10)
  scoreDigits(weighted, context.sameDayLastWeekMistikLama, 25, 8)
  scoreDigits(weighted, context.sameDayLastWeekMistikBaru, 18, 6)
  dominantDigits.forEach((digit) => addScore(weighted, digit, 12))
  naturalDigits.forEach((digit) => addScore(weighted, digit, 6))

  for (const digit of uniqueDigits(context.previousDayMistikBaru)) {
    if (hasDigit(context.sameDayLastWeekMistikLama, digit)) {
      addScore(weighted, digit, 18)
    }

    if (hasDigit(context.sameDayLastWeekMistikBaru, digit)) {
      addScore(weighted, digit, 15)
    }
  }

  for (const digit of uniqueDigits(context.sameDayLastWeekOriginal)) {
    if (dominantDigits.includes(digit)) {
      addScore(weighted, digit, 12)
    }
  }

  for (const digit of [
    ...uniqueDigits(context.sameDayLastWeekMistikLama),
    ...uniqueDigits(context.sameDayLastWeekMistikBaru),
  ]) {
    if (dominantDigits.includes(digit)) {
      addScore(weighted, digit, 10)
    }
  }

  naturalDigits.forEach((digit) => {
    if (isEngineDigit(context, digit)) {
      addScore(weighted, digit, 8)
    }
  })

  const ranked = sortWeightedDigits(weighted, [
    ...uniqueDigits(context.previousDayMistikBaru),
    ...uniqueDigits(context.sameDayLastWeekMistikLama),
    ...uniqueDigits(context.sameDayLastWeekMistikBaru),
    ...uniqueDigits(context.sameDayLastWeekOriginal),
    ...dominantDigits,
  ])
  const { main, support, reserve } = buildThursdayNightPool({
    context,
    weighted,
    ranked,
    dominantDigits,
    naturalDigits,
  })

  const notes = [
    'Kamis Night V2 memakai original source + mistik silang. Mistik Baru Rabu dan Mistik Kamis minggu lalu dipakai sebagai correction utama. Kode alam hanya booster kecil, bukan penentu utama.',
  ]

  if (naturalDigits.length) {
    notes.push(
      'Kode alam digunakan sebagai booster/reserve. Digit alam hanya naik jika juga muncul di sumber engine.',
    )
  }

  return {
    input: buildThursdayNightInput(context, activeMistikSources),
    digitPool: {
      main,
      support,
      reserve,
      weighted,
    },
    front2d: generateThursdayPairs({
      context,
      main,
      support,
      dominantDigits,
      weighted,
      limit: 20,
    }),
    back2d: generateThursdayPairs({
      context,
      main,
      support,
      dominantDigits,
      weighted,
      limit: 24,
    }),
    candidates4d: generateThursdayCandidates({
      context,
      weighted,
      dominantDigits,
      naturalDigits,
    }),
    notes,
  }
}

export function runNightV2(context) {
  if (normalizeDay(context.targetDay) === 'kamis') {
    return buildThursdayNightV2(context)
  }

  const dominantDigits = getNightDominantDigits(context.targetDay)
  const weighted = {}
  const activeMistikSources = [
    context.previousDayMistikBaru,
    context.sameDayLastWeekMistikLama,
  ].filter(Boolean)

  scoreDigits(weighted, context.previousDayOriginal, 40, 10)
  scoreDigits(weighted, context.sameDayLastWeekOriginal, 30, 10)
  dominantDigits.forEach((digit) => addScore(weighted, digit, 20))
  activeMistikSources.forEach((source) => scoreDigits(weighted, source, 10))

  const ranked = sortWeightedDigits(weighted, [
    ...uniqueDigits(context.previousDayOriginal),
    ...dominantDigits,
    ...uniqueDigits(context.sameDayLastWeekOriginal),
  ])
  const main = ranked.slice(0, 3)
  const support = ranked.slice(3, 5)
  const reserve = dominantDigits.filter((digit) => !main.includes(digit) && !support.includes(digit))

  return {
    input: {
      previousDayResult: context.previousDayOriginal,
      sameDayLastWeekResult: context.sameDayLastWeekOriginal,
      previousDayMistikLama: context.previousDayMistikLama,
      previousDayMistikBaru: context.previousDayMistikBaru,
      sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
      sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
      activeMistikSources,
    },
    digitPool: {
      main,
      support,
      reserve,
      weighted,
    },
    front2d: generatePairs(ranked.slice(0, 4), 12),
    back2d: generatePairs([...ranked.slice(0, 5), ...dominantDigits], 16),
    candidates4d: generateV2Candidates(ranked, dominantDigits),
    notes: [
      'night_v2 raises original results and target-day dominant digits',
      'active mistik source has reduced weight',
    ],
  }
}
