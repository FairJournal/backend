import { NextFunction, Request, Response } from 'express'
import { assertAddress, assertArticleName } from '../../../utils'
import { DEFAULT_DIRECTORY } from '../const'
import { assertDirectory } from '@fairjournal/file-system'
import { fileSystem } from '../../../app'
import { ArticleResponse, directoryToArticle } from './utils'

/**
 * Gets full article info
 *
 * @param req Request
 * @param res Response
 * @param next Next function
 */
export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userAddress, slug } = req.query
    assertAddress(userAddress)
    assertArticleName(slug)

    const address = userAddress.toLowerCase()

    if (!fileSystem.isUserExists(address)) {
      throw new Error(`User not found: "${address}"`)
    }

    const path = `/${address}/${DEFAULT_DIRECTORY}/${slug}`
    let data
    try {
      data = fileSystem.getPathInfo(path)
    } catch (e) {
      throw new Error(`Article not found: "${slug}". ${(e as Error).message}`)
    }

    assertDirectory(data)
    const article = await directoryToArticle(data)

    // todo cache response for a long time (until deleted by the user)
    const response: ArticleResponse = {
      status: 'ok',
      userAddress,
      article,
    }

    res.json(response)
  } catch (e) {
    next(e)
  }
}
