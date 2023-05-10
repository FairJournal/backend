import express, { Application } from 'express'
import cors from 'cors'
import router from './routes'
import multer from 'multer'
export const upload = multer()

const app: Application = express()

// Middleware
app.use(express.json())
app.use(upload.array())
app.use(cors())

// Routes
app.use('/api', router)

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
