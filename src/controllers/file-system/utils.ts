import { fileSystem, tonstorage } from '../../app'
import { assertString, base64ToHex, extractHash } from '../../utils'
import tmp from 'tmp'
import fs from 'fs'
import { ReferencedItem } from '@fairjournal/file-system/dist/src/file-system/interfaces/referenced-item'
import { File, Directory } from '@fairjournal/file-system'
import path from 'path'
import { getReferencePath } from '../../fs'
import { Pool } from 'mysql2/promise'
import { RowDataPacket } from 'mysql2'

/**
 * Settings key that available in the DB
 */
export enum SettingsKey {
  /**
   * File system state reference
   */
  FS_STATE_REFERENCE = 'fs_state_reference',
}

/**
 * Asserts that user exists in the file system
 *
 * @param data The data to assert
 */
export function assertUserExists(data: unknown): asserts data is string {
  const address = data as string

  if (!fileSystem.isUserExists(address)) {
    throw new Error(`User not found: "${address}"`)
  }
}

/**
 * Asserts that the data is a string path
 *
 * @param data The data to assert
 */
export function assertPath(data: unknown): asserts data is string {
  assertString(data)

  if (!data) {
    throw new Error('Path is required')
  }
}

/**
 * Get path info
 *
 * @param address User address
 * @param path Path
 */
export function getPathInfo(address: string, path: string): File | Directory {
  try {
    return fileSystem.getPathInfo(`/${address}${path}`)
  } catch (e) {
    throw new Error(`Can't get info about the path: ${(e as Error).message}`)
  }
}

/**
 * Upload data to storage
 *
 * @param path Path to the file
 * @param message Message to show in case of error
 * @param isUpload Should the file be uploaded to the storage
 */
export async function uploadToStorage(path: string, message: string, isUpload: boolean): Promise<string> {
  const response = await tonstorage.create(path, {
    // copy file to storage. Files should be removed later if they are not used
    copy: true,
    // description of the file
    desc: '',
    // do not upload file while article is not published
    upload: isUpload,
  })
  let reference = ''

  if (response?.ok) {
    reference = base64ToHex(response.result.torrent.hash).toLowerCase()
  } else {
    if (response?.error?.includes('duplicate hash')) {
      reference = extractHash(response?.error).toLowerCase()
    } else {
      throw new Error(`Error on Ton Storage adding (${message}): ${response?.error || 'unknown error'}`)
    }
  }

  return reference
}

/**
 * Method for uploading data to a storage
 *
 * @param data Data to be uploaded
 */
export async function uploadData(data: string): Promise<ReferencedItem> {
  const tempDir = tmp.dirSync()
  const tempFilePath = path.join(tempDir.name, 'blob')
  fs.writeFileSync(tempFilePath, data)
  const reference = await uploadToStorage(tempFilePath, tempFilePath, true)
  fs.rmSync(tempFilePath)
  tempDir.removeCallback()

  return {
    reference,
  }
}

/**
 * Downloads data from storage directory by reference
 *
 * @param reference Reference to the file
 */
export async function downloadData(reference: string): Promise<string> {
  const path = getReferencePath(reference)

  return fs.readFileSync(path, 'utf-8')
}

/**
 * Upserts settings
 *
 * @param pool Database pool
 * @param key Key
 * @param value Value
 */
export async function upsertSettings(pool: Pool, key: string, value: string): Promise<void> {
  const query = `
    INSERT INTO settings (\`key\`, value, created_at, updated_at)
    VALUES (?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
                         value = VALUES(value),
                         updated_at = NOW();
  `
  await pool.execute(query, [key, value])
}

/**
 * Gets setting by key
 *
 * @param pool Database pool
 * @param key Key
 */
export async function getSetting(pool: Pool, key: string): Promise<string> {
  const query = 'SELECT value FROM settings WHERE `key` = ?'
  const [rows] = await pool.execute(query, [key])

  const rowData = rows as RowDataPacket[]

  if (rowData.length === 0) {
    throw new Error(`No setting found for key: ${key}`)
  }

  return rowData[0].value as string
}
