import { NextFunction, Request, Response } from 'express'
import { assertAddress } from '../../../utils'
import { fileSystem } from '../../../app'

/**
 * Gets current user's update id
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.query
    assertAddress(address)

    const addressLowerCased = address.toLowerCase()
    const updateId = fileSystem.getUpdateId(addressLowerCased)

    res.json({
      status: 'ok',
      address: addressLowerCased,
      updateId,
    })
  } catch (e) {
    next(e)
  }
}
