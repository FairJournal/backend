import { Request, Response, NextFunction } from 'express'
import { UpdateDataSigned } from '@fairjournal/file-system'

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
 * Apply update action to the file system
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { update } = req.body as ApplyBody

    // todo check update and apply it to the file system

    res.json({
      status: 'ok',
    })
  } catch (e) {
    next(e)
  }
}
