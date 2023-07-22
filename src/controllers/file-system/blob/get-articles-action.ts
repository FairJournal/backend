import { NextFunction, Request, Response } from 'express'
import { assertAddress } from '../../../utils'
import { DEFAULT_DIRECTORY } from '../const'
import { assertDirectories, assertDirectory } from '@fairjournal/file-system'
import { fileSystem } from '../../../app'
import { ArticlesResponse, directoriesToShortArticles } from './utils'

/**
 * Get articles of the user
 *
 * @param req Request
 * @param res Response
 * @param next Next function
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userAddress } = req.query

    assertAddress(userAddress)

    if (!fileSystem.isUserExists(userAddress.toLowerCase())) {
      throw new Error(`User not found: "${userAddress}"`)
    }

    const path = `/${userAddress.toLowerCase()}/${DEFAULT_DIRECTORY}`

    let data
    try {
      data = fileSystem.getPathInfo(path)
    } catch (e) {
      throw new Error(`Articles not found. ${(e as Error).message}`)
    }

    assertDirectory(data)
    assertDirectories(data.directories)
    const articles = await directoriesToShortArticles(data.directories)

    // todo cache this object for N minutes. And invalidate cache when new article is added
    const response: ArticlesResponse = {
      status: 'ok',
      userAddress,
      articles,
    }

    res.json(response)
  } catch (e) {
    next(e)
  }
}
