import express from 'express'
import cors from 'cors'
import billsRouter from './routes/bills.js'
import brandingRouter from './routes/branding.js'

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/api/bills', billsRouter)
app.use('/api/branding', brandingRouter)

export default app 