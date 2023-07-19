import { NextFunction, Request, Response } from 'express'
import { assertReference } from '../../../utils'

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.query
    assertReference(id)
    throw new Error('Not implemented. Use static storage instead')
  } catch (e) {
    next(e)
  }
}
