import { fileSystem } from '../../../index'
import { NextFunction, Request, Response } from 'express'

/**
 * Check if user exists in the file system
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params

    if (!address) {
      throw new Error('Address is required')
    }

    const isUserExists = fileSystem.isUserExists(address)

    res.json({
      status: 'ok',
      isUserExists,
    })
  } catch (e) {
    next(e)
  }
}
