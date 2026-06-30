import dotenv from 'dotenv'
import { analyzeNex4dCandidates } from '../src/modules/ai/gemini.service.js'

dotenv.config()

const generateResult = {
  session: 'day',
  targetDate: '2026-06-16',
  targetDay: 'Selasa',
  algorithmVersion: 'day_v1',
  sources: {
    sameDayLastWeek: '2012',
    sameDayTwoWeeksAgo: '2153',
  },
  transformations: {
    2012: { ml: '5105', mb: '6876' },
    2153: { ml: '5028', mb: '6749' },
  },
  digitPool: {
    main: ['6', '7', '8', '9'],
    support: ['2', '4', '1'],
    reserve: ['0', '3', '5'],
  },
  front2d: ['78', '76', '68', '67'],
  back2d: ['92', '49', '76', '16'],
  candidates4d: ['7892', '7692', '6876', '6749'],
  headTailAnalysis: {
    selectedHeads: ['7', '6', '8'],
    selectedTails: ['2', '9', '6'],
  },
  middle2dAnalysis: {
    middleCandidates: ['89', '68', '74', '49'],
  },
  candidateLayers: {
    baseCandidates: ['6876', '6749'],
    headMiddleTailCandidates: ['7892', '7692'],
  },
}

try {
  const result = await analyzeNex4dCandidates(generateResult)
  const analysis = result.analysis

  if (!Array.isArray(analysis.final_poc)) {
    throw new Error('final_poc must be an array')
  }

  if (typeof analysis.confidence_percent !== 'number') {
    throw new Error('confidence_percent must be a number')
  }

  const serialized = JSON.stringify(analysis)
  if (/```|raw markdown/i.test(serialized)) {
    throw new Error('analysis must not contain raw markdown')
  }

  console.log('AI ANALYST SMOKE TEST OK.')
  console.log(JSON.stringify(analysis, null, 2))
  process.exit(0)
} catch (err) {
  console.error('AI ANALYST SMOKE TEST FAILED:', err)
  process.exit(2)
}
