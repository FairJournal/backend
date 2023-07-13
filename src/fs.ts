import { assertUpdateDataSignedArray, FileSystem } from '@fairjournal/file-system'
import { PROJECT_NAME } from './controllers/file-system/const'
import { Pool, RowDataPacket } from 'mysql2/promise'
import pool from './db'

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
