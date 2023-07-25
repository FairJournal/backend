import { Request, Response, NextFunction } from 'express'
import pool from '../../../db'
import { getSetting } from '../utils'
import { assertString } from '../../../utils'

/**
 * Gets settings from db
 *
 * @param req Request
 * @param res Response
 * @param next Next function
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.query

    if (!key) {
      throw new Error('"key" is not set')
    }

    assertString(key)
    const settingValue = await getSetting(pool, key)

    res.json({
      status: 'ok',
      value: settingValue,
    })
  } catch (e) {
    next(e)
  }
}
