import { assertUpdateDataSignedArray, FileSystem } from '@fairjournal/file-system'
import { PROJECT_NAME } from './controllers/file-system/const'
import { Pool, RowDataPacket } from 'mysql2/promise'
import pool from './db'
import { assertString, isString } from './utils'
import * as fs from 'fs'
import path from 'path'

/**
 * Function for processing batches of data
 */
type AsyncFunction = (records: any[]) => Promise<void>

/**
 * Gets batches of data from DB and processes them
 *
 * @param pool DB pool
 * @param asyncFn Function to process the data
 */
async function processInBatches(pool: Pool, asyncFn: AsyncFunction): Promise<void> {
  const limit = 1000

  // Get the total count of records
  const [countResult] = await pool.execute('SELECT COUNT(*) AS count FROM fs_update')
  const totalRecords = Number(((countResult as RowDataPacket[])[0] as any).count)

  // Calculate the total number of iterations needed (each iteration fetches 'limit' records)
  const iterations = Math.ceil(totalRecords / limit)

  for (let i = 0; i < iterations; i++) {
    const offset = i * limit

    const [rows] = (await pool.execute(
      `
  SELECT * FROM fs_update
  LIMIT ?
  OFFSET ?
`,
      [limit.toString(), offset.toString()],
    )) as [RowDataPacket[], any]

    await asyncFn(rows)
  }
}

/**
 * Initialize file system using DB
 */
export function initFs(): FileSystem {
  return new FileSystem({
    version: '0.0.1',
    projectName: PROJECT_NAME,
    projectDescription: 'A creative platform owned by people.',
    checkSignature: 'ton',
  })
}

/**
 * Sync file system with DB
 *
 * @param fs File system
 */
export async function syncFs(fs: FileSystem): Promise<void> {
  if (!fs) {
    throw new Error('File system is not initialized')
  }

  await processInBatches(pool, async data => {
    const updates = data.map(item => JSON.parse(item.update))
    assertUpdateDataSignedArray(updates)
    updates.forEach(update => fs.addUpdate(update))
  })
}

/**
 * Gets reference path on the local file system
 *
 * @param reference Reference
 */
export function getReferencePath(reference: string): string {
  const storagePath = process.env.TON_STORAGE_DATABASE_PATH
  assertString(storagePath)

  if (!storagePath) {
    throw new Error('Storage path is not defined')
  }

  return path.resolve(storagePath, 'torrent/torrent-files', reference.toUpperCase(), 'blob')
}

/**
 * Checks if reference exists
 *
 * @param reference
 */
export async function isReferenceExists(reference: string): Promise<boolean> {
  return fs.existsSync(getReferencePath(reference))
}

/**
 * Gets content by reference
 *
 * @param reference Reference
 */
export async function getContentByReference(reference: string): Promise<Uint8Array> {
  const filePath = getReferencePath(reference)

  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist`)
  }

  return fs.readFileSync(filePath)
}

/**
 * Extracts article text from JSON object
 *
 * @param jsonObject JSON object
 * @param symbols Number of symbols to extract
 */
export function extractArticleText(jsonObject: unknown, symbols: number): string {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const blocks = jsonObject.data.blocks as { type: string; data: { text: string } }[]
  const paragraphs = blocks
    .filter(block => block?.type === 'paragraph')
    .filter(block => isString(block?.data?.text))
    .map(block => {
      const text = block.data.text

      return text.replace(/<\/?[^>]+(>|$)/g, '')
    })
    .join(' ')

  return paragraphs.slice(0, symbols)
}
