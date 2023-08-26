import { NextFunction, Request, Response } from 'express'
import { assertAddress, assertArticleName } from '../../../utils'
import { DEFAULT_DIRECTORY } from '../const'
import { assertDirectory, assertFile, assertFiles, Directory, File } from '@fairjournal/file-system'
import { fileSystem } from '../../../app'
import { Article, ARTICLE_INDEX_FILE_NAME, ArticleResponse, directoryToArticle } from './utils'

/**
 * Checks if the user exists in the file system. If not, an error is thrown.
 *
 * @param address The address of the user
 * @throws Will throw an error if the user does not exist in the file system
 */
function checkUserExists(address: string): void {
  if (!fileSystem.isUserExists(address)) {
    throw new Error(`User not found: "${address}"`)
  }
}

/**
 * Retrieves article data based on the user address and the slug.
 *
 * @param address The address of the user
 * @param slug The slug of the article
 * @returns The data of the article
 * @throws Will throw an error if the article is not found
 */
async function getArticleData(address: string, slug: string): Promise<File | Directory> {
  try {
    const path = `/${address}/${DEFAULT_DIRECTORY}/${slug}`

    return fileSystem.getPathInfo(path)
  } catch (e) {
    throw new Error(`Article not found: "${slug}". ${(e as Error).message}`)
  }
}

/**
 * Converts the retrieved data into an article.
 *
 * @param data The raw data of the article
 * @param slug The slug of the article
 * @returns The converted article
 * @throws Will throw an error if the data cannot be converted into an article
 */
async function convertDataToArticle(data: Directory, slug: string): Promise<Article> {
  try {
    return await directoryToArticle(data)
  } catch (e) {
    throw new Error(`Article not found: "${slug}". Error: ${(e as Error).message}`)
  }
}

/**
 * Handles the GET request to retrieve a full article.
 *
 * @param req The request object
 * @param res The response object
 * @param next The next middleware function in the stack
 */
export default async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userAddress, slug } = req.query
    assertAddress(userAddress)
    assertArticleName(slug)
    const address = userAddress.toLowerCase()
    checkUserExists(address)
    const articleData = await getArticleData(address, slug)
    assertDirectory(articleData)
    assertFiles(articleData.files)
    const indexArticle = articleData.files.find(file => file.name === ARTICLE_INDEX_FILE_NAME)
    assertFile(indexArticle)
    const article = await convertDataToArticle(articleData, slug)

    const response: ArticleResponse = {
      status: 'ok',
      userAddress,
      article,
      reference: indexArticle.hash,
    }

    res.json(response)
  } catch (e) {
    next(e)
  }
}
