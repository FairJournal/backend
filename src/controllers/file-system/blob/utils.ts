import { assertFiles, Directory, File } from '@fairjournal/file-system'
import { assertJson, bytesToString } from '../../../utils'
import { extractArticleText, getContentByReference } from '../../../fs'

/**
 * Max length of the short article
 */
export const SHORT_ARTICLE_LENGTH = 1000

/**
 * Article index file name
 */
export const ARTICLE_INDEX_FILE_NAME = 'index-json'

/**
 * Short version of article
 */
export interface ShortArticle {
  /**
   * Human-readable name of the article
   */
  slug: string

  /**
   * Short text of the article
   */
  shortText: string

  /**
   * Custom data for preview
   */
  previewData: unknown
}

/**
 * Full article
 */
export interface Article {
  /**
   * Human-readable name of the article
   */
  slug: string

  /**
   * Full json object of the article
   */
  data: unknown

  /**
   * Custom data for preview
   */
  preview: unknown
}

/**
 * Response for `get-articles` action
 */
export interface ArticlesResponse {
  /**
   * Status of the response
   */
  status: string

  /**
   * User address
   */
  userAddress: string

  /**
   * Articles
   */
  articles: ShortArticle[]
}

/**
 * Response for `get-article` action
 */
export interface ArticleResponse {
  /**
   * Status of the response
   */
  status: string

  /**
   * User address
   */
  userAddress: string

  /**
   * Article
   */
  article: Article

  /**
   * Error message
   */
  message?: string
}

/**
 * Response for `get-path-info` action
 */
export interface PathInfoResponse {
  /**
   * Status of the response
   */
  status: string

  /**
   * User address
   */
  userAddress: string

  /**
   * Path
   */
  path: string

  /**
   * Directory or file
   */
  data: Directory | File
}

/**
 * Convert directory to short article
 *
 * @param directory Directory
 */
export async function directoryToShortArticle(directory: Directory): Promise<ShortArticle> {
  assertFiles(directory.files)
  const file = directory.files.find(file => file.name === ARTICLE_INDEX_FILE_NAME)

  if (!file) {
    throw new Error(`Article index file not found. In "${directory.name}"`)
  }

  const indexContent = bytesToString(await getContentByReference(file.hash))
  assertJson(indexContent)
  const indexObject = JSON.parse(indexContent) as Article
  const shortText = extractArticleText(indexObject, SHORT_ARTICLE_LENGTH)

  return {
    slug: directory.name.toLowerCase(),
    shortText,
    previewData: indexObject.preview,
  }
}

/**
 * Check if directory is article directory
 *
 * @param directory Directory
 */
export function isArticleDirectory(directory: Directory): boolean {
  assertFiles(directory.files)

  return Boolean(directory.files.find(file => file.name === ARTICLE_INDEX_FILE_NAME))
}

/**
 * Convert directories to short articles
 *
 * @param directories Directories
 */
export async function directoriesToShortArticles(directories: Directory[]): Promise<ShortArticle[]> {
  const articles: ShortArticle[] = []
  const filteredDirectories = directories.filter(isArticleDirectory)
  for (const directory of filteredDirectories) {
    try {
      articles.push(await directoryToShortArticle(directory))
    } catch (e) {
      /* empty */
    }
  }

  return articles
}

/**
 * Convert directory to article
 *
 * @param directory Directory
 */
export async function directoryToArticle(directory: Directory): Promise<Article> {
  if (!isArticleDirectory(directory)) {
    throw new Error(`Directory "${directory.name}" is not article directory`)
  }

  assertFiles(directory.files)
  const file = directory.files.find(file => file.name === ARTICLE_INDEX_FILE_NAME)

  if (!file) {
    throw new Error(`Article index file not found. In "${directory.name}"`)
  }

  const indexContent = bytesToString(await getContentByReference(file.hash))
  assertJson(indexContent)
  const article = JSON.parse(indexContent) as Article

  return {
    slug: directory.name.toLowerCase(),
    data: article.data,
    preview: article.preview,
  }
}
