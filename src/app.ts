import express, { Application } from 'express'
import cors from 'cors'
import router from './routes'
import fileSystemRouter from './controllers/file-system'
import { FileSystem } from '@fairjournal/file-system'
import { initFs, syncFs } from './fs'

const app: Application = express()
export let fileSystem: FileSystem

export const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const error = {
    status: 'error',
    message: err.message,
  }

  res.status(500).json(error)
}

// Middleware
app.use(express.json())
app.use(cors())

// Routes
app.use('/api', router)
app.use('/avatars', express.static('avatars'))
app.use('/v1/fs', fileSystemRouter)
app.use(errorHandler)

function log(message: string): void {
  if (process.env.SHOW_LOGS === 'true') {
    // eslint-disable-next-line no-console
    console.log(message)
  }
}

/**
 * Start initialization asynchronously
 */
export async function syncFileSystem(): Promise<void> {
  log('Sync file system...')
  await syncFs(fileSystem)
  log('File system synced!')
}

/**
 * Clear file system
 */
export function clearFileSystem(): void {
  fileSystem = initFs()
}

export default app
