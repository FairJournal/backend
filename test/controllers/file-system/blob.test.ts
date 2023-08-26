// todo change managing of the file system to configure and call when needed
process.env.SHOW_LOGS = 'false'
import tmp from 'tmp'
import path from 'path'
import knex from 'knex'
import knexConfig from '../../../knexfile'
import pool from '../../../src/db'
import supertest from 'supertest'
import app, { clearFileSystem, createTonStorageInstance, syncFileSystem } from '../../../src/app'
import {
  createAddFileAction,
  createAddUserAction,
  createRemoveFileAction,
  personalSign,
  Update,
} from '@fairjournal/file-system'
import { createWallet, removeAllTonStorageFiles, tonStorageFilesList } from '../../utils'
import { MAX_BLOB_SIZE, PROJECT_NAME } from '../../../src/controllers/file-system/const'
import { TonstorageCLI } from 'tonstorage-cli'
import fs from 'fs'

const db = knex(process.env.DB_SOCKET_PATH ? knexConfig.docker : knexConfig.development)

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

  it('add update with reference that do not exists', async () => {
    const supertestApp = supertest(app)

    const wallet = await createWallet()

    const author = {
      address: wallet.publicKey.toString('hex'),
      personalSign: (data: string): string => personalSign(data, wallet.secretKey),
    }

    const nonExistentReference = '0'.repeat(64)

    const update = new Update(PROJECT_NAME, author.address, 1)
    update.addAction(createAddUserAction(author.address))
    update.addAction(
      createAddFileAction({
        path: '/index-json',
        mimeType: 'application/json',
        size: 100,
        hash: nonExistentReference,
      }),
    )
    update.setSignature(author.personalSign(update.getSignData()))

    const response = await supertestApp.post('/v1/fs/update/apply').send({ update })

    expect(response.status).toBe(500)
    expect(response.body).toStrictEqual({
      message: `Reference "${nonExistentReference}" not found`,
      status: 'error',
    })
  })

  it('duplicate file upload', async () => {
    const supertestApp = supertest(app)

    // Sync file system before uploading
    await syncFileSystem()

    const file = {
      name: 'file1.txt',
      mime_type: 'text/plain',
      size: 12,
      sha256: 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a',
      reference: '65d9deffdec24c795d88611d32b80831c076000af7402a8b5973bf188b0b6b2d',
    }

    const filePath = path.join(__dirname, `../../data/${file.name}`)

    // First upload
    let response = await supertestApp.post('/v1/fs/blob/upload').attach('blob', filePath)
    expect(response.status).toBe(200)
    let data = response.body.data
    expect(data.reference).toBe(file.reference)
    expect(data.mime_type).toBe(file.mime_type)
    expect(data.sha256).toBe(file.sha256)
    expect(data.size).toBe(file.size)

    // Second upload of the same file
    response = await supertestApp.post('/v1/fs/blob/upload').attach('blob', filePath)
    expect(response.status).toBe(200) // Or some error status if your application doesn't allow duplicate uploads
    data = response.body.data

    // Check if it is the same file or a different one based on your application logic
    expect(data.reference).toBe(file.reference)
    expect(data.mime_type).toBe(file.mime_type)
    expect(data.sha256).toBe(file.sha256)
    expect(data.size).toBe(file.size)

    // Check that the count of files in tonStorage is still 1
    expect(await tonStorageFilesList(tonStorage)).toHaveLength(1)
  })

  it('upload a file larger than the max size limit', async () => {
    const supertestApp = supertest(app)
    const tempFile = tmp.fileSync()

    try {
      fs.writeSync(tempFile.fd, Buffer.alloc(MAX_BLOB_SIZE + 1))
      const response = await supertestApp.post('/v1/fs/blob/upload').attach('blob', tempFile.name)
      expect(response.status).toBe(500)
      expect(response.body).toStrictEqual({
        message: 'File too large',
        status: 'error',
      })
    } finally {
      // Clean up the temp file regardless of the test result
      tempFile.removeCallback()
    }
  })

  it('update fs file', async () => {
    const supertestApp = supertest(app)
    const wallet = await createWallet()
    const author = {
      address: wallet.publicKey.toString('hex'),
      personalSign: (data: string): string => personalSign(data, wallet.secretKey),
    }

    await syncFileSystem()

    const file1 = {
      name: 'file1.txt',
      mime_type: 'text/plain',
      size: 12,
      sha256: 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a',
      reference: '65d9deffdec24c795d88611d32b80831c076000af7402a8b5973bf188b0b6b2d',
    }

    const file2 = {
      name: 'file2.txt',
      mime_type: 'text/plain',
      size: 258,
      sha256: '5438a317bde30599b535f86cd3ed0a69d88ab4d17ee935199bb3a07a4189fbd4',
      reference: '366f6ec29a530266595d9dc11415bd7fb3312d816308774db445f872153b2d97',
    }
    const remoteFileName = 'profile-data'
    const remoteFilePath = `/${remoteFileName}`
    const filePath1 = path.join(__dirname, `../../data/${file1.name}`)
    const filePath2 = path.join(__dirname, `../../data/${file2.name}`)

    // First upload
    const response = await supertestApp.post('/v1/fs/blob/upload').attach('blob', filePath1)
    expect(response.status).toBe(200)
    const data = response.body.data
    expect(data.reference).toBe(file1.reference)
    expect(data.mime_type).toBe(file1.mime_type)
    expect(data.sha256).toBe(file1.sha256)
    expect(data.size).toBe(file1.size)

    const update = new Update(PROJECT_NAME, author.address, 1)
    update.addAction(createAddUserAction(author.address))
    update.addAction(
      createAddFileAction({
        path: remoteFilePath,
        mimeType: file1.mime_type,
        size: file1.size,
        hash: file1.reference,
      }),
    )
    update.setSignature(author.personalSign(update.getSignData()))

    const apply1 = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(apply1.status).toBe(200)
    expect(apply1.body).toStrictEqual({
      status: 'ok',
    })

    // Check get-path-info method
    const pathInfoResponse1 = await supertestApp.get(
      `/v1/fs/blob/get-path-info?userAddress=${author.address}&path=${remoteFilePath}`,
    )
    expect(pathInfoResponse1.status).toBe(200)
    expect(pathInfoResponse1.body).toStrictEqual({
      status: 'ok',
      userAddress: author.address,
      path: remoteFilePath,
      data: {
        name: remoteFileName,
        mimeType: file1.mime_type,
        size: file1.size,
        hash: file1.reference,
        updateId: 1,
      },
    })

    // Second upload
    const response2 = await supertestApp.post('/v1/fs/blob/upload').attach('blob', filePath2)
    expect(response2.status).toBe(200)
    const data2 = response2.body.data
    expect(data2.reference).toBe(file2.reference)
    expect(data2.mime_type).toBe(file2.mime_type)
    expect(data2.sha256).toBe(file2.sha256)
    expect(data2.size).toBe(file2.size)

    update.setId(2)
    update.setActions([])
    update.addAction(createRemoveFileAction('/profile-data'))
    update.addAction(
      createAddFileAction({
        path: remoteFilePath,
        mimeType: file2.mime_type,
        size: file2.size,
        hash: file2.reference,
      }),
    )
    update.setSignature(author.personalSign(update.getSignData()))

    const apply2 = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(apply2.status).toBe(200)
    expect(apply2.body).toStrictEqual({
      status: 'ok',
    })

    // Check get-path-info method
    const pathInfoResponse2 = await supertestApp.get(
      `/v1/fs/blob/get-path-info?userAddress=${author.address}&path=${remoteFilePath}`,
    )
    expect(pathInfoResponse2.status).toBe(200)
    expect(pathInfoResponse2.body).toStrictEqual({
      status: 'ok',
      userAddress: author.address,
      path: remoteFilePath,
      data: {
        name: remoteFileName,
        mimeType: file2.mime_type,
        size: file2.size,
        hash: file2.reference,
        updateId: 2,
      },
    })

    expect(await tonStorageFilesList(tonStorage)).toHaveLength(2)
  })

  it('get path info for incorrect path', async () => {
    const supertestApp = supertest(app)
    const wallet = await createWallet()

    await syncFileSystem()

    const author = {
      address: wallet.publicKey.toString('hex'),
      personalSign: (data: string): string => personalSign(data, wallet.secretKey),
    }

    const file = {
      name: 'file1.txt',
      mime_type: 'text/plain',
      size: 12,
      sha256: 'c0535e4be2b79ffd93291305436bf889314e4a3faec05ecffcbb7df31ad9e51a',
      reference: '65d9deffdec24c795d88611d32b80831c076000af7402a8b5973bf188b0b6b2d',
    }

    const filePath = path.join(__dirname, `../../data/${file.name}`)
    const response = await supertestApp.post('/v1/fs/blob/upload').attach('blob', filePath)
    expect(response.status).toBe(200)

    const remoteFileName = 'file-test'
    const remoteFilePath = `/${remoteFileName}`

    const update = new Update(PROJECT_NAME, author.address, 1)
    update.addAction(createAddUserAction(author.address))
    update.addAction(
      createAddFileAction({
        path: remoteFilePath,
        mimeType: file.mime_type,
        size: file.size,
        hash: file.reference,
      }),
    )
    update.setSignature(author.personalSign(update.getSignData()))

    const applyUpdateResponse = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(applyUpdateResponse.status).toBe(200)

    // Try to get the file without / symbol
    const pathInfoResponse1 = await supertestApp.get(
      `/v1/fs/blob/get-path-info?userAddress=${author.address}&path=${remoteFileName}`,
    )
    expect(pathInfoResponse1.status).toBe(500)
    expect(pathInfoResponse1.body).toStrictEqual({
      status: 'error',
      message: `Can't get info about the path: Get item: item not found: "${author.address}${remoteFileName}"`,
    })

    // Try to get another file with a full path but one symbol more
    const fakePath = `${remoteFilePath}1`
    const fakeName = `${remoteFileName}1`
    const pathInfoResponse2 = await supertestApp.get(
      `/v1/fs/blob/get-path-info?userAddress=${author.address}&path=${fakePath}`,
    )
    expect(pathInfoResponse2.status).toBe(500)
    expect(pathInfoResponse2.body).toStrictEqual({
      status: 'error',
      message: `Can't get info about the path: Get item: item not found: "${fakeName}"`,
    })
  })
})
