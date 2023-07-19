// import pool from '../../../db'
// import mysql from 'mysql2/promise'
import { NextFunction, Request, Response } from 'express'
import pool from '../../../db'
import { assertReference, base64ToHex, calculateSHA256, extractHash, toAbsolutePath } from '../../../utils'
import { RowDataPacket } from 'mysql2'
import { tonstorage } from '../../../app'
import * as fs from 'fs'
import { assertDaemonResponse } from '../../../ton-utils'

/**
 * Response with file info
 */
export interface UploadActionResponse {
  /**
   * Reference in storage
   */
  reference: string

  /**
   * Mime type of the file
   */
  mime_type: string

  /**
   * Sha256 of the file
   */
  sha256: string

  /**
   * Size of the file
   */
  size: number
}

/**
 * DB model of the file
 */
export interface DBFileInfo {
  /**
   * Reference in storage
   */
  reference: string

  /**
   * Status of the file
   */
  status: number

  /**
   * Mime type of the file
   */
  mime_type: string

  /**
   * Size of the file
   */
  size: number

  /**
   * Sha256 of the file in lowercase
   */
  sha256: string

  /**
   * Date of creation
   */
  created_at?: Date

  /**
   * Date of last update
   */
  updated_at?: Date
}

/**
 * File status in database
 */
export enum FileStatus {
  /**
   * File is new, just uploaded
   */
  New = 0,

  /**
   * File is used in some article
   */
  Used = 1,
}

/**
 * Inserts file info into database
 *
 * @param info File info
 */
async function insertFileInfo(info: DBFileInfo): Promise<void> {
  const connection = await pool.getConnection()

  try {
    await connection.query(
      `INSERT INTO file (reference, status, mime_type, size, sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [info.reference, info.status, info.mime_type, info.size, info.sha256, info.created_at, info.updated_at],
    )
  } catch (error) {
    throw error
  } finally {
    connection.release()
  }
}

/**
 * Gets file info from database
 *
 * @param sha256 SHA256 of the file
 */
async function getFileInfo(sha256: string): Promise<DBFileInfo> {
  const connection = await pool.getConnection()

  try {
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM file WHERE sha256 = ?`, [sha256])

    // Check if a row was returned and then return it
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0] as DBFileInfo
    } else {
      throw new Error('No file with this sha256 exists in the database')
    }
  } catch (error) {
    throw error
  } finally {
    connection.release()
  }
}

/**
 * Checks that is file with given sha256 is uploaded
 *
 * @param sha256 SHA256 of the file
 */
async function isSha256Uploaded(sha256: string): Promise<boolean> {
  sha256 = sha256.toLowerCase()
  const connection = await pool.getConnection()

  try {
    const [rows] = await connection.query(`SELECT * FROM file WHERE sha256 = ?`, [sha256])

    // Check if rows is an array and then check its length
    if (Array.isArray(rows)) {
      return rows.length > 0
    } else {
      throw new Error('Unexpected query result format')
    }
  } catch (error) {
    return false
  } finally {
    // Don't forget to release the connection when you're done!
    connection.release()
  }
}

/**
 * Removes file and directory
 *
 * @param filePath Path to file
 * @param directoryPath Path to directory
 */
function removeFileAndDirectory(filePath: string, directoryPath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  if (fs.existsSync(directoryPath)) {
    fs.rmdirSync(directoryPath)
  }
}

/**
 * Uploads file, upload it to the storage, insert info into database and return the file info
 *
 * @param req Request
 * @param res Response
 * @param next Next function
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file

  if (!file) {
    throw new Error('File is not uploaded')
  }

  if (!file.path) {
    throw new Error('File path is not defined')
  }

  if (!file.mimetype) {
    throw new Error('File mime type is not defined')
  }

  if (!file.size) {
    throw new Error('File size is not defined')
  }

  const rootPath = process.env.FILES_ROOT_PATH || __dirname
  const filePath = toAbsolutePath(rootPath, file.path)

  try {
    const sha256 = await calculateSHA256(filePath)
    const targetDirectoryPath = toAbsolutePath(rootPath, 'blob', sha256)
    const targetFilePath = toAbsolutePath(targetDirectoryPath, 'blob')
    const isUploaded = await isSha256Uploaded(sha256)

    let fileInfo: DBFileInfo

    if (isUploaded) {
      fileInfo = await getFileInfo(sha256)
    } else {
      removeFileAndDirectory(targetFilePath, targetDirectoryPath)
      fs.mkdirSync(targetDirectoryPath)
      fs.renameSync(filePath, targetFilePath)
      const response = await tonstorage.create(targetFilePath, {
        // copy file to storage. Files should be removed later if they are not used
        copy: true,
        // description of the file
        desc: '',
        // do not upload file while article is not published
        upload: false,
      })
      let reference = ''

      if (response?.ok) {
        assertDaemonResponse(response)
        reference = base64ToHex(response.result.torrent.hash).toLowerCase()
      } else {
        if (response?.error?.includes('duplicate hash')) {
          reference = extractHash(response?.error).toLowerCase()
        } else {
          throw new Error(`Error on Ton Storage adding (${sha256}): ${response?.error || 'unknown error'}`)
        }
      }

      assertReference(reference)
      fileInfo = {
        reference,
        status: FileStatus.New,
        mime_type: file.mimetype,
        size: file.size,
        sha256,
        created_at: new Date(),
        updated_at: new Date(),
      }
      await insertFileInfo(fileInfo)
    }

    const response = {
      reference: fileInfo.reference,
      mime_type: fileInfo.mime_type,
      sha256: fileInfo.sha256,
      size: fileInfo.size,
    }

    removeFileAndDirectory(targetFilePath, targetDirectoryPath)

    res.json({
      status: 'ok',
      data: response,
    })
  } catch (e) {
    next(e)
  } finally {
    // remove uploaded file
    try {
      fs.unlinkSync(filePath)
    } catch (e) {
      /* empty */
    }
  }
}
