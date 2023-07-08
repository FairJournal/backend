import express, { Application } from 'express'
import cors from 'cors'
import router from './routes'
import { initFs } from './fs'
import { FileSystem } from '@fairjournal/file-system'
import fileSystemRouter from './controllers/file-system'

export let fileSystem: FileSystem
const app: Application = express()

// Middleware
app.use(express.json())
app.use(cors())

// Routes
app.use('/api', router)
app.use('/avatars', express.static('avatars'))
app.use('/fs', fileSystemRouter)

// Start server
const PORT = process.env.PORT || 5000

/**
 * Start initialization asynchronously
 */
async function start(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Initializing file system...')
  fileSystem = await initFs()
  // eslint-disable-next-line no-console
  console.log('Initialized file system!')
  // eslint-disable-next-line no-console
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
}

start().then()
