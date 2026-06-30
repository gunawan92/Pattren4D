import dotenv from 'dotenv'
import { analisaLogicPattern } from '../src/services/geminiService.js'

dotenv.config()

const sampleGenerateResult = {
  session: 'day',
  targetDate: '2026-06-16',
  targetDay: 'Selasa',
  algorithmVersion: 'day_v1',
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
  const result = await analisaLogicPattern(sampleGenerateResult)
  console.log('SMOKE TEST OK. Structured result:')
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
} catch (err) {
  console.error('SMOKE TEST FAILED:', err)
  process.exit(2)
}
