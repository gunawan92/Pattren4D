import { DrawResult } from '../draw/draw.model.js'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function is4d(value) {
  return /^\d{4}$/.test(String(value || ''))
}

function digitsOf(value) {
  return String(value || '').replace(/\D/g, '').split('')
}

function uniqueDigits(value) {
  return [...new Set(digitsOf(value))]
}

function normalizeSourceValue(value) {
  if (Array.isArray(value)) {
    return value.join('')
  }

  return String(value || '')
}

function drawPayload(draw) {
  return {
    id: draw._id,
    drawDate: draw.drawDate,
    drawDateText: draw.drawDateText,
    dayName: draw.dayName,
    eventName: draw.eventName,
    drawNumber: draw.drawNumber,
    result4d: draw.result4d,
  }
}

function blankFrequency() {
  return DIGITS.reduce((result, digit) => {
    result[digit] = 0
    return result
  }, {})
}

function topFrequencyDigits(frequency, limit = 3) {
  return Object.entries(frequency)
    .filter(([, count]) => count > 0)
    .sort((a, b) => {
      const diff = b[1] - a[1]
      return diff !== 0 ? diff : Number(a[0]) - Number(b[0])
    })
    .slice(0, limit)
    .map(([digit]) => digit)
}

function classifyFrequency(frequency) {
  const top = new Set(topFrequencyDigits(frequency, 3))
  const seen = DIGITS.filter((digit) => frequency[digit] > 0)
  const unseen = DIGITS.filter((digit) => frequency[digit] === 0)
  const hot = DIGITS.filter((digit) => frequency[digit] >= 2 || top.has(digit))
  const cold = DIGITS.filter((digit) => frequency[digit] === 0)
  const normal = DIGITS.filter((digit) => frequency[digit] > 0 && !hot.includes(digit))

  return {
    seen,
    unseen,
    hot,
    normal,
    cold,
  }
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function analyzeHeadTailBySameDay({
  session,
  targetDay,
  targetDate,
  market = 'nex4d',
  limitWeeks = 16,
}) {
  const rows = await DrawResult.find({
    market,
    session,
    dayName: { $regex: `^${escapeRegex(targetDay)}$`, $options: 'i' },
    drawDate: { $lt: targetDate },
  })
    .sort({ drawDate: -1, createdAt: -1 })
    .limit(limitWeeks)
    .lean()

  const sameDayHistory = rows.filter((row) => is4d(row.result4d)).map(drawPayload)
  const headFrequency = blankFrequency()
  const tailFrequency = blankFrequency()

  for (const row of sameDayHistory) {
    const result = String(row.result4d)
    headFrequency[result[0]] += 1
    tailFrequency[result[3]] += 1
  }

  const head = classifyFrequency(headFrequency)
  const tail = classifyFrequency(tailFrequency)

  return {
    sameDayHistory,
    headFrequency,
    tailFrequency,
    headSeen: head.seen,
    headUnseen: head.unseen,
    tailSeen: tail.seen,
    tailUnseen: tail.unseen,
    headHot: head.hot,
    headNormal: head.normal,
    headCold: head.cold,
    tailHot: tail.hot,
    tailNormal: tail.normal,
    tailCold: tail.cold,
  }
}

function sourceScore(source) {
  if (source.kind === 'dominant') {
    return 1
  }

  if (source.period === 'sameDayLastWeek') {
    if (source.variant === 'original' || source.variant === 'MB') {
      return 4
    }

    if (source.variant === 'ML') {
      return 3
    }
  }

  if (source.period === 'sameDayTwoWeeksAgo') {
    if (source.variant === 'original' || source.variant === 'MB') {
      return 3
    }

    if (source.variant === 'ML') {
      return 2
    }
  }

  if (source.period === 'previousDay') {
    return 2
  }

  if (source.period === 'sameDayThreeWeeksAgo') {
    return 1
  }

  return 1
}

export function getDigitSourceSupport(digit, sources) {
  const supportedBy = []

  for (const source of sources) {
    const value = normalizeSourceValue(source.value)
    const hasDigit = source.kind === 'dominant'
      ? uniqueDigits(value).includes(digit)
      : digitsOf(value).includes(digit)

    if (!hasDigit) {
      continue
    }

    const score = sourceScore(source)
    supportedBy.push({
      key: source.key,
      label: source.label,
      period: source.period,
      variant: source.variant,
      score,
    })
  }

  return {
    digit,
    supportCount: supportedBy.reduce((total, item) => total + item.score, 0),
    supportedBy,
    hasOriginalSupport: supportedBy.some((item) => item.variant === 'original'),
    hasMlSupport: supportedBy.some((item) => item.variant === 'ML'),
    hasMbSupport: supportedBy.some((item) => item.variant === 'MB'),
    hasRecentSupport: supportedBy.some((item) => {
      return ['previousDay', 'sameDayLastWeek', 'sameDayTwoWeeksAgo'].includes(item.period)
    }),
    hasDominantSupport: supportedBy.some((item) => item.variant === 'dominant'),
  }
}

function hasPeriodSupport(support, period) {
  return support.supportedBy.some((item) => item.period === period)
}

function onlyDominantSupport(support) {
  return support.hasDominantSupport &&
    !support.hasOriginalSupport &&
    !support.hasMlSupport &&
    !support.hasMbSupport
}

function scoreAsCandidate({
  digit,
  frequency,
  hot,
  normal,
  cold,
  support,
  historySize,
  position,
}) {
  const count = frequency[digit] || 0
  const isCold = cold.includes(digit) || count === 0
  const isHot = hot.includes(digit)
  let score = count * 5
  const reasons = [`${position} frequency ${count}`]

  if (isHot) {
    score += 10
    reasons.push(`${position} hot +10`)
  }

  if (normal.includes(digit)) {
    score += 6
    reasons.push(`${position} normal +6`)
  }

  if (isCold) {
    score -= 8
    reasons.push(`${position} cold/unseen -8`)
  }

  if (isCold && support.supportCount >= 5) {
    score += 16
    reasons.push('cold supported score >= 5 +16')
  }

  if (isCold && support.hasMbSupport) {
    score += 12
    reasons.push('cold with MB support +12')
  }

  if (isCold && onlyDominantSupport(support)) {
    score -= 5
    reasons.push('cold with dominant-only support -5')
  }

  if (hasPeriodSupport(support, 'sameDayLastWeek')) {
    score += 8
    reasons.push('sameDayLastWeek support +8')
  }

  if (hasPeriodSupport(support, 'sameDayTwoWeeksAgo')) {
    score += 6
    reasons.push('sameDayTwoWeeksAgo support +6')
  }

  if (count >= Math.max(3, Math.ceil(historySize / 3)) && support.supportCount === 0) {
    score -= 6
    reasons.push('too hot without source support -6')
  }

  if (isCold && support.supportCount === 0) {
    return null
  }

  return {
    digit,
    score,
    frequency: count,
    support,
    supported: support.supportCount > 0,
    cold: isCold,
    hot: isHot,
    reasons,
  }
}

export function selectHeadTailCandidates(analysis, sources, limit = 5) {
  const historySize = analysis.sameDayHistory.length
  const selectedHeads = DIGITS
    .map((digit) => scoreAsCandidate({
      digit,
      frequency: analysis.headFrequency,
      hot: analysis.headHot,
      normal: analysis.headNormal,
      cold: analysis.headCold,
      support: getDigitSourceSupport(digit, sources),
      historySize,
      position: 'head',
    }))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || Number(a.digit) - Number(b.digit))
    .slice(0, limit)

  const selectedTails = DIGITS
    .map((digit) => scoreAsCandidate({
      digit,
      frequency: analysis.tailFrequency,
      hot: analysis.tailHot,
      normal: analysis.tailNormal,
      cold: analysis.tailCold,
      support: getDigitSourceSupport(digit, sources),
      historySize,
      position: 'tail',
    }))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || Number(a.digit) - Number(b.digit))
    .slice(0, limit)

  return {
    selectedHeads,
    selectedTails,
  }
}

function addMiddleCandidate(result, pair, source, weight, sourceValue, active = false) {
  if (!/^\d{2}$/.test(pair)) {
    return
  }

  const existing = result.get(pair)
  const candidateWeight = weight + (active ? 25 : 0)
  const detail = {
    source,
    weight,
    sourceValue,
  }

  if (!existing) {
    result.set(pair, {
      pair,
      source,
      sources: [detail],
      weight: candidateWeight,
      active,
    })
    return
  }

  existing.sources.push(detail)
  existing.weight = Math.max(existing.weight, candidateWeight) + Math.min(20, existing.sources.length * 2)
  existing.active = existing.active || active
  if (weight > existing.sources[0].weight) {
    existing.source = source
  }
}

function sourcePairs(value) {
  const digits = digitsOf(value).slice(0, 4)
  if (digits.length < 2) {
    return []
  }

  const pairs = []
  if (digits.length >= 3) {
    pairs.push(digits[1] + digits[2])
  }
  pairs.push(digits[0] + digits[1])
  pairs.push(digits[digits.length - 2] + digits[digits.length - 1])

  if (digits.length === 4) {
    pairs.push(digits[2] + digits[3])
    pairs.push(digits[3] + digits[0])
    pairs.push(digits[0] + digits[2])
    pairs.push(digits[1] + digits[3])
  }

  return [...new Set(pairs)]
}

function middleBaseWeight(source) {
  if (source.period === 'sameDayLastWeek') {
    if (source.variant === 'MB') {
      return 22
    }

    if (source.variant === 'ML' || source.variant === 'original') {
      return 18
    }
  }

  if (source.period === 'sameDayTwoWeeksAgo') {
    return 14
  }

  if (source.period === 'previousDay') {
    return 10
  }

  return 8
}

function crossPairWeight(first, second) {
  let weight = Math.round((middleBaseWeight(first) + middleBaseWeight(second)) / 2)

  if (first.variant === 'MB' && second.variant === 'MB') {
    weight += 55
  } else if (first.variant === 'MB' || second.variant === 'MB') {
    weight += 16
  } else if (first.variant === 'ML' || second.variant === 'ML') {
    weight += 10
  }

  if (first.active || second.active) {
    weight += 8
  }

  return weight
}

function isRawHotPair(pair, sources) {
  return sources.some((source) => {
    return source.variant === 'original' &&
      ['previousDay', 'sameDayLastWeek'].includes(source.period) &&
      normalizeSourceValue(source.value).slice(0, 2) === pair
  })
}

export function buildMiddle2dSources(sources, algorithmContext = {}) {
  const result = new Map()
  const poolDigits = [
    ...(algorithmContext.digitPool?.main || []),
    ...(algorithmContext.digitPool?.support || []),
    ...(algorithmContext.digitPool?.reserve || []),
    ...(algorithmContext.dominantDigits || []),
  ]

  for (const source of sources) {
    const value = normalizeSourceValue(source.value)
    const weight = middleBaseWeight(source)

    for (const pair of sourcePairs(value)) {
      addMiddleCandidate(result, pair, source.label, weight, value, Boolean(source.active))
    }
  }

  const mistikSources = sources.filter((source) => ['ML', 'MB'].includes(source.variant))
  for (let firstIndex = 0; firstIndex < mistikSources.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < mistikSources.length; secondIndex += 1) {
      const first = mistikSources[firstIndex]
      const second = mistikSources[secondIndex]
      const firstDigits = uniqueDigits(first.value)
      const secondDigits = uniqueDigits(second.value)
      const weight = crossPairWeight(first, second)

      for (const firstDigit of firstDigits) {
        for (const secondDigit of secondDigits) {
          if (firstDigit === secondDigit) {
            continue
          }

          addMiddleCandidate(
            result,
            `${firstDigit}${secondDigit}`,
            `cross ${first.label} + ${second.label}`,
            weight,
            `${first.value}|${second.value}`,
            first.active || second.active,
          )
        }
      }
    }
  }

  for (const candidate of result.values()) {
    if (digitsOf(candidate.pair).some((digit) => poolDigits.includes(digit))) {
      candidate.weight += 8
    }

    if (isRawHotPair(candidate.pair, sources) && !candidate.sources.some((item) => {
      return /Mistik Baru|MB|Mistik Lama|ML/.test(item.source)
    })) {
      candidate.weight -= 8
      candidate.rawHotPenalty = true
    }
  }

  return [...result.values()]
    .sort((a, b) => b.weight - a.weight || a.pair.localeCompare(b.pair))
    .slice(0, 80)
}

function sourceContainsDigitAndPair(sourceValue, digit, pair) {
  const value = normalizeSourceValue(sourceValue)

  if (value.includes('|')) {
    const parts = value.split('|')
    return parts.some((part) => part.includes(digit)) &&
      parts.some((part) => part.includes(pair[0])) &&
      parts.some((part) => part.includes(pair[1]))
  }

  return value.includes(digit) && sourcePairs(value).includes(pair)
}

function hasSameSourceSynergy(digit, middle) {
  return middle.sources.some((source) => {
    return sourceContainsDigitAndPair(source.sourceValue, digit, middle.pair)
  })
}

function sourceSimilarityPenalty(candidate, sources) {
  let penalty = 0

  for (const source of sources) {
    const value = normalizeSourceValue(source.value)
    if (candidate === value && source.variant === 'original') {
      penalty -= 12
    } else if (candidate === value && ['ML', 'MB'].includes(source.variant)) {
      penalty -= 8
    }
  }

  return penalty
}

export function composeHeadMiddleTailCandidates({
  headCandidates,
  middle2dCandidates,
  tailCandidates,
  sources = [],
  maxCandidates = 8,
}) {
  const result = new Map()

  for (const head of headCandidates) {
    if (head.cold && !head.supported) {
      continue
    }

    for (const middle of middle2dCandidates) {
      if (middle.rawHotPenalty && middle.weight < 12) {
        continue
      }

      for (const tail of tailCandidates) {
        if (tail.cold && !tail.supported) {
          continue
        }

        const candidate = `${head.digit}${middle.pair}${tail.digit}`
        if (!is4d(candidate)) {
          continue
        }

        let score = head.score + middle.weight + tail.score
        const labels = ['HEAD-MID-TAIL']

        if (hasSameSourceSynergy(head.digit, middle)) {
          score += 10
        }

        if (hasSameSourceSynergy(tail.digit, middle)) {
          score += 10
        }

        if (head.support.hasMbSupport && tail.support.hasMbSupport) {
          score += 10
          labels.push('MISTIK')
        }

        const activeSources = sources.filter((source) => source.active)
        if (activeSources.some((source) => {
          const sourceDigits = digitsOf(source.value)
          return digitsOf(candidate).filter((digit) => sourceDigits.includes(digit)).length >= 3
        })) {
          score += 12
        }

        score += sourceSimilarityPenalty(candidate, sources)

        const existing = result.get(candidate)
        const row = {
          candidate,
          score,
          labels,
          head: head.digit,
          middle: middle.pair,
          tail: tail.digit,
          headScore: head.score,
          middleScore: middle.weight,
          tailScore: tail.score,
          middleSource: middle.source,
          headFrequency: head.frequency,
          tailFrequency: tail.frequency,
          headSupport: head.support,
          tailSupport: tail.support,
        }

        if (!existing || row.score > existing.score) {
          result.set(candidate, row)
        }
      }
    }
  }

  const sorted = [...result.values()]
    .sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))
  const selected = []
  const pushSelected = (row) => {
    if (row && selected.length < maxCandidates && !selected.some((item) => item.candidate === row.candidate)) {
      selected.push(row)
    }
  }

  sorted.slice(0, Math.max(2, Math.floor(maxCandidates / 4))).forEach(pushSelected)

  sorted
    .filter((row) => {
      return /sameDayLastWeek MB \+ sameDayTwoWeeksAgo MB/.test(row.middleSource) &&
        row.headSupport?.hasMbSupport &&
        row.headSupport?.hasDominantSupport &&
        row.tailSupport?.hasOriginalSupport &&
        row.headFrequency <= 2 &&
        !row.middle.includes(row.head)
    })
    .map((row) => ({
      ...row,
      score: row.score + 24,
      labels: [...new Set([...row.labels, 'DERIVED', 'MISTIK'])],
    }))
    .sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))
    .slice(0, 2)
    .forEach(pushSelected)

  for (const head of headCandidates) {
    pushSelected(sorted.find((row) => row.head === head.digit))
  }

  for (const middle of middle2dCandidates.filter((row) => /MB|Mistik Baru|cross/.test(row.source))) {
    pushSelected(sorted.find((row) => row.middle === middle.pair))
  }

  sorted.forEach(pushSelected)

  return selected
}

export function buildUniversalSources(context, generated = {}) {
  const input = generated.input || {}
  const activeValues = [
    ...(Array.isArray(input.activeMistikSource) ? input.activeMistikSource : []),
    ...(Array.isArray(input.activeMistikSources) ? input.activeMistikSources : []),
  ].filter(Boolean)
  const dominantDigits = [
    ...(Array.isArray(input.dominantDigits) ? input.dominantDigits : []),
    ...(Array.isArray(generated.digitPool?.dominantDigits) ? generated.digitPool.dominantDigits : []),
  ]
  const sourceRows = [
    ['previousDayOriginal', 'previousDay original', 'previousDay', 'original', context.previousDayOriginal],
    ['previousDayMistikLama', 'previousDay ML', 'previousDay', 'ML', context.previousDayMistikLama],
    ['previousDayMistikBaru', 'previousDay MB', 'previousDay', 'MB', context.previousDayMistikBaru],
    ['sameDayLastWeekOriginal', 'sameDayLastWeek original', 'sameDayLastWeek', 'original', context.sameDayLastWeekOriginal],
    ['sameDayLastWeekMistikLama', 'sameDayLastWeek ML', 'sameDayLastWeek', 'ML', context.sameDayLastWeekMistikLama],
    ['sameDayLastWeekMistikBaru', 'sameDayLastWeek MB', 'sameDayLastWeek', 'MB', context.sameDayLastWeekMistikBaru],
    ['sameDayTwoWeeksAgoOriginal', 'sameDayTwoWeeksAgo original', 'sameDayTwoWeeksAgo', 'original', context.sameDayTwoWeeksAgoOriginal],
    ['sameDayTwoWeeksAgoMistikLama', 'sameDayTwoWeeksAgo ML', 'sameDayTwoWeeksAgo', 'ML', context.sameDayTwoWeeksAgoMistikLama],
    ['sameDayTwoWeeksAgoMistikBaru', 'sameDayTwoWeeksAgo MB', 'sameDayTwoWeeksAgo', 'MB', context.sameDayTwoWeeksAgoMistikBaru],
    ['sameDayThreeWeeksAgoOriginal', 'sameDayThreeWeeksAgo original', 'sameDayThreeWeeksAgo', 'original', context.sameDayThreeWeeksAgoOriginal],
    ['sameDayThreeWeeksAgoMistikLama', 'sameDayThreeWeeksAgo ML', 'sameDayThreeWeeksAgo', 'ML', context.sameDayThreeWeeksAgoMistikLama],
    ['sameDayThreeWeeksAgoMistikBaru', 'sameDayThreeWeeksAgo MB', 'sameDayThreeWeeksAgo', 'MB', context.sameDayThreeWeeksAgoMistikBaru],
  ]

  const sources = sourceRows
    .filter(([, , , , value]) => value)
    .map(([key, label, period, variant, value]) => ({
      key,
      label,
      period,
      variant,
      value,
      active: activeValues.includes(value),
    }))

  activeValues.forEach((value, index) => {
    if (!sources.some((source) => source.value === value && source.active)) {
      sources.push({
        key: `activeMistikSource${index + 1}`,
        label: `activeMistikSource ${index + 1}`,
        period: 'activeMistikSource',
        variant: 'active',
        value,
        active: true,
      })
    }
  })

  if (dominantDigits.length) {
    sources.push({
      key: 'dominantDigits',
      label: 'dominantDigits',
      period: 'dominantDigits',
      variant: 'dominant',
      kind: 'dominant',
      value: [...new Set(dominantDigits)],
    })
  }

  return sources
}

function candidateSourceScore(candidate, sources) {
  const digits = uniqueDigits(candidate)
  return digits.reduce((total, digit) => {
    return total + getDigitSourceSupport(digit, sources).supportCount
  }, 0)
}

function candidateAntiRawPenalty(candidate, sources) {
  return sourceSimilarityPenalty(candidate, sources)
}

export async function applyHeadMiddleTailLayer({ context, generated, market = 'nex4d' }) {
  const sources = buildUniversalSources(context, generated)
  const headTailBase = await analyzeHeadTailBySameDay({
    session: context.lookupSession || context.session,
    targetDay: context.targetDay,
    targetDate: context.targetDateObject,
    market,
  })
  const { selectedHeads, selectedTails } = selectHeadTailCandidates(headTailBase, sources)
  const middleCandidates = buildMiddle2dSources(sources, {
    digitPool: generated.digitPool,
    dominantDigits: generated.input?.dominantDigits || [],
  })
  const headMiddleTailCandidates = composeHeadMiddleTailCandidates({
    headCandidates: selectedHeads,
    middle2dCandidates: middleCandidates,
    tailCandidates: selectedTails,
    sources,
    maxCandidates: 8,
  })
  const baseCandidates = (generated.candidates4d || [])
    .filter(is4d)
    .map((candidate, index) => ({
      candidate,
      score: 100 - index + candidateSourceScore(candidate, sources) + candidateAntiRawPenalty(candidate, sources),
      labels: ['BASE'],
    }))

  const finalMap = new Map()
  for (const row of [...baseCandidates.slice(0, 4), ...headMiddleTailCandidates.slice(0, 4)]) {
    const existing = finalMap.get(row.candidate)
    if (!existing || row.score > existing.score) {
      finalMap.set(row.candidate, row)
    }
  }

  const finalCandidates = [...finalMap.values()]
    .sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))
    .slice(0, 8)

  return {
    ...generated,
    candidates4d: finalCandidates.map((row) => row.candidate),
    headTailAnalysis: {
      ...headTailBase,
      selectedHeads,
      selectedTails,
    },
    middle2dAnalysis: {
      middleCandidates,
    },
    candidateLayers: {
      baseCandidates,
      headMiddleTailCandidates,
      finalCandidates,
    },
    notes: [
      ...(generated.notes || []),
      'Universal AS Kepala + Middle 2D Source + AS Ekor layer added from same-day history.',
    ],
  }
}
