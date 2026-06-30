import {
  analyzeNex4dCandidates,
  generateDevelopmentText,
} from '../modules/ai/gemini.service.js'

export const generateAiText = generateDevelopmentText

export const analisaLogicPattern = async (generateResult) => {
  const result = await analyzeNex4dCandidates(generateResult)
  return result.analysis
}
