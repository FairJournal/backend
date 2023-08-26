import { NextFunction, Request, Response } from 'express'
import { assertAddress } from '../../../utils'
import { fileSystem } from '../../../app'

/**
 * Response of the get update id action
 */
export interface GetUpdateIdResponse {
  /**
   * Status of the request
   */
  status: string

  /**
   * Address of the user
   */
  address: string

  /**
   * Update id
   */
  updateId: number
}

/**
 * Gets current user's update id
 */
export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { address } = req.query
    assertAddress(address)

    const addressLowerCased = address.toLowerCase()
    const updateId = fileSystem.getUpdateId(addressLowerCased)
    const data: GetUpdateIdResponse = {
      status: 'ok',
      address: addressLowerCased,
      updateId,
    }

    res.json(data)
  } catch (e) {
    next(e)
  }
}
