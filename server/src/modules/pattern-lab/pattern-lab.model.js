import mongoose from 'mongoose'

const validationResultSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, trim: true },
    supportScore: { type: Number, default: 0 },
    passed: { type: Boolean, default: true },
    reason: { type: String, trim: true },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const weeklyStatisticSchema = new mongoose.Schema(
  {
    market: { type: String, default: 'nex4d', index: true },
    session: { type: String, enum: ['day', 'night'], required: true, index: true },
    targetDate: { type: Date, required: true, index: true },
    targetDateText: { type: String, required: true, trim: true, index: true },
    targetDay: { type: String, required: true, trim: true, index: true },
    historyDepth: { type: Number, default: 5 },
    history: { type: mongoose.Schema.Types.Mixed, default: [] },
    dsv1Profiles: { type: mongoose.Schema.Types.Mixed, default: [] },
    scores: { type: [Number], default: [] },
    statistics: { type: mongoose.Schema.Types.Mixed, default: {} },
    suggestedScoreRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    currentWeightProfile: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'weekly_statistics',
    timestamps: true,
  },
)

weeklyStatisticSchema.index(
  { market: 1, session: 1, targetDateText: 1, historyDepth: 1 },
  { unique: true },
)

const candidatePoolSchema = new mongoose.Schema(
  {
    market: { type: String, default: 'nex4d', index: true },
    session: { type: String, enum: ['day', 'night'], required: true, index: true },
    targetDateText: { type: String, required: true, trim: true, index: true },
    targetDay: { type: String, required: true, trim: true },
    statisticsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeeklyStatistic',
      required: true,
      index: true,
    },
    candidate: { type: String, required: true, trim: true, index: true },
    dsv1Score: { type: Number, required: true },
    scoreRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['accepted', 'rejected'],
      default: 'accepted',
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    validationResults: { type: [validationResultSchema], default: [] },
    supportScore: { type: Number, default: 0 },
    historicalWeight: { type: Number, default: 0 },
    frequencyWeight: { type: Number, default: 0 },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'candidate_pool',
    timestamps: true,
  },
)

candidatePoolSchema.index(
  { market: 1, session: 1, targetDateText: 1, candidate: 1 },
  { unique: true },
)
candidatePoolSchema.index({ market: 1, session: 1, targetDateText: 1, status: 1, dsv1Score: -1 })

const candidateRankingSchema = new mongoose.Schema(
  {
    market: { type: String, default: 'nex4d', index: true },
    session: { type: String, enum: ['day', 'night'], required: true, index: true },
    targetDateText: { type: String, required: true, trim: true, index: true },
    targetDay: { type: String, required: true, trim: true },
    statisticsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeeklyStatistic',
      required: true,
      index: true,
    },
    candidatePoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CandidatePool',
      required: true,
      index: true,
    },
    candidate: { type: String, required: true, trim: true, index: true },
    rank: { type: Number, required: true },
    rankLabel: { type: String, required: true, trim: true },
    dsv1Score: { type: Number, required: true },
    supportScore: { type: Number, default: 0 },
    historicalWeight: { type: Number, default: 0 },
    frequencyWeight: { type: Number, default: 0 },
    finalScore: { type: Number, required: true, index: true },
    validationResults: { type: [validationResultSchema], default: [] },
    reason: { type: String, trim: true },
    evidence: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'candidate_ranking',
    timestamps: true,
  },
)

candidateRankingSchema.index(
  { market: 1, session: 1, targetDateText: 1, candidate: 1 },
  { unique: true },
)
candidateRankingSchema.index({ market: 1, session: 1, targetDateText: 1, rank: 1 })

const backtestLogSchema = new mongoose.Schema(
  {
    market: { type: String, default: 'nex4d', index: true },
    session: { type: String, enum: ['day', 'night'], required: true, index: true },
    targetDateText: { type: String, required: true, trim: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'backtest_logs',
    timestamps: true,
  },
)

export const WeeklyStatistic = mongoose.model('WeeklyStatistic', weeklyStatisticSchema)
export const CandidatePool = mongoose.model('CandidatePool', candidatePoolSchema)
export const CandidateRanking = mongoose.model('CandidateRanking', candidateRankingSchema)
export const BacktestLog = mongoose.model('BacktestLog', backtestLogSchema)
