import { NextFunction, Request, Response } from 'express'
import { assertAddress, assertArticleName } from '../../../utils'
import { DEFAULT_DIRECTORY } from '../const'
import { assertDirectory } from '@fairjournal/file-system'
import { fileSystem } from '../../../app'

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userAddress, articleName } = req.query
    assertAddress(userAddress)
    assertArticleName(articleName)

    const path = `/${userAddress.toLowerCase()}/${DEFAULT_DIRECTORY}/${articleName}`
    const data = fileSystem.getPathInfo(path)
    assertDirectory(data)
    res.json({
      status: 'ok',
      data,
    })
  } catch (e) {
    next(e)
  }
}
