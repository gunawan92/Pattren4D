import dotenv from 'dotenv'
import app from './app.js'
import { connectDb } from './config/db.js'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const port = Number(process.env.PORT || 4105)

async function start() {
  try {
    await connectDb()

    app.listen(port, () => {
      console.log(`Logic Pattren server listening on port ${port}`)
    })
  } catch (error) {
    console.error('Server failed to start:', error.message)
    process.exit(1)
  }
}

start()
