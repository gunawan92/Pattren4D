import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { DrawResult } from '../src/modules/draw/draw.model.js'

dotenv.config({ path: new URL('../.env', import.meta.url) })

function normalizeDateText(value) {
  return String(value || '').trim().replace(/\//g, '-')
}

function duplicateKey(row) {
  return [
    row.session,
    normalizeDateText(row.drawDateText),
    row.result4d,
  ].join('|')
}

async function countBySource() {
  return DrawResult.aggregate([
    {
      $group: {
        _id: {
          session: '$session',
          sourceUrl: '$sourceUrl',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        '_id.session': 1,
        '_id.sourceUrl': 1,
      },
    },
  ])
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required')
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })

  try {
    const before = await countBySource()
    const manualRows = await DrawResult.find({
      sourceUrl: 'manual-raw-import',
      session: { $in: ['day', 'night'] },
    }).lean()
    const manualKeys = new Set(manualRows.map(duplicateKey))
    const candidates = await DrawResult.find({
      sourceUrl: { $ne: 'manual-raw-import' },
      session: { $in: ['day', 'night'] },
    }).lean()
    const duplicates = candidates.filter((row) => manualKeys.has(duplicateKey(row)))

    const deleteResult = duplicates.length
      ? await DrawResult.deleteMany({
          _id: { $in: duplicates.map((row) => row._id) },
        })
      : { deletedCount: 0 }
    const after = await countBySource()

    console.log('Cleanup duplicate draw_results selesai.')
    console.log({
      manualRows: manualRows.length,
      checkedNonManualRows: candidates.length,
      duplicateNonManualRows: duplicates.length,
      deleted: deleteResult.deletedCount || 0,
    })

    if (duplicates.length) {
      console.table(
        duplicates.slice(0, 20).map((row) => ({
          session: row.session,
          drawDateText: row.drawDateText,
          dayName: row.dayName,
          drawNumber: row.drawNumber,
          result4d: row.result4d,
          sourceUrl: row.sourceUrl,
        })),
      )
    }

    console.log('Before:')
    console.table(before.map((row) => ({
      session: row._id.session,
      sourceUrl: row._id.sourceUrl,
      count: row.count,
    })))

    console.log('After:')
    console.table(after.map((row) => ({
      session: row._id.session,
      sourceUrl: row._id.sourceUrl,
      count: row.count,
    })))

    console.log('Verifikasi:')
    console.log('curl "http://localhost:4105/api/draw/results?session=day&limit=10"')
    console.log('curl "http://localhost:4105/api/draw/results?session=night&limit=10"')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(async (error) => {
  console.error('Cleanup gagal:', error.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
