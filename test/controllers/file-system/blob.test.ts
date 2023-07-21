// todo change managing of the file system to configure and call when needed
process.env.SHOW_LOGS = 'false'
import path from 'path'
import { Article, ArticleResponse, ArticlesResponse } from '../../../src/controllers/file-system/blob/utils'
import knex from 'knex'
import knexConfig from '../../../knexfile'
import pool from '../../../src/db'
import supertest from 'supertest'
import app, { clearFileSystem, createTonStorageInstance, syncFileSystem } from '../../../src/app'
import {
  createAddDirectoryAction,
  createAddFileAction,
  createAddUserAction,
  personalSign,
  Update,
} from '@fairjournal/file-system'
import {
  createWallet,
  generateArticle,
  getUpdatesCount,
  removeAllTonStorageFiles,
  tonStorageFilesList,
  uploadBytes,
} from '../../utils'
import { PROJECT_NAME } from '../../../src/controllers/file-system/const'
import { stringToBytes } from '../../../src/utils'
import { GetUpdateIdResponse } from '../../../src/controllers/file-system/user/get-update-id-action'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import TonstorageCLI from 'tonstorage-cli'

const db = knex(knexConfig.development)

describe('blob', () => {
  let tonStorage: TonstorageCLI
  beforeEach(async () => {
    // Rollback the migration (if any)
    await db.migrate.rollback()

    // Run the migration
    await db.migrate.latest()
    clearFileSystem()
    tonStorage = createTonStorageInstance()
    await removeAllTonStorageFiles(tonStorage)
    expect(await tonStorageFilesList(tonStorage)).toHaveLength(0)
  })

  afterEach(async () => {
    // After each test, we can rollback the migration
    await db.migrate.rollback()
  })

  afterAll(async () => {
    // Close the database connection after all tests are done
    await db.destroy()
    await pool.end()
    await removeAllTonStorageFiles(tonStorage)
  })

  it('upload and download blob', async () => {
    const supertestApp = supertest(app)

    await syncFileSystem()
    const files = [
      {
        name: 'file1.txt',
        mime_type: 'text/plain',
        size: 12,
        sha256: 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a',
        reference: '65d9deffdec24c795d88611d32b80831c076000af7402a8b5973bf188b0b6b2d',
      },
      {
        name: 'img1.jpg',
        mime_type: 'image/jpeg',
        size: 2022171,
        sha256: '6b0f972d83497327eb8adc8a9a58177d99140322570b86773969f6e5febec698',
        reference: 'f67a56fe1f9198e1e5024eed4cc82f24137aaffb373351139c1e066a4e5d58fc',
      },
    ]

    for (const [index, file] of files.entries()) {
      const filePath = path.join(__dirname, `../../data/${file.name}`)
      for (let i = 0; i < 10; i++) {
        const response = await supertestApp.post('/v1/fs/blob/upload').attach('blob', filePath)
        expect(response.status).toBe(200)
        const data = response.body.data
        expect(data.reference).toBe(file.reference)
        expect(data.mime_type).toBe(file.mime_type)
        expect(data.sha256).toBe(file.sha256)
        expect(data.size).toBe(file.size)
      }

      expect(await tonStorageFilesList(tonStorage)).toHaveLength(index + 1)
    }
  })

  it('create and get articles', async () => {
    const supertestApp = supertest(app)

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
        const hash = await uploadBytes(tonStorage, stringToBytes(articleData))

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
