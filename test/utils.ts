import { getSecureRandomBytes, KeyPair, keyPairFromSeed } from 'ton-crypto'
import { Knex } from 'knex'
import { Article } from '../src/controllers/file-system/blob/utils'
import { TonstorageCLI } from 'tonstorage-cli'
import { Torrent } from '../src/ton-utils'
import { base64ToHex, extractHash } from '../src/utils'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Fake storage
 */
export interface FakeStorage {
  /**
   * Uploads data to the storage and returns its reference
   *
   * @param data Data to upload
   */
  upload: (data: Uint8Array) => Promise<string>

  /**
   * Downloads data from the storage by its reference
   *
   * @param reference Reference to download
   */
  download: (reference: string) => Promise<Uint8Array>
}

export const UPDATES_TABLE_NAME = 'fs_update'

/**
 * According: https://github.com/ton-foundation/specs/blob/main/specs/wtf-0002.md
 */
export const TON_SAFE_SIGN_MAGIC = 'ton-safe-sign-magic'

/**
 * Creates TON wallet with public and secret keys
 */
export async function createWallet(): Promise<KeyPair> {
  const seed: Buffer = await getSecureRandomBytes(32) // seed is always 32 bytes

  return keyPairFromSeed(seed)
}

/**
 * Gets the number of records in the table
 *
 * @param db Database
 * @param tableName Table name
 */
export async function getRecordCount(db: Knex, tableName: string): Promise<number> {
  const result = await db(tableName).count('* as count')

  return Number(result[0].count)
}

/**
 * Gets the number of records in the updates table
 *
 * @param db Database
 */
export async function getUpdatesCount(db: Knex): Promise<number> {
  return getRecordCount(db, UPDATES_TABLE_NAME)
}

/**
 * Generates a random number
 *
 * @param max Max value
 */
export function randomNumber(max = 1000): number {
  return Math.floor(Math.random() * max)
}

/**
 * Generates a random article
 */
export function generateArticle(): Article {
  const articleId = randomNumber()

  return {
    slug: `article-${articleId}`,
    data: {
      blocks: [
        {
          type: 'title',
          text: `Article ${articleId}`,
        },
        {
          type: 'paragraph',
          text: 'Hello world! Paragraph 1.',
        },
        {
          type: 'paragraph',
          text: 'Hello world 2222 Paragraph 2',
        },
        {
          type: 'paragraph',
          text: 'Hello world 33333 Paragraph 3',
        },
      ],
    },
  }
}

/**
 * Pads the string with zeros to the desired length
 *
 * @param input Input string
 * @param resultSize Desired length
 */
export function padStringWithZeros(input: string, resultSize = 64): string {
  // 'padStart' adds zeros to the start of the string until it reaches the desired length
  return input.padStart(resultSize, '0')
}

/**
 * Gets fake storage instance
 */
export function getFakeStorage(): FakeStorage {
  let index = 0
  const storage: Record<string, Uint8Array> = {}

  return {
    upload: async (data: Uint8Array): Promise<string> => {
      index++

      const reference = padStringWithZeros(index.toString())
      storage[reference] = data

      return reference
    },
    download: async (reference: string): Promise<Uint8Array> => {
      if (!storage[reference]) {
        throw new Error(`Reference "${reference}" not found`)
      }

      return storage[reference]
    },
  }
}

/**
 * Gets list of torrents from ton-storage
 *
 * @param tonStorage Ton-storage instance
 */
export async function tonStorageFilesList(tonStorage: TonstorageCLI): Promise<Torrent[]> {
  const list = await tonStorage.list()

  if (!list?.ok) {
    throw new Error(`Failed to get list of torrents from ton-storage: ${JSON.stringify(list)}`)
  }

  return (list?.result?.torrents || []) as Torrent[]
}

/**
 * Removes all files from ton-storage
 *
 * @param tonStorage Ton-storage instance
 */
export async function removeAllTonStorageFiles(tonStorage: TonstorageCLI): Promise<void> {
  const torrents = await tonStorageFilesList(tonStorage)
  const itemsList = torrents || []
  for (const item of itemsList) {
    await tonStorage.remove(base64ToHex(item.hash))
  }
}

/**
 * Writes data to a temporary file and returns its path
 *
 * @param data Data to write
 * @param name File name
 */
export async function writeTempFile(data: Uint8Array, name = 'blob'): Promise<string> {
  const dirName = crypto.randomBytes(16).toString('hex')
  const tempDir = os.tmpdir()
  const dirPath = path.join(tempDir, dirName)
  fs.mkdirSync(dirPath)
  const filePath = path.join(dirPath, name)
  fs.writeFileSync(filePath, data)

  return filePath
}

/**
 * Uploads bytes to ton-storage
 *
 * @param tonStorage Ton-storage instance
 * @param bytes Bytes to upload
 */
export async function uploadBytes(tonStorage: TonstorageCLI, bytes: Uint8Array): Promise<string> {
  const filePath = await writeTempFile(bytes)
  let response
  try {
    response = await tonStorage.create(filePath, {
      copy: true,
      desc: '',
      upload: false,
    })
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  let reference

  if (response?.ok) {
    reference = base64ToHex(response.result.torrent.hash)
  } else if (response?.error?.includes('duplicate hash')) {
    reference = extractHash(response?.error)
  } else {
    throw new Error(`Failed to upload bytes to ton-storage: ${JSON.stringify(response)}`)
  }

  return reference.toLowerCase()
}
