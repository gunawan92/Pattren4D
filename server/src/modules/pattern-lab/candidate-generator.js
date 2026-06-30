import { all4dCandidates, scoreNumber } from './statistics.js'

export function generateCandidatePool({ currentWeightProfile, suggestedScoreRange }) {
  return all4dCandidates().map((candidate) => {
    const dsv1Score = scoreNumber(candidate, currentWeightProfile)
    const accepted = dsv1Score >= suggestedScoreRange.min && dsv1Score <= suggestedScoreRange.max

    return {
      candidate,
      dsv1Score,
      status: accepted ? 'accepted' : 'rejected',
      rejectionReason: accepted
        ? ''
        : `DSV1 score ${dsv1Score} outside suggested range ${suggestedScoreRange.min}-${suggestedScoreRange.max}`,
    }
  })
}
