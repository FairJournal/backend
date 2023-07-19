import express, { Application } from 'express'
import cors from 'cors'
import router from './routes'
import fileSystemRouter from './controllers/file-system'
import { FileSystem } from '@fairjournal/file-system'
import { initFs, syncFs } from './fs'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import TonstorageCLI from 'tonstorage-cli'
import { delay } from './utils'

const app: Application = express()
export let fileSystem: FileSystem

export let tonstorage: TonstorageCLI

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
 * Waits for TonStorage to be ready
 *
 * @param tonStorage TonStorage instance
 */
export async function waitTonStorage(tonStorage: TonstorageCLI): Promise<void> {
  /**
   * TonStorage provider info response
   */
  interface Response {
    ok: boolean
    error?: string
    code: number
  }

  const maxAttempts = parseInt(process.env.TON_STORAGE_WAIT_ATTEMPTS || '10')
  const waitTime = parseInt(process.env.TON_STORAGE_CHECK_WAIT_TIMEOUT || '3000')

  let isReady = false
  let attempts = 0

  while (!isReady && attempts < maxAttempts) {
    attempts += 1

    try {
      const providerInfo = (await tonStorage.getProviderInfo()) as Response

      if (providerInfo && providerInfo.error && providerInfo.error.includes('timeout')) {
        // eslint-disable-next-line no-console
        console.log(`Ton Storage: connection timeout occurred. Waiting and retrying (${attempts}/${maxAttempts})...`)
        await delay(waitTime)
      } else {
        isReady = true
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('An error occurred. Waiting for TonStorage...')
      await delay(waitTime)
    }
  }

  if (!isReady) {
    throw new Error(`Failed to get provider info after ${maxAttempts} attempts.`)
  }
}

/**
 * Creates TonStorage instance
 */
export function createTonStorageInstance(): TonstorageCLI {
  return new TonstorageCLI({
    bin: process.env.TON_STORAGE_BIN_PATH,
    host: process.env.TON_STORAGE_HOST,
    database: process.env.TON_STORAGE_DATABASE_PATH,
    timeout: Number(process.env.TON_STORAGE_TIMEOUT),
  })
}

/**
 * Start initialization asynchronously
 */
export async function syncFileSystem(): Promise<void> {
  log('Connecting to TonStorage...')
  tonstorage = createTonStorageInstance()

  await waitTonStorage(tonstorage)
  log('Connected to TonStorage!')
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
