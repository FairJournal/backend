import { NextFunction, Request, Response } from 'express'
import { assertAddress } from '../../../utils'
import { fileSystem } from '../../../app'

/**
 * Check if user exists in the file system
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.query
    assertAddress(address)

    const isUserExists = fileSystem.isUserExists(address.toLowerCase())

    res.json({
      status: 'ok',
      address: address.toLowerCase(),
      isUserExists,
    })
  } catch (e) {
    next(e)
  }
}
