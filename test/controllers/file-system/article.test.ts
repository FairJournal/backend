// todo change managing of the file system to configure and call when needed
process.env.SHOW_LOGS = 'false'
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
  createRemoveDirectoryAction,
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
import { TonstorageCLI } from 'tonstorage-cli'

const db = knex(knexConfig.development)

describe('Article', () => {
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

  it('create and get articles', async () => {
    await syncFileSystem()
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

  it('get non-existing article for an existing user', async () => {
    const supertestApp = supertest(app)
    const wallet = await createWallet()
    const author = {
      address: wallet.publicKey.toString('hex'),
      personalSign: (data: string) => personalSign(data, wallet.secretKey),
    }

    const update = new Update(PROJECT_NAME, author.address, 1)
    update.addAction(createAddUserAction(author.address))
    update.setSignature(author.personalSign(update.getSignData()))
    await supertestApp.post('/v1/fs/update/apply').send({ update })
    const nonExistentSlug = 'non-existent-article'
    const response = await supertestApp.get(
      `/v1/fs/blob/get-article?userAddress=${author.address}&slug=${nonExistentSlug}`,
    )
    expect(response.status).toBe(500)
    expect(response.body).toStrictEqual({
      message: `Article not found: "${nonExistentSlug}". Get item: item not found: "articles"`,
      status: 'error',
    })
  })

  it('get article from non-existing user', async () => {
    const supertestApp = supertest(app)
    const nonExistentUserAddress = '0'.repeat(64)
    const response = await supertestApp.get(
      `/v1/fs/blob/get-article?userAddress=${nonExistentUserAddress}&slug=some-article`,
    )

    expect(response.status).toBe(500)
    expect(response.body).toStrictEqual({
      message: `User not found: "${nonExistentUserAddress}"`,
      status: 'error',
    })
  })

  it('get articles from non-existing user', async () => {
    const supertestApp = supertest(app)
    const nonExistentUserAddress = '0'.repeat(64)
    const response = await supertestApp.get(`/v1/fs/blob/get-articles?userAddress=${nonExistentUserAddress}`)

    expect(response.status).toBe(500)
    expect(response.body).toStrictEqual({
      message: `User not found: "${nonExistentUserAddress}"`,
      status: 'error',
    })
  })

  it('get non-existing articles for an existing user', async () => {
    const supertestApp = supertest(app)
    const wallet = await createWallet()
    const author = {
      address: wallet.publicKey.toString('hex'),
      personalSign: (data: string) => personalSign(data, wallet.secretKey),
    }

    const update = new Update(PROJECT_NAME, author.address, 1)
    update.addAction(createAddUserAction(author.address))
    update.setSignature(author.personalSign(update.getSignData()))
    await supertestApp.post('/v1/fs/update/apply').send({ update })

    const response = await supertestApp.get(`/v1/fs/blob/get-articles?userAddress=${author.address}`)
    expect(response.status).toBe(500)
    expect(response.body).toStrictEqual({
      message: `Articles not found. Get item: item not found: "articles"`,
      status: 'error',
    })
  })

  it('add incorrect article with correct index-json for an existing user', async () => {
    await syncFileSystem()
    const supertestApp = supertest(app)
    const wallet = await createWallet()
    const author = {
      address: wallet.publicKey.toString('hex'),
      personalSign: (data: string) => personalSign(data, wallet.secretKey),
    }

    // Add user first
    let update = new Update(PROJECT_NAME, author.address, 1)
    update.addAction(createAddUserAction(author.address))
    update.addAction(createAddDirectoryAction('/articles'))
    update.setSignature(author.personalSign(update.getSignData()))
    await supertestApp.post('/v1/fs/update/apply').send({ update })

    const articleData = 'This is some random short text instead of an actual article.'
    const hash = await uploadBytes(tonStorage, stringToBytes(articleData))

    const articleSlug = 'random-article'
    const updatesInfo = (await supertestApp.get(`/v1/fs/user/get-update-id?address=${author.address}`))
      .body as GetUpdateIdResponse
    update = new Update(PROJECT_NAME, author.address, updatesInfo.updateId + 1)
    update.addAction(createAddDirectoryAction(`/articles/${articleSlug}`))
    update.addAction(
      createAddFileAction({
        path: `/articles/${articleSlug}/index-json`,
        mimeType: 'application/json',
        size: articleData.length,
        hash,
      }),
    )
    update.setSignature(author.personalSign(update.getSignData()))
    const response = await supertestApp.post('/v1/fs/update/apply').send({ update })

    expect(response.status).toBe(200)
    expect(response.body).toStrictEqual({ status: 'ok' })

    const fsArticle = (
      await supertestApp.get(`/v1/fs/blob/get-article?userAddress=${author.address}&slug=${articleSlug}`)
    ).body as ArticleResponse
    expect(fsArticle).toStrictEqual({
      status: 'error',
      message: `Article not found: "${articleSlug}". Error: JSON assert: data is not a valid JSON: Unexpected token ${articleData[0]} in JSON at position 0`,
    })
  })

  it('should add and remove an article, checking its availability by slug', async () => {
    await syncFileSystem()
    const supertestApp = supertest(app)

    // create a new user and a new article
    const wallet = await createWallet()
    const author = {
      address: wallet.publicKey.toString('hex'),
      personalSign: (data: string) => personalSign(data, wallet.secretKey),
      article: generateArticle() as Article,
    }

    // register the user and create the article directory
    let update = new Update(PROJECT_NAME, author.address, 1)
    update.addAction(createAddUserAction(author.address))
    update.addAction(createAddDirectoryAction('/articles'))
    update.setSignature(author.personalSign(update.getSignData()))
    let response = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(response.status).toBe(200)
    expect(response.body).toStrictEqual({ status: 'ok' })

    // add the new article
    const articleData = JSON.stringify(author.article)
    const hash = await uploadBytes(tonStorage, stringToBytes(articleData))
    const updatesInfo = (await supertestApp.get(`/v1/fs/user/get-update-id?address=${author.address}`))
      .body as GetUpdateIdResponse
    update = new Update(PROJECT_NAME, author.address, updatesInfo.updateId + 1)
    update.addAction(createAddDirectoryAction(`/articles/${author.article.slug}`))
    update.addAction(
      createAddFileAction({
        path: `/articles/${author.article.slug}/index-json`,
        mimeType: 'application/json',
        size: articleData.length,
        hash,
      }),
    )
    update.setSignature(author.personalSign(update.getSignData()))
    response = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(response.status).toBe(200)
    expect(response.body).toStrictEqual({ status: 'ok' })

    // check the article is available by slug
    const fsArticle = (
      await supertestApp.get(`/v1/fs/blob/get-article?userAddress=${author.address}&slug=${author.article.slug}`)
    ).body as ArticleResponse
    expect(fsArticle.status).toBe('ok')
    expect(fsArticle.userAddress).toBe(author.address)
    expect(fsArticle.article.slug).toBe(author.article.slug)
    expect(fsArticle.article.data).toBeDefined()

    // remove the article by deleting its slug folder
    const deleteInfo = (await supertestApp.get(`/v1/fs/user/get-update-id?address=${author.address}`))
      .body as GetUpdateIdResponse
    update = new Update(PROJECT_NAME, author.address, deleteInfo.updateId + 1)
    update.addAction(createRemoveDirectoryAction(`/articles/${author.article.slug}`))
    update.setSignature(author.personalSign(update.getSignData()))
    response = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(response.status).toBe(200)
    expect(response.body).toStrictEqual({ status: 'ok' })

    // check the article is no longer available by slug
    const removedArticleResponse = await supertestApp.get(
      `/v1/fs/blob/get-article?userAddress=${author.address}&slug=${author.article.slug}`,
    )
    expect(removedArticleResponse.status).toBe(500)
    expect(removedArticleResponse.body.status).toBe('error')
  })
})
