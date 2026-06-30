import mongoose from 'mongoose'

const drawSchema = new mongoose.Schema(
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
    drawDate: {
      type: Date,
      index: true,
    },
    drawDateText: {
      type: String,
      required: true,
      trim: true,
    },
    dayName: {
      type: String,
      trim: true,
    },
    eventName: {
      type: String,
      trim: true,
    },
    drawNumber: {
      type: String,
      required: true,
      trim: true,
    },
    result4d: {
      type: String,
      trim: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    collection: 'draw_results',
    timestamps: true,
  },
)

drawSchema.index(
  { market: 1, session: 1, drawDateText: 1, drawNumber: 1 },
  { unique: true },
)

export const DrawResult = mongoose.model('DrawResult', drawSchema)
