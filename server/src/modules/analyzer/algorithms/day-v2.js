import {
  addScore,
  buildReserve,
  buildReserveFromSources,
  capFridaySecondaryNoise,
  generateDayCandidates,
  generatePairs,
  getDayDominantDigits,
  normalizeDayName,
  scoreCrossRepeats,
  scoreDigits,
  sortWeightedDigits,
  uniqueDigits,
} from './day-v1.js'

const DAY_V2_ACTIVE_RULES = {
  senin: {
    active: ['sameDayLastWeekMistikBaru', 'previousDayMistikBaru'],
    bonus: [],
  },
  selasa: {
    active: ['previousDayMistikLama'],
    bonus: [],
  },
  rabu: {
    active: ['previousDayMistikLama'],
    bonus: [],
  },
  kamis: {
    active: ['sameDayLastWeekMistikBaru'],
    bonus: [],
  },
  jumat: {
    active: ['previousDayMistikLama'],
    bonus: [],
  },
  sabtu: {
    active: ['sameDayLastWeekMistikLama', 'previousDayMistikBaru'],
    bonus: ['sameDayLastWeekMistikLama'],
  },
  minggu: {
    active: ['sameDayLastWeekMistikBaru', 'previousDayMistikLama'],
    bonus: ['sameDayLastWeekMistikBaru'],
  },
}

function buildInput(context, activeMistikSource, dominantDigits) {
  return {
    previousDayResult: context.previousDayOriginal,
    sameDayLastWeekResult: context.sameDayLastWeekOriginal,
    sameDayTwoWeeksAgoResult: context.sameDayTwoWeeksAgoOriginal,
    previousDayMistikLama: context.previousDayMistikLama,
    previousDayMistikBaru: context.previousDayMistikBaru,
    sameDayLastWeekMistikLama: context.sameDayLastWeekMistikLama,
    sameDayLastWeekMistikBaru: context.sameDayLastWeekMistikBaru,
    selectedMainSource: context.sameDayLastWeekOriginal,
    selectedSupportSource: context.previousDayOriginal,
    activeMistikSource,
    dominantDigits,
  }
}

export function runDayV2(context) {
  const dayKey = normalizeDayName(context.targetDay)
  const rule = DAY_V2_ACTIVE_RULES[dayKey]

  if (!rule) {
    const error = new Error('targetDay is not supported for day_v2')
    error.statusCode = 400
    throw error
  }

  const dominantDigits = getDayDominantDigits(context.targetDay)
  const activeMistikSource = rule.active.map((key) => context[key]).filter(Boolean)
  const bonusMistikSource = rule.bonus.map((key) => context[key]).filter(Boolean)
  const weighted = {}
  const isFriday = dayKey === 'jumat'
  const dominantScore = isFriday ? 25 : 20
  const sameDayTwoWeeksAgoScore = isFriday ? 20 : 8

  scoreDigits(weighted, context.sameDayLastWeekOriginal, 40, 10)
  scoreDigits(weighted, context.previousDayOriginal, 25, 8)
  dominantDigits.forEach((digit) => addScore(weighted, digit, dominantScore))
  activeMistikSource.forEach((source) => scoreDigits(weighted, source, 10))
  bonusMistikSource.forEach((source) => scoreDigits(weighted, source, 10))
  scoreDigits(weighted, context.sameDayTwoWeeksAgoOriginal, sameDayTwoWeeksAgoScore)
  scoreCrossRepeats(weighted, context.previousDayOriginal, context.sameDayLastWeekOriginal, 10)
  scoreCrossRepeats(weighted, context.sameDayLastWeekOriginal, context.sameDayTwoWeeksAgoOriginal, 10)

  if (isFriday) {
    capFridaySecondaryNoise(weighted, context, dominantDigits)
  }

  const ranked = sortWeightedDigits(weighted, [
    ...uniqueDigits(context.sameDayLastWeekOriginal),
    ...dominantDigits,
    ...(isFriday ? uniqueDigits(context.sameDayTwoWeeksAgoOriginal) : []),
    ...uniqueDigits(context.previousDayOriginal),
  ])
  const main = ranked.slice(0, 3)
  const support = ranked.slice(3, 5)
  const reserve = isFriday
    ? buildReserveFromSources(
        [dominantDigits, context.sameDayTwoWeeksAgoOriginal, ranked],
        main,
        support,
      )
    : buildReserve(ranked, dominantDigits, main, support)
  const front2d = generatePairs(ranked.slice(0, 4), 8)
  const back2d = generatePairs([...ranked.slice(0, 5), ...dominantDigits], 8)
  const bonusNote = ['sabtu', 'minggu'].includes(dayKey)
    ? 'mistik receives a bonus because this target day is historically more active'
    : isFriday
      ? 'active mistik is capped as a modifier for Friday day targets'
    : 'mistik is used as a modifier'

  return {
    input: buildInput(context, activeMistikSource, dominantDigits),
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
      selectedMainSource: context.sameDayLastWeekOriginal,
      selectedSupportSource: context.previousDayOriginal,
      front2d,
      back2d,
    }),
    notes: [
      'day_v2 is weighted toward original weekly pattern',
      'mistik is only a modifier for most target days',
      bonusNote,
      ...(isFriday
        ? [
            'Target Jumat Day: sameDayTwoWeeksAgo dan digit dominan Jumat dinaikkan karena backtest menunjukkan digit bisa muncul dari Jumat dua minggu lalu.',
          ]
        : []),
    ],
  }
}
