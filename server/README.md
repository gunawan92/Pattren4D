# Logic Pattren Server

Backend Express untuk mengambil hasil draw, menyimpan ke MongoDB Atlas, dan menjalankan analisa awal Logic Pattren.

## Install

```bash
cd server
npm install
```

## Environment

Buat file `.env` dari `.env.example`.

```bash
cp .env.example .env
```

Isi nilai berikut:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.example.mongodb.net/nex4d
PORT=4105
NEX4D_DAY_ENDPOINT=https://www.nex4dpools.com/func/plyreq/getHistoryResult?filterDate=&drawType=day&_=1780578234728
NEX4D_NIGHT_ENDPOINT=https://www.nex4dpools.com/func/plyreq/getHistoryResult?filterDate=&drawType=night&_=1780578234728
GEMINI_API_KEY=
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
AI_ANALYST_API_KEY=
```

Jangan commit `.env`. File ini sudah masuk `.gitignore`.

`GEMINI_API_KEY` atau `GOOGLE_API_KEY` diperlukan hanya untuk AI Analyst Layer. API key tidak boleh dikirim ke frontend.
`AI_ANALYST_API_KEY` dipakai sebagai guard endpoint AI Analyst. Saat `NODE_ENV=production`, isi env ini dan kirim header `x-ai-analyst-key` dari backend/frontend yang dipercaya.

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## Endpoints

### `GET /`

Health check.

```bash
curl http://localhost:4105/
```

### Pattern Lab Engine v2

Engine v2 menjalankan pipeline deterministic berbasis historical statistics sebelum membuat kandidat:

```bash
curl -X POST http://localhost:4105/api/analysis \
  -H "Content-Type: application/json" \
  -d '{"session":"night","targetDate":"2026-06-30","targetDay":"Selasa","historyDepth":5}'
```

Tabel DSV1 dibuat otomatis oleh engine dan ditampilkan read-only di hasil analisa.

Endpoint v2:

- `POST /api/analysis` menjalankan full pipeline dan menyimpan hasil.
- `GET /api/analysis` mengambil weekly statistics tersimpan.
- `GET /api/candidate` mengambil candidate pool termasuk rejected rows beserta alasan.
- `GET /api/candidate/ranking` mengambil ranking deterministic dan explainable.
- `GET /api/statistics` alias untuk statistics.

Dokumentasi detail ada di `docs/pattern-lab-engine-v2.md`.

### `POST /api/draw/sync/day`

Mengambil data dari `NEX4D_DAY_ENDPOINT`, menormalisasi, lalu upsert ke collection `draw_results`.

```bash
curl -X POST http://localhost:4105/api/draw/sync/day
```

### `GET /api/draw/results`

Mengambil hasil draw terbaru.

Query:

- `session=day` atau `session=night`
- `limit=50`

```bash
curl "http://localhost:4105/api/draw/results?session=day&limit=50"
```

### `GET /api/analyzer/mistik/:number`

Menghasilkan Mistik Lama dan Mistik Baru.

```bash
curl http://localhost:4105/api/analyzer/mistik/2972
```

Response:

```json
{
  "original": "2972",
  "mistikLama": "5645",
  "mistikBaru": "6316"
}
```

### `POST /api/analyzer/night-target`

Analisa mentah target night berdasarkan data day hari sebelumnya dan hari yang sama minggu lalu.

```bash
curl -X POST http://localhost:4105/api/analyzer/night-target \
  -H "Content-Type: application/json" \
  -d '{"targetDate":"2026-06-04","targetDay":"Kamis"}'
```

### `POST /api/analyzer/generate`

Generate kandidat 4D, 2D depan, 2D belakang, pool digit, scoring, lalu upsert ke collection `analysis_candidates`.

Generate `night_v1`:

```bash
curl -X POST http://localhost:4105/api/analyzer/generate \
  -H "Content-Type: application/json" \
  -d '{"session":"night","targetDate":"2026-06-04","targetDay":"Kamis","algorithmVersion":"night_v1"}'
```

Generate `night_v2`:

```bash
curl -X POST http://localhost:4105/api/analyzer/generate \
  -H "Content-Type: application/json" \
  -d '{"session":"night","targetDate":"2026-06-04","targetDay":"Kamis","algorithmVersion":"night_v2"}'
```

Generate `day_v1`:

```bash
curl -X POST http://localhost:4105/api/analyzer/generate \
  -H "Content-Type: application/json" \
  -d '{"session":"day","targetDate":"2026-06-04","targetDay":"Kamis","algorithmVersion":"day_v1"}'
```

Generate `day_v2`:

```bash
curl -X POST http://localhost:4105/api/analyzer/generate \
  -H "Content-Type: application/json" \
  -d '{"session":"day","targetDate":"2026-06-04","targetDay":"Kamis","algorithmVersion":"day_v2"}'
```

### `GET /api/analyzer/candidates`

Mengambil hasil kandidat yang sudah disimpan.

```bash
curl "http://localhost:4105/api/analyzer/candidates?session=night&targetDate=2026-06-04&algorithmVersion=night_v2"
```

### `POST /api/ai/analyze-candidates`

Menjalankan Gemini sebagai AI Analyst Layer untuk mereview hasil engine deterministic. Gemini tidak menjadi engine prediksi dan tidak membuat kandidat di luar payload yang dikirim.

Payload dapat berupa hasil `/api/analyzer/generate` langsung atau dibungkus dalam `generateResult`.

```bash
curl -X POST http://localhost:4105/api/ai/analyze-candidates \
  -H "Content-Type: application/json" \
  -H "x-ai-analyst-key: $AI_ANALYST_API_KEY" \
  -d '{
    "session":"day",
    "targetDate":"2026-06-16",
    "targetDay":"Selasa",
    "algorithmVersion":"day_v1",
    "digitPool":{"main":["6","7","8","9"],"support":["2","4","1"],"reserve":["0","3","5"]},
    "front2d":["78","76","68","67"],
    "back2d":["92","49","76","16"],
    "candidates4d":["7892","7692","6876","6749"],
    "headTailAnalysis":{"selectedHeads":["7","6","8"],"selectedTails":["2","9","6"]},
    "middle2dAnalysis":{"middleCandidates":["89","68","74","49"]},
    "candidateLayers":{"baseCandidates":["6876","6749"],"headMiddleTailCandidates":["7892","7692"]}
  }'
```

Response:

```json
{
  "ok": true,
  "model": "gemini-1.5-flash",
  "data": {
    "summary": "",
    "confidence": "low",
    "confidence_percent": 0,
    "main_reading": "",
    "source_quality": {
      "status": "weak",
      "reason": ""
    },
    "candidate_rank": [],
    "raise_candidates": [],
    "lower_candidates": [],
    "warnings": [],
    "final_poc": [],
    "debug_notes": []
  }
}
```

### `POST /api/ai/dev-chat`

Development-only Gemini text endpoint untuk smoke/debug internal. Endpoint ini rate-limited, prompt maksimal 4000 karakter, dan disabled saat `NODE_ENV=production`.

`POST /api/chat` masih tersedia sebagai alias development-only untuk kompatibilitas lama. Jangan pakai endpoint ini untuk UI production.

### `POST /api/analyzer/evaluate`

Evaluasi kandidat terhadap result aktual dan simpan ke collection `analysis_evaluations`.

Evaluate `night_v1`:

```bash
curl -X POST http://localhost:4105/api/analyzer/evaluate \
  -H "Content-Type: application/json" \
  -d '{"session":"night","targetDate":"2026-06-04","actualResult":"7420","algorithmVersion":"night_v1"}'
```

Evaluate `night_v2`:

```bash
curl -X POST http://localhost:4105/api/analyzer/evaluate \
  -H "Content-Type: application/json" \
  -d '{"session":"night","targetDate":"2026-06-04","actualResult":"7420","algorithmVersion":"night_v2"}'
```

Evaluate `day_v1`:

```bash
curl -X POST http://localhost:4105/api/analyzer/evaluate \
  -H "Content-Type: application/json" \
  -d '{"session":"day","targetDate":"2026-06-04","actualResult":"1234","algorithmVersion":"day_v1"}'
```

Evaluate `day_v2`:

```bash
curl -X POST http://localhost:4105/api/analyzer/evaluate \
  -H "Content-Type: application/json" \
  -d '{"session":"day","targetDate":"2026-06-04","actualResult":"1234","algorithmVersion":"day_v2"}'
```

## MongoDB

Collections:

- `draw_results`
- `analysis_candidates`
- `analysis_evaluations`

Unique indexes:

```js
{ market: 1, session: 1, drawDateText: 1, drawNumber: 1 }
{ market: 1, session: 1, targetDateText: 1, algorithmVersion: 1 }
{ candidateId: 1, actualResult: 1 }
```

## Gemini Smoke Test

Jalankan smoke test Gemini lama:

```bash
node smoke-test/gemini-smoke-test.mjs
```

Jalankan smoke test AI Analyst structured output:

```bash
node smoke-test/gemini-ai-analyst-smoke-test.mjs
```

Kedua smoke test membutuhkan `GEMINI_API_KEY` atau `GOOGLE_API_KEY` jika memakai SDK Gemini asli. Di environment test yang memakai mock SDK, smoke test tetap memvalidasi struktur fallback JSON.
