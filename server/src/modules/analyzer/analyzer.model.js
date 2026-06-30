import mongoose from 'mongoose'

const analysisCandidateSchema = new mongoose.Schema(
  {
    market: {
      type: String,
      default: 'nex4d',
      index: true,
    },
    session: {
      type: String,
      enum: ['day', 'night'],
      required: true,
      index: true,
    },
    targetDate: {
      type: Date,
      index: true,
    },
    targetDateText: {
      type: String,
      required: true,
      trim: true,
    },
    targetDay: {
      type: String,
      required: true,
      trim: true,
    },
    algorithmVersion: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    digitPool: {
      main: [String],
      support: [String],
      reserve: [String],
      weighted: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    front2d: [String],
    back2d: [String],
    candidates4d: [String],
    headTailAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    middle2dAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    candidateLayers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notes: [String],
  },
  {
    collection: 'analysis_candidates',
    timestamps: true,
  },
)

analysisCandidateSchema.index(
  { market: 1, session: 1, targetDateText: 1, algorithmVersion: 1 },
  { unique: true },
)

const analysisEvaluationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisCandidate',
      required: true,
      index: true,
    },
    market: {
      type: String,
      default: 'nex4d',
    },
    session: {
      type: String,
      enum: ['day', 'night'],
      required: true,
    },
    targetDateText: {
      type: String,
      required: true,
      trim: true,
    },
    algorithmVersion: {
      type: String,
      required: true,
      trim: true,
    },
    actualResult: {
      type: String,
      required: true,
      trim: true,
    },
    evaluation: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    score: {
      type: Number,
      default: 0,
    },
    conclusion: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'analysis_evaluations',
    timestamps: true,
  },
)

analysisEvaluationSchema.index(
  { candidateId: 1, actualResult: 1 },
  { unique: true },
)

analysisEvaluationSchema.index(
  { market: 1, session: 1, targetDateText: 1, algorithmVersion: 1, actualResult: 1 },
  { unique: true },
)

export const AnalysisCandidate = mongoose.model(
  'AnalysisCandidate',
  analysisCandidateSchema,
)
export const AnalysisEvaluation = mongoose.model(
  'AnalysisEvaluation',
  analysisEvaluationSchema,
)
