import { Request, Response, NextFunction } from 'express'
import { ActionType, AddDirectoryActionData, AddFileActionData, UpdateDataSigned } from '@fairjournal/file-system'
import { fileSystem } from '../../../app'
import { assertObject, assertReference, getPathParts } from '../../../utils'
import { DEFAULT_DIRECTORY } from '../const'
import { assertUpdateDataSigned } from '@fairjournal/file-system'
import pool from '../../../db'
import { OkPacket } from 'mysql2'

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
function validateUpdate(update: UpdateDataSigned): string[] {
  // todo check that all references are uploaded via the gateway
  const references: string[] = []
  update.actions.forEach(action => {
    if (action.actionType === ActionType.addDirectory) {
      const data = action.actionData as AddDirectoryActionData

      if (!(data.path === `/${DEFAULT_DIRECTORY}` || data.path.startsWith(`/${DEFAULT_DIRECTORY}/`))) {
        throw new Error(`Invalid path: "${data.path}". All files should be inside "/articles" folder`)
      }
    } else if (action.actionType === ActionType.addFile) {
      const data = action.actionData as AddFileActionData
      const reference = data.hash.toLowerCase()
      assertReference(reference)
      references.push(reference)
      const parts = getPathParts(data.path)

      if (!(data.path.startsWith(`/${DEFAULT_DIRECTORY}/`) || parts.length < 3 || parts[0] !== DEFAULT_DIRECTORY)) {
        throw new Error(`Invalid path: "${data.path}". All files should be inside "/articles/NAMEOFARTICLE/" folder`)
      }
    } else if (action.actionType === ActionType.addUser) {
      // skip it
    } else {
      throw new Error(`Unknown action type: "${action.actionType}"`)
    }
  })

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
    validateUpdate(update)
    fileSystem.addUpdate(update)
    await insertUpdate(update)

    res.json({
      status: 'ok',
    })
  } catch (e) {
    next(e)
  }
}
