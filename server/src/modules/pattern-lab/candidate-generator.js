import { all4dCandidates, scoreNumber } from './statistics.js'
import {
  clusterEvidence,
  scoreBand,
  scoreClusterForBand,
} from './historical-pattern-analyzer.js'

export function generateCandidatePool({
  currentWeightProfile,
  suggestedScoreRange,
  patternAnalysis,
}) {
  const clusters = patternAnalysis?.scoreClusters || []

  return all4dCandidates().map((candidate) => {
    const dsv1Score = scoreNumber(candidate, currentWeightProfile)
    const patternBand = scoreBand(dsv1Score, clusters)
    const cluster = scoreClusterForBand(patternBand, clusters)
    const accepted = cluster
      ? dsv1Score >= cluster.min && dsv1Score <= cluster.max
      : dsv1Score >= suggestedScoreRange.min && dsv1Score <= suggestedScoreRange.max

    return {
      candidate,
      dsv1Score,
      patternBand,
      status: accepted ? 'accepted' : 'rejected',
      rejectionReason: accepted
        ? ''
        : `DSV1 score ${dsv1Score} outside historical pattern clusters`,
      patternEvidence: patternAnalysis
        ? clusterEvidence({ candidate, score: dsv1Score, band: patternBand, patternAnalysis })
        : {},
    }
  })
}
