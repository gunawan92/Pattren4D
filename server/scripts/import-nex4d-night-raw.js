import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { DrawResult } from '../src/modules/draw/draw.model.js'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const RAW_TEXT = `
Nex4D Pools Night	Draw - 40886	04-06-2026	Kamis	7420
Nex4D Pools Night	Draw - 40885	03-06-2026	Rabu	2972
Nex4D Pools Night	Draw - 40884	02-06-2026	Selasa	3670
Nex4D Pools Night	Draw - 40883	01-06-2026	Senin	6542
Nex4D Pools Night	Draw - 40882	31-05-2026	Minggu	7282
Nex4D Pools Night	Draw - 40881	30-05-2026	Sabtu	6451
Nex4D Pools Night	Draw - 40880	29-05-2026	Jumat	7421
Nex4D Pools Night	Draw - 40879	28-05-2026	Kamis	3370
Nex4D Pools Night	Draw - 40878	27-05-2026	Rabu	1161
Nex4D Pools Night	Draw - 40877	26-05-2026	Selasa	6035
Nex4D Pools Night	Draw - 40876	25-05-2026	Senin	5934
Nex4D Pools Night	Draw - 40875	24-05-2026	Minggu	3478
Nex4D Pools Night	Draw - 40874	23-05-2026	Sabtu	5738
Nex4D Pools Night	Draw - 40873	22-05-2026	Jumat	3598
Nex4D Pools Night	Draw - 40872	21-05-2026	Kamis	2794
Nex4D Pools Night	Draw - 40871	20-05-2026	Rabu	3851
Nex4D Pools Night	Draw - 40870	19-05-2026	Selasa	0671
Nex4D Pools Night	Draw - 40869	18-05-2026	Senin	1047
Nex4D Pools Night	Draw - 40868	17-05-2026	Minggu	7106
Nex4D Pools Night	Draw - 40867	16-05-2026	Sabtu	9645
Nex4D Pools Night	Draw - 40866	15-05-2026	Jumat	7840
Nex4D Pools Night	Draw - 40865	14-05-2026	Kamis	7514
Nex4D Pools Night	Draw - 40864	13-05-2026	Rabu	1043
Nex4D Pools Night	Draw - 40863	12-05-2026	Selasa	4601
Nex4D Pools Night	Draw - 40862	11-05-2026	Senin	7485
Nex4D Pools Night	Draw - 40861	10-05-2026	Minggu	1281
Nex4D Pools Night	Draw - 40860	09-05-2026	Sabtu	3053
Nex4D Pools Night	Draw - 40859	08-05-2026	Jumat	7834
Nex4D Pools Night	Draw - 40858	07-05-2026	Kamis	4302
Nex4D Pools Night	Draw - 40857	06-05-2026	Rabu	4669
Nex4D Pools Night	Draw - 40856	05-05-2026	Selasa	2657
Nex4D Pools Night	Draw - 40855	04-05-2026	Senin	0168
Nex4D Pools Night	Draw - 40854	03-05-2026	Minggu	0231
Nex4D Pools Night	Draw - 40853	02-05-2026	Sabtu	1958
Nex4D Pools Night	Draw - 40852	01-05-2026	Jumat	5875
Nex4D Pools Night	Draw - 40851	30-04-2026	Kamis	0452
Nex4D Pools Night	Draw - 40850	29-04-2026	Rabu	2402
Nex4D Pools Night	Draw - 40849	28-04-2026	Selasa	9736
Nex4D Pools Night	Draw - 40848	27-04-2026	Senin	7442
Nex4D Pools Night	Draw - 40847	26-04-2026	Minggu	2513
Nex4D Pools Night	Draw - 40846	25-04-2026	Sabtu	3427
Nex4D Pools Night	Draw - 40845	24-04-2026	Jumat	1061
Nex4D Pools Night	Draw - 40844	23-04-2026	Kamis	5928
Nex4D Pools Night	Draw - 40843	22-04-2026	Rabu	0714
Nex4D Pools Night	Draw - 40842	21-04-2026	Selasa	5865
Nex4D Pools Night	Draw - 40841	20-04-2026	Senin	2197
Nex4D Pools Night	Draw - 40840	19-04-2026	Minggu	4946
Nex4D Pools Night	Draw - 40839	18-04-2026	Sabtu	7135
Nex4D Pools Night	Draw - 40838	17-04-2026	Jumat	5284
Nex4D Pools Night	Draw - 40837	16-04-2026	Kamis	1057
Nex4D Pools Night	Draw - 40836	15-04-2026	Rabu	1574
Nex4D Pools Night	Draw - 40835	14-04-2026	Selasa	4521
Nex4D Pools Night	Draw - 40834	13-04-2026	Senin	9772
Nex4D Pools Night	Draw - 40833	12-04-2026	Minggu	8243
Nex4D Pools Night	Draw - 40832	11-04-2026	Sabtu	7437
Nex4D Pools Night	Draw - 40831	10-04-2026	Jumat	9954
Nex4D Pools Night	Draw - 40830	09-04-2026	Kamis	7459
Nex4D Pools Night	Draw - 40829	08-04-2026	Rabu	9480
Nex4D Pools Night	Draw - 40828	07-04-2026	Selasa	0430
Nex4D Pools Night	Draw - 40827	06-04-2026	Senin	3425
Nex4D Pools Night	Draw - 40826	05-04-2026	Minggu	5953
Nex4D Pools Night	Draw - 40825	04-04-2026	Sabtu	7205
Nex4D Pools Night	Draw - 40824	03-04-2026	Jumat	0145
Nex4D Pools Night	Draw - 40823	02-04-2026	Kamis	7424
Nex4D Pools Night	Draw - 40822	01-04-2026	Rabu	7813
Nex4D Pools Night	Draw - 40821	31-03-2026	Selasa	1958
Nex4D Pools Night	Draw - 40820	30-03-2026	Senin	9118
Nex4D Pools Night	Draw - 40819	29-03-2026	Minggu	6210
Nex4D Pools Night	Draw - 40818	28-03-2026	Sabtu	5437
Nex4D Pools Night	Draw - 40817	27-03-2026	Jumat	1703
Nex4D Pools Night	Draw - 40816	26-03-2026	Kamis	8445
Nex4D Pools Night	Draw - 40815	25-03-2026	Rabu	8742
Nex4D Pools Night	Draw - 40814	24-03-2026	Selasa	8823
Nex4D Pools Night	Draw - 40813	23-03-2026	Senin	1334
Nex4D Pools Night	Draw - 40812	22-03-2026	Minggu	8909
Nex4D Pools Night	Draw - 40811	21-03-2026	Sabtu	1464
Nex4D Pools Night	Draw - 40810	20-03-2026	Jumat	2971
Nex4D Pools Night	Draw - 40809	19-03-2026	Kamis	2348
Nex4D Pools Night	Draw - 40808	18-03-2026	Rabu	1852
Nex4D Pools Night	Draw - 40807	17-03-2026	Selasa	7421
Nex4D Pools Night	Draw - 40806	16-03-2026	Senin	8015
Nex4D Pools Night	Draw - 40805	15-03-2026	Minggu	2920
Nex4D Pools Night	Draw - 40804	14-03-2026	Sabtu	7827
Nex4D Pools Night	Draw - 40803	13-03-2026	Jumat	5843
Nex4D Pools Night	Draw - 40802	12-03-2026	Kamis	1537
Nex4D Pools Night	Draw - 40801	11-03-2026	Rabu	1712
Nex4D Pools Night	Draw - 40800	10-03-2026	Selasa	3078
Nex4D Pools Night	Draw - 40799	09-03-2026	Senin	4931
Nex4D Pools Night	Draw - 40798	08-03-2026	Minggu	9219
Nex4D Pools Night	Draw - 40797	07-03-2026	Sabtu	2873
Nex4D Pools Night	Draw - 40796	06-03-2026	Jumat	5305
Nex4D Pools Night	Draw - 40795	05-03-2026	Kamis	5129
Nex4D Pools Night	Draw - 40794	04-03-2026	Rabu	1156
Nex4D Pools Night	Draw - 40793	03-03-2026	Selasa	7817
Nex4D Pools Night	Draw - 40792	02-03-2026	Senin	6412
Nex4D Pools Night	Draw - 40791	01-03-2026	Minggu	5681
Nex4D Pools Night	Draw - 40790	28-02-2026	Sabtu	9227
Nex4D Pools Night	Draw - 40789	27-02-2026	Jumat	7035
Nex4D Pools Night	Draw - 40788	26-02-2026	Kamis	9453
Nex4D Pools Night	Draw - 40787	25-02-2026	Rabu	3045
`

const VALID_DAYS = new Set(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'])

function parseDate(dateText) {
  const match = String(dateText || '').match(/^(\d{2})-(\d{2})-(\d{4})$/)

  if (!match) {
    return null
  }

  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
}

function splitLine(line) {
  const tabParts = line.split('\t').map((part) => part.trim())

  if (tabParts.length >= 5) {
    return tabParts
  }

  return line.split(/\s{2,}/).map((part) => part.trim())
}

function normalizeLine(sourceLine) {
  const [poolName, drawEvent, dateText, dayName, result4d] = splitLine(sourceLine)
  const drawMatch = String(drawEvent || '').match(/Draw\s*-\s*(\d+)/i)
  const drawDate = parseDate(dateText)

  if (!poolName || !drawEvent || !dateText || !dayName || !result4d) {
    return { error: 'kolom tidak lengkap' }
  }

  if (!drawDate) {
    return { error: `format tanggal tidak valid: ${dateText}` }
  }

  if (!VALID_DAYS.has(dayName)) {
    return { error: `nama hari tidak valid: ${dayName}` }
  }

  if (!/^\d{4}$/.test(result4d)) {
    return { error: `result4d harus 4 digit: ${result4d}` }
  }

  if (!drawMatch) {
    return { error: `draw number tidak ditemukan: ${drawEvent}` }
  }

  return {
    row: {
      market: 'nex4d',
      session: 'night',
      drawDate,
      drawDateText: dateText,
      dayName,
      eventName: poolName,
      drawNumber: drawMatch[1],
      result4d,
      sourceUrl: 'manual-raw-import',
      raw: {
        poolName,
        eventName: drawEvent,
        sourceLine,
      },
    },
  }
}

function parseRows() {
  const lines = RAW_TEXT.split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const rows = []
  const skipped = []

  for (const [index, line] of lines.entries()) {
    const parsed = normalizeLine(line)

    if (parsed.error) {
      skipped.push({
        line: index + 1,
        reason: parsed.error,
        sourceLine: line,
      })
      continue
    }

    rows.push(parsed.row)
  }

  return {
    totalLines: lines.length,
    rows,
    skipped,
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required')
  }

  const { totalLines, rows, skipped } = parseRows()

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })

  try {
    const result = rows.length
      ? await DrawResult.bulkWrite(
          rows.map((row) => ({
            updateOne: {
              filter: {
                market: row.market,
                session: row.session,
                drawDateText: row.drawDateText,
                drawNumber: row.drawNumber,
              },
              update: {
                $set: row,
                $setOnInsert: { createdAt: new Date() },
              },
              upsert: true,
            },
          })),
          { ordered: false },
        )
      : {
          upsertedCount: 0,
          modifiedCount: 0,
          matchedCount: 0,
        }

    console.log('Import Nex4D Pools Night raw selesai.')
    console.log({
      totalLines,
      parsed: rows.length,
      inserted: result.upsertedCount || 0,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      skipped: skipped.length,
    })

    if (skipped.length) {
      console.log('Skipped lines:')
      console.table(skipped)
    }

    console.log('Verifikasi:')
    console.log('curl "http://localhost:4105/api/draw/results?session=night&limit=10"')
    console.log('Expected latest:')
    console.log('04-06-2026 Kamis 7420')
    console.log('03-06-2026 Rabu 2972')
    console.log('02-06-2026 Selasa 3670')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(async (error) => {
  console.error('Import gagal:', error.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
