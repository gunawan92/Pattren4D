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

  return modules.length
    ? `Passed score range with support from ${modules.join(', ')}`
    : 'Passed score range with no additional validator support'
}

export function rankCandidates(candidateRows) {
  return [...candidateRows]
    .filter((row) => row.status === 'accepted')
    .map((row) => ({
      ...row,
      finalScore: row.dsv1Score + row.supportScore + row.historicalWeight + row.frequencyWeight,
    }))
    .sort((a, b) => {
      const finalDiff = b.finalScore - a.finalScore
      if (finalDiff !== 0) {
        return finalDiff
      }

      const supportDiff = b.supportScore - a.supportScore
      if (supportDiff !== 0) {
        return supportDiff
      }

      const scoreDiff = b.dsv1Score - a.dsv1Score
      if (scoreDiff !== 0) {
        return scoreDiff
      }

      return a.candidate.localeCompare(b.candidate)
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      rankLabel: rankLabel(index + 1),
      reason: reasonFor(row),
    }))
}
