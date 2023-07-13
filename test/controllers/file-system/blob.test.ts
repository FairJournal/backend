// todo change managing of the file system to configure and call when needed
process.env.SHOW_LOGS = 'false'
import { Article, ArticleResponse, ArticlesResponse } from '../../../src/controllers/file-system/blob/utils'
import knex from 'knex'
import knexConfig from '../../../knexfile'
import pool from '../../../src/db'
import supertest from 'supertest'
import app, { clearFileSystem } from '../../../src/app'
import {
  createAddDirectoryAction,
  createAddFileAction,
  createAddUserAction,
  personalSign,
  Update,
} from '@fairjournal/file-system'
import { createWallet, generateArticle, getFakeStorage, getUpdatesCount } from '../../utils'
import { PROJECT_NAME } from '../../../src/controllers/file-system/const'
import { stringToBytes } from '../../../src/utils'
import { GetUpdateIdResponse } from '../../../src/controllers/file-system/user/get-update-id-action'

const db = knex(knexConfig.development)

describe('blob', () => {
  beforeEach(async () => {
    // Rollback the migration (if any)
    await db.migrate.rollback()

    // Run the migration
    await db.migrate.latest()
    clearFileSystem()
  })

  afterEach(async () => {
    // After each test, we can rollback the migration
    await db.migrate.rollback()
  })

  afterAll(async () => {
    // Close the database connection after all tests are done
    await db.destroy()
    pool.end()
  })

  it('create and get articles', async () => {
    const supertestApp = supertest(app)
    const storage = getFakeStorage()

    const authors = await Promise.all(
      Array.from({ length: 3 }, async () => {
        const wallet = await createWallet()

        return {
          address: wallet.publicKey.toString('hex'),
          personalSign: (data: string) => personalSign(data, wallet.secretKey),
          articles: [generateArticle(), generateArticle(), generateArticle()] as Article[],
        }
      }),
    )

    for (const author of authors) {
      const update = new Update(PROJECT_NAME, author.address, 1)
      update.addAction(createAddUserAction(author.address))
      update.addAction(createAddDirectoryAction('/articles'))
      update.setSignature(author.personalSign(update.getSignData()))
      const response = await supertestApp.post('/v1/fs/update/apply').send({ update })
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({ status: 'ok' })

      for (let articleIndex = 0; articleIndex < author.articles.length; articleIndex++) {
        const article = author.articles[articleIndex]
        const articleData = JSON.stringify(article)
        const hash = await storage.upload(stringToBytes(articleData))

        const updatesInfo = (await supertestApp.get(`/v1/fs/user/get-update-id?address=${author.address}`))
          .body as GetUpdateIdResponse
        const update = new Update(PROJECT_NAME, author.address, updatesInfo.updateId + 1)
        update.addAction(createAddDirectoryAction(`/articles/${article.slug}`))
        update.addAction(
          createAddFileAction({
            path: `/articles/${article.slug}/index-json`,
            mimeType: 'application/json',
            size: articleData.length,
            hash,
          }),
        )
        update.setSignature(author.personalSign(update.getSignData()))
        const response = await supertestApp.post('/v1/fs/update/apply').send({ update })
        expect(response.status).toBe(200)
        expect(response.body).toStrictEqual({ status: 'ok' })
      }
    }

    // 3*1 - registrations = 3, 3*3 - articles = 9, total 12
    expect(await getUpdatesCount(db)).toEqual(12)

    for (const author of authors) {
      const articlesList = (await supertestApp.get(`/v1/fs/blob/get-articles?userAddress=${author.address}`))
        .body as ArticlesResponse
      expect(articlesList.status).toBe('ok')
      expect(articlesList.userAddress).toBe(author.address)
      expect(articlesList.articles.length).toBe(author.articles.length)
      for (let articleIndex = 0; articleIndex < author.articles.length; articleIndex++) {
        const article = author.articles[articleIndex]

        // check short version of the article
        const articleInfo = articlesList.articles[articleIndex]
        expect(articleInfo.slug).toBe(article.slug)
        expect(articleInfo.shortText).toBeDefined()

        // check full version of the article
        const fsArticle = (
          await supertestApp.get(`/v1/fs/blob/get-article?userAddress=${author.address}&slug=${article.slug}`)
        ).body as ArticleResponse
        expect(fsArticle.status).toBe('ok')
        expect(fsArticle.userAddress).toBe(author.address)
        expect(fsArticle.article.slug).toStrictEqual(article.slug)
        expect(fsArticle.article.data).toBeDefined()
      }
    }
  })
})
