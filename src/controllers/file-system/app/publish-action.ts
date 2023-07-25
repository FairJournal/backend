import { NextFunction, Request, Response } from 'express'
import { fileSystem } from '../../../app'
import { SettingsKey, uploadData, upsertSettings } from '../utils'
import pool from '../../../db'

/**
 * Publish action body
 */
export interface PublishBody {
  /**
   * Password for the update
   */
  password: string
}

/**
 * Publish action for the file system
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body as PublishBody

    if (!process.env.PUBLISH_FS_PASSWORD) {
      throw new Error('Publish password is not set in .env')
    }

    if (password !== process.env.PUBLISH_FS_PASSWORD) {
      throw new Error('Invalid password')
    }

    const uploadResult = await fileSystem.upload({
      uploadData: uploadData,
    })

    const reference = uploadResult.reference
    await upsertSettings(pool, SettingsKey.FS_STATE_REFERENCE, reference)
    // todo send tx to smart contract with the actual reference
    // todo send tx if only changed

    res.json({
      status: 'ok',
      reference,
    })
  } catch (e) {
    next(e)
  }
}
