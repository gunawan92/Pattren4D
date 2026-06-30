import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { DrawResult } from '../src/modules/draw/draw.model.js'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const RAW_TEXT = `
Nex4D Pools Day	Draw - 4400	04-06-2026	Kamis	5681
Nex4D Pools Day	Draw - 4399	03-06-2026	Rabu	7578
Nex4D Pools Day	Draw - 4398	02-06-2026	Selasa	2153
Nex4D Pools Day	Draw - 4397	01-06-2026	Senin	6621
Nex4D Pools Day	Draw - 4396	31-05-2026	Minggu	7431
Nex4D Pools Day	Draw - 4395	30-05-2026	Sabtu	5728
Nex4D Pools Day	Draw - 4394	29-05-2026	Jumat	6980
Nex4D Pools Day	Draw - 4393	28-05-2026	Kamis	7417
Nex4D Pools Day	Draw - 4392	27-05-2026	Rabu	5612
Nex4D Pools Day	Draw - 4391	26-05-2026	Selasa	2153
Nex4D Pools Day	Draw - 4390	25-05-2026	Senin	3080
Nex4D Pools Day	Draw - 4389	24-05-2026	Minggu	0769
Nex4D Pools Day	Draw - 4388	23-05-2026	Sabtu	2148
Nex4D Pools Day	Draw - 4387	22-05-2026	Jumat	0663
Nex4D Pools Day	Draw - 4386	21-05-2026	Kamis	0518
Nex4D Pools Day	Draw - 4385	20-05-2026	Rabu	1732
Nex4D Pools Day	Draw - 4384	19-05-2026	Selasa	2172
Nex4D Pools Day	Draw - 4383	18-05-2026	Senin	7594
Nex4D Pools Day	Draw - 4382	17-05-2026	Minggu	2882
Nex4D Pools Day	Draw - 4381	16-05-2026	Sabtu	7058
Nex4D Pools Day	Draw - 4380	15-05-2026	Jumat	3905
Nex4D Pools Day	Draw - 4379	14-05-2026	Kamis	8412
Nex4D Pools Day	Draw - 4378	13-05-2026	Rabu	3442
Nex4D Pools Day	Draw - 4377	12-05-2026	Selasa	7321
Nex4D Pools Day	Draw - 4376	11-05-2026	Senin	1553
Nex4D Pools Day	Draw - 4375	10-05-2026	Minggu	2466
Nex4D Pools Day	Draw - 4374	09-05-2026	Sabtu	5093
Nex4D Pools Day	Draw - 4373	08-05-2026	Jumat	0343
Nex4D Pools Day	Draw - 4372	07-05-2026	Kamis	9854
Nex4D Pools Day	Draw - 4371	06-05-2026	Rabu	5218
Nex4D Pools Day	Draw - 4370	05-05-2026	Selasa	1075
Nex4D Pools Day	Draw - 4369	04-05-2026	Senin	7943
Nex4D Pools Day	Draw - 4368	03-05-2026	Minggu	1865
Nex4D Pools Day	Draw - 4367	02-05-2026	Sabtu	3128
Nex4D Pools Day	Draw - 4366	01-05-2026	Jumat	8442
Nex4D Pools Day	Draw - 4365	30-04-2026	Kamis	5135
Nex4D Pools Day	Draw - 4364	29-04-2026	Rabu	5729
Nex4D Pools Day	Draw - 4363	28-04-2026	Selasa	3064
Nex4D Pools Day	Draw - 4362	27-04-2026	Senin	5965
Nex4D Pools Day	Draw - 4361	26-04-2026	Minggu	2814
Nex4D Pools Day	Draw - 4360	25-04-2026	Sabtu	7533
Nex4D Pools Day	Draw - 4359	24-04-2026	Jumat	6721
Nex4D Pools Day	Draw - 4358	23-04-2026	Kamis	1209
Nex4D Pools Day	Draw - 4357	22-04-2026	Rabu	0690
Nex4D Pools Day	Draw - 4356	21-04-2026	Selasa	5295
Nex4D Pools Day	Draw - 4355	20-04-2026	Senin	9257
Nex4D Pools Day	Draw - 4354	19-04-2026	Minggu	9397
Nex4D Pools Day	Draw - 4353	18-04-2026	Sabtu	2580
Nex4D Pools Day	Draw - 4352	17-04-2026	Jumat	4379
Nex4D Pools Day	Draw - 4351	16-04-2026	Kamis	8363
Nex4D Pools Day	Draw - 4350	15-04-2026	Rabu	2523
Nex4D Pools Day	Draw - 4349	14-04-2026	Selasa	5254
Nex4D Pools Day	Draw - 4348	13-04-2026	Senin	9695
Nex4D Pools Day	Draw - 4347	12-04-2026	Minggu	1634
Nex4D Pools Day	Draw - 4346	11-04-2026	Sabtu	8645
Nex4D Pools Day	Draw - 4345	10-04-2026	Jumat	2715
Nex4D Pools Day	Draw - 4344	09-04-2026	Kamis	8421
Nex4D Pools Day	Draw - 4343	08-04-2026	Rabu	9932
Nex4D Pools Day	Draw - 4342	07-04-2026	Selasa	7057
Nex4D Pools Day	Draw - 4341	06-04-2026	Senin	1029
Nex4D Pools Day	Draw - 4340	05-04-2026	Minggu	1835
Nex4D Pools Day	Draw - 4339	04-04-2026	Sabtu	8950
Nex4D Pools Day	Draw - 4338	03-04-2026	Jumat	3273
Nex4D Pools Day	Draw - 4337	02-04-2026	Kamis	7153
Nex4D Pools Day	Draw - 4336	01-04-2026	Rabu	8094
Nex4D Pools Day	Draw - 4335	31-03-2026	Selasa	6281
Nex4D Pools Day	Draw - 4334	30-03-2026	Senin	0638
Nex4D Pools Day	Draw - 4333	29-03-2026	Minggu	8305
Nex4D Pools Day	Draw - 4332	28-03-2026	Sabtu	4320
Nex4D Pools Day	Draw - 4331	27-03-2026	Jumat	6238
Nex4D Pools Day	Draw - 4330	26-03-2026	Kamis	1271
Nex4D Pools Day	Draw - 4329	25-03-2026	Rabu	8195
Nex4D Pools Day	Draw - 4328	24-03-2026	Selasa	6452
Nex4D Pools Day	Draw - 4327	23-03-2026	Senin	4435
Nex4D Pools Day	Draw - 4326	22-03-2026	Minggu	9169
Nex4D Pools Day	Draw - 4325	21-03-2026	Sabtu	2798
Nex4D Pools Day	Draw - 4324	20-03-2026	Jumat	7547
Nex4D Pools Day	Draw - 4323	19-03-2026	Kamis	2518
Nex4D Pools Day	Draw - 4322	18-03-2026	Rabu	2932
Nex4D Pools Day	Draw - 4321	17-03-2026	Selasa	8906
Nex4D Pools Day	Draw - 4320	16-03-2026	Senin	0403
Nex4D Pools Day	Draw - 4319	15-03-2026	Minggu	0242
Nex4D Pools Day	Draw - 4318	14-03-2026	Sabtu	3415
Nex4D Pools Day	Draw - 4317	13-03-2026	Jumat	2943
Nex4D Pools Day	Draw - 4316	12-03-2026	Kamis	7189
Nex4D Pools Day	Draw - 4315	11-03-2026	Rabu	5621
Nex4D Pools Day	Draw - 4314	10-03-2026	Selasa	3229
Nex4D Pools Day	Draw - 4313	09-03-2026	Senin	3805
Nex4D Pools Day	Draw - 4312	08-03-2026	Minggu	9376
Nex4D Pools Day	Draw - 4311	07-03-2026	Sabtu	2798
Nex4D Pools Day	Draw - 4310	06-03-2026	Jumat	0765
Nex4D Pools Day	Draw - 4309	05-03-2026	Kamis	9414
Nex4D Pools Day	Draw - 4308	04-03-2026	Rabu	7527
Nex4D Pools Day	Draw - 4307	03-03-2026	Selasa	7735
Nex4D Pools Day	Draw - 4306	02-03-2026	Senin	8502
Nex4D Pools Day	Draw - 4305	01-03-2026	Minggu	5928
Nex4D Pools Day	Draw - 4304	28-02-2026	Sabtu	8731
Nex4D Pools Day	Draw - 4303	27-02-2026	Jumat	2305
Nex4D Pools Day	Draw - 4302	26-02-2026	Kamis	0275
Nex4D Pools Day	Draw - 4301	25-02-2026	Rabu	7943
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
      session: 'day',
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

    console.log('Import Nex4D Pools Day raw selesai.')
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
    console.log('curl "http://localhost:4105/api/draw/results?session=day&limit=10"')
    console.log('Expected latest:')
    console.log('04-06-2026 Kamis 5681')
    console.log('03-06-2026 Rabu 7578')
    console.log('02-06-2026 Selasa 2153')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(async (error) => {
  console.error('Import gagal:', error.message)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
