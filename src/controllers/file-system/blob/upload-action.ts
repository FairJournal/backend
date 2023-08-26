import { NextFunction, Request, Response } from 'express'
import pool from '../../../db'
import { assertReference, calculateSHA256, toAbsolutePath } from '../../../utils'
import { RowDataPacket } from 'mysql2'
import { tonstorage } from '../../../app'
import * as fs from 'fs'
import { FileStatus } from '../types'
import { getReferencePath } from '../../../fs'
import path from 'path'
import { uploadToStorage } from '../utils'

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
  fs.rmSync(filePath, {
    force: true,
  })

  fs.rmSync(directoryPath, {
    recursive: true,
    force: true,
  })
}

/**
 * Validate the uploaded file
 *
 * @param file File to be validated
 * @throws Will throw an error if the file or its properties are not valid
 */
function assertValidFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
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
}

/**
 * Handle file upload and storage
 *
 * @param filePath Path to the file
 * @param targetFilePath Target path of the file
 * @param targetDirectoryPath Target directory of the file
 * @param sha256 SHA256 of the file
 * @param file File to be uploaded
 * @returns fileInfo Information about the file in the database
 * @throws Will throw an error if the storage adding fails
 */
async function handleFileUpload(
  filePath: string,
  targetFilePath: string,
  targetDirectoryPath: string,
  sha256: string,
  file: Express.Multer.File,
): Promise<DBFileInfo> {
  let fileInfo: DBFileInfo
  const isUploaded = await isSha256Uploaded(sha256)

  if (isUploaded) {
    fileInfo = await getFileInfo(sha256)
  } else {
    if (!tonstorage) {
      throw new Error('Ton Storage is not initialized')
    }

    removeFileAndDirectory(targetFilePath, targetDirectoryPath)
    fs.mkdirSync(targetDirectoryPath, { recursive: true })
    fs.renameSync(filePath, targetFilePath)
    const reference = await uploadToStorage(targetFilePath, sha256, false)
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

  return fileInfo
}

/**
 * Checks that path is exists
 *
 * @param path Path to check
 * @param message Message to be thrown if path does not exist
 */
function checkPathExists(path: string, message: string): void {
  if (!fs.existsSync(path)) {
    throw new Error(`Path "${path}" does not exist. Message: ${message}`)
  }
}

/**
 * Removes the uploaded file at the provided filePath.
 *
 * @async
 * @param filePath Path to the file that should be removed.
 * @throws Will throw an error if the removal operation fails.
 */
async function removeUploadedFile(filePath: string): Promise<void> {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (e) {
    /* empty */
  }
}

/**
 * Sets the permissions of a directory and a file to 0755.
 *
 * @param reference Reference of the file
 */
function setPermissions(reference: string): void {
  const filePath = getReferencePath(reference)
  try {
    fs.chmodSync(path.dirname(filePath), 0o755)
    fs.chmodSync(filePath, 0o755)
  } catch (error) {
    /* empty */
  }
}

/**
 * Uploads file, upload it to the storage, insert info into database and return the file info
 *
 * @param req Request
 * @param res Response
 * @param next Next function
 */
export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let filePath = ''

  try {
    const rootPath = process.env.FILES_ROOT_PATH || __dirname
    checkPathExists(rootPath, 'root path')

    const file = req.file
    assertValidFile(file)

    filePath = toAbsolutePath(rootPath, file.path)
    checkPathExists(filePath, 'file path')

    const sha256 = await calculateSHA256(filePath)
    const targetDirectoryPath = toAbsolutePath(rootPath, 'blob', sha256)
    const targetFilePath = toAbsolutePath(targetDirectoryPath, 'blob')

    const fileInfo = await handleFileUpload(filePath, targetFilePath, targetDirectoryPath, sha256, file)
    setPermissions(fileInfo.reference)
    removeFileAndDirectory(targetFilePath, targetDirectoryPath)

    res.json({
      status: 'ok',
      data: {
        reference: fileInfo.reference,
        mime_type: fileInfo.mime_type,
        sha256: fileInfo.sha256,
        size: fileInfo.size,
      },
    })
  } catch (e) {
    next(e)
  } finally {
    await removeUploadedFile(filePath)
  }
}
