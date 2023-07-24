import { NextFunction, Request, Response } from 'express'
import { assertAddress } from '../../../utils'
import { PathInfoResponse } from './utils'
import { assertPath, assertUserExists, getPathInfo } from '../utils'

/**
 * Handles the GET request to retrieve a path info
 *
 * @param req The request object
 * @param res The response object
 * @param next The next middleware function in the stack
 */
export default (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userAddress, path } = req.query
    assertAddress(userAddress)
    assertPath(path)

    const address = userAddress.toLowerCase()
    assertUserExists(address)
    const data = getPathInfo(address, path)

    const response: PathInfoResponse = {
      status: 'ok',
      userAddress,
      path,
      data,
    }

    res.json(response)
  } catch (e) {
    next(e)
  }
}
