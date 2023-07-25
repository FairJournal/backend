import { Request, Response, NextFunction } from 'express'
import { ActionType, AddFileActionData, UpdateDataSigned } from '@fairjournal/file-system'
import { fileSystem, tonstorage } from '../../../app'
import { assertObject, assertReference, getPathParts } from '../../../utils'
import { DEFAULT_DIRECTORY } from '../const'
import { assertUpdateDataSigned } from '@fairjournal/file-system'
import pool from '../../../db'
import { OkPacket } from 'mysql2'
import { isReferenceExists } from '../../../fs'
import { FileStatus } from '../types'

/**
 * Request body
 */
export interface ApplyBody {
  /**
   * Update data
   */
  update: UpdateDataSigned
}

/**
 * Insert update to db for backup
 *
 * @param update Update data
 *
 * @returns ID of the inserted row
 */
async function insertUpdate(update: UpdateDataSigned): Promise<number> {
  const query = `
      INSERT INTO fs_update(public_key, update_id, \`update\`)
      VALUES (?, ?, ?)
  `

  // Execute the query
  const results = (
    await pool.execute(query, [update.userAddress.toLowerCase(), update.id, JSON.stringify(update)])
  )[0] as OkPacket

  return results.insertId
}

/**
 * Validate update for the gateway
 *
 * @param update Update data
 */
async function validateUpdate(update: UpdateDataSigned): Promise<string[]> {
  const references: string[] = []
  for (const action of update.actions) {
    if (action.actionType === ActionType.addDirectory) {
      // commented because user should add profile file. define it here or allow full control
      // const data = action.actionData as AddDirectoryActionData
      // if (!(data.path === `/${DEFAULT_DIRECTORY}` || data.path.startsWith(`/${DEFAULT_DIRECTORY}/`))) {
      //   throw new Error(`Invalid path: "${data.path}". All files should be inside "/articles" folder`)
      // }
    } else if (action.actionType === ActionType.addFile) {
      const data = action.actionData as AddFileActionData
      references.push(await validateAndGetAddFileReference(data))
    } else if (action.actionType === ActionType.addUser) {
      // skip it
    } else if (action.actionType === ActionType.removeDirectory) {
      // skip it
    } else if (action.actionType === ActionType.removeFile) {
      // skip it
    } else {
      throw new Error(`Unknown action type: "${action.actionType}"`)
    }
  }

  return references
}

/**
 * Updates file status in database
 *
 * @param reference Reference of the file
 * @param status New status of the file
 */
async function updateFileStatus(reference: string, status: FileStatus): Promise<void> {
  const connection = await pool.getConnection()

  try {
    await connection.query(`UPDATE file SET status = ?, updated_at = ? WHERE reference = ?`, [
      status,
      new Date(),
      reference,
    ])
  } catch (error) {
    throw error
  } finally {
    connection.release()
  }
}

/**
 * Checks that update is correct and returns the references of the file
 *
 * @param data Update data
 */
async function validateAndGetAddFileReference(data: AddFileActionData): Promise<string> {
  const reference = data.hash.toLowerCase()
  assertReference(reference)

  if (!(await isReferenceExists(reference))) {
    throw new Error(`Reference "${reference}" not found`)
  }

  const parts = getPathParts(data.path)

  if (!(data.path.startsWith(`/${DEFAULT_DIRECTORY}/`) || parts.length < 3 || parts[0] !== DEFAULT_DIRECTORY)) {
    throw new Error(`Invalid path: "${data.path}". All files should be inside "/articles/NAMEOFARTICLE/" folder`)
  }

  return reference
}

/**
 * Publish all files from the update
 *
 * @param update Update data
 */
async function publishAllFiles(update: UpdateDataSigned): Promise<string[]> {
  const references: string[] = []
  for (const action of update.actions) {
    if (action.actionType === ActionType.addFile) {
      const data = action.actionData as AddFileActionData
      references.push(await validateAndGetAddFileReference(data))
    }
  }

  for (const reference of references) {
    await updateFileStatus(reference, FileStatus.Used)
    await tonstorage.uploadResume(reference)
  }

  return references
}

/**
 * Apply update action to the file system
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { update } = req.body as ApplyBody
    assertObject(update)
    assertUpdateDataSigned(update)
    await validateUpdate(update)
    fileSystem.addUpdate(update)
    await insertUpdate(update)
    await publishAllFiles(update)

    res.json({
      status: 'ok',
    })
  } catch (e) {
    next(e)
  }
}
