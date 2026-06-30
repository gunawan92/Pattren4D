import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import routes from './routes/index.js'

const app = express()

app.set('etag', false)
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'logic-pattren-server',
  })
})

app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
}, routes)



app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found' })
})

app.use((error, _request, response, _next) => {
  const statusCode = error.statusCode || 500

  if (statusCode >= 500) {
    console.error('Request failed:', error.message)
  }

  response.status(statusCode).json(
    error.payload || {
      message: error.message || 'Internal server error',
    },
  )
})

export default app
