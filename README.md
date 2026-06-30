# Logic Pattren Frontend

Vue 3 dashboard untuk membaca hasil draw dan menjalankan engine analisa dari backend Logic Pattren.

## Install

```bash
npm install
```

## Environment

Buat file `.env` di root frontend jika backend tidak berjalan di default `localhost:4105`.

```env
VITE_API_BASE_URL=http://localhost:4105
```

## Run

```bash
npm run dev
```

Frontend hanya memanggil backend API. Jangan masukkan credential MongoDB di frontend.
