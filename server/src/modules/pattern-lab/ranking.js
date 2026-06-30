import { bandSortWeight } from './historical-pattern-analyzer.js'

function rankLabel(rank) {
  if (rank <= 10) {
    return 'A'
  }

  if (rank <= 30) {
    return 'B'
  }

  if (rank <= 100) {
    return 'C'
  }

  return 'D'
}

function reasonFor(row) {
  const modules = (row.validationResults || [])
    .filter((item) => item.supportScore > 0)
    .map((item) => item.module)
    .slice(0, 4)

  const cluster = row.patternBand
    ? `Pattern cluster ${row.patternBand} consistency ${row.patternConsistency || 0}`
    : 'Pattern cluster evidence unavailable'

  return modules.length
    ? `${cluster}; support from ${modules.join(', ')}`
    : `${cluster}; no additional validator support`
}

function clusterOrder(patternAnalysis) {
  const clusters = patternAnalysis?.scoreClusters || []
  const fromClusters = [...clusters]
    .sort((a, b) => {
      const countDiff = b.count - a.count
      if (countDiff !== 0) {
        return countDiff
      }

      return bandSortWeight(a.band) - bandSortWeight(b.band)
    })
    .map((cluster) => cluster.band)
  const fallback = ['low', 'medium', 'high']

  return [...new Set([...fromClusters, ...fallback])]
}

function interleaveByCluster(rows, patternAnalysis) {
  if (!rows.some((row) => row.patternBand)) {
    return [...rows].sort((a, b) => {
      const finalDiff = b.finalScore - a.finalScore
      if (finalDiff !== 0) {
        return finalDiff
      }

      return a.candidate.localeCompare(b.candidate)
    })
  }

  const order = clusterOrder(patternAnalysis)
  const groups = order.reduce((result, band) => {
    result[band] = rows
      .filter((row) => row.patternBand === band)
      .sort((a, b) => {
        const finalDiff = b.finalScore - a.finalScore
        if (finalDiff !== 0) {
          return finalDiff
        }

        return a.candidate.localeCompare(b.candidate)
      })
    return result
  }, {})
  const output = []
  let added = true

  while (added) {
    added = false
    for (const band of order) {
      const next = groups[band]?.shift()
      if (next) {
        output.push(next)
        added = true
      }
    }
  }

  return output
}

export function rankCandidates(candidateRows, patternAnalysis = null) {
  const scoredRows = [...candidateRows]
    .filter((row) => row.status === 'accepted')
    .map((row) => ({
      ...row,
      finalScore: (
        (row.patternConsistency || 0) * 10
        + row.supportScore
        + row.historicalWeight
        + row.frequencyWeight
        + Math.round((row.dsv1Score || 0) / 20)
      ),
    }))

  return interleaveByCluster(scoredRows, patternAnalysis)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      rankLabel: rankLabel(index + 1),
      reason: reasonFor(row),
    }))
}
