import knex from 'knex'
import knexConfig from '../../../knexfile'
import { TonstorageCLI } from 'tonstorage-cli'
import app, { clearFileSystem, createTonStorageInstance, syncFileSystem } from '../../../src/app'
import { assertTree, createWallet, removeAllTonStorageFiles, tonStorageFilesList, uploadBytes } from '../../utils'
import pool from '../../../src/db'
import {
  assertDirectories,
  assertFiles,
  createAddDirectoryAction,
  createAddFileAction,
  createAddUserAction,
  personalSign,
  Update,
} from '@fairjournal/file-system'
import { PROJECT_NAME } from '../../../src/controllers/file-system/const'
import supertest from 'supertest'
import path from 'path'
import { stringToBytes } from '../../../src/utils'
import { downloadData, getSetting, SettingsKey, upsertSettings } from '../../../src/controllers/file-system/utils'
import { initFs } from '../../../src/fs'
import fs from 'fs'

process.env.SHOW_LOGS = 'false'

const db = knex(process.env.DB_SOCKET_PATH ? knexConfig.docker : knexConfig.development)
describe('App', () => {
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

  it('should publish fs', async () => {
    await syncFileSystem()
    const supertestApp = supertest(app)

    const files = [
      {
        originalName: 'file1.txt',
        destinationName: 'file1-txt',
      },
      {
        originalName: 'file2.txt',
        destinationName: 'file2-txt',
      },
      {
        originalName: 'img1.jpg',
        destinationName: 'img1-jpg',
      },
    ]

    const seeds = [
      '4f3ab03c9b34be0a399e8b165350c705f1c74e1f980be66c7aba92fbe4d07fb8',
      '235b19b79390d5a821b49fef63e63691c377d645f1d20862b42f6e13f37a1b5e',
      '9036f25e16e153c6af6031a98e5087c627d86b4da9acbe63b5cfad096a218739',
    ]
    const users = await Promise.all(
      Array.from({ length: 3 }, async (_, index) => {
        const wallet = await createWallet(seeds[index])

        return {
          address: wallet.publicKey.toString('hex'),
          personalSign: (data: string): string => personalSign(data, wallet.secretKey),
        }
      }),
    )

    for (const user of users) {
      const update = new Update(PROJECT_NAME, user.address, 1)
      update.addAction(createAddUserAction(user.address))

      for (let i = 0; i < 3; i++) {
        const dir = `dir${i}`
        update.addAction(createAddDirectoryAction(`/${dir}`))

        for (const file of files) {
          const filePath = path.join(__dirname, `../../data/${file.originalName}`)
          const content = fs.readFileSync(filePath)
          const hash = await uploadBytes(tonStorage, stringToBytes(content.toString()))

          update.addAction(
            createAddFileAction({
              path: `/${dir}/${file.destinationName}`,
              mimeType: 'text/plain',
              size: content.length,
              hash,
            }),
          )
        }
      }

      update.setSignature(user.personalSign(update.getSignData()))
      const response = await supertestApp.post('/v1/fs/update/apply').send({ update })
      expect(response.status).toBe(200)
      expect(response.body).toStrictEqual({ status: 'ok' })
    }

    const response0 = await supertestApp.post('/v1/fs/app/publish').send({ password: 'any-password' })
    expect(response0.status).toBe(500)
    expect(response0.body).toStrictEqual({ status: 'error', message: 'Invalid password' })

    const resultReference = '0371cb0e4f839c0e06fccbc5001b593fa9b25c3c23fac2cd7c4979d2efc64f7a'
    await expect(getSetting(pool, SettingsKey.FS_STATE_REFERENCE)).rejects.toThrow(
      `No setting found for key: ${SettingsKey.FS_STATE_REFERENCE}`,
    )
    const response1 = await supertestApp.post('/v1/fs/app/publish').send({ password: process.env.PUBLISH_FS_PASSWORD })
    expect(response1.status).toBe(200)
    expect(response1.body).toStrictEqual({ status: 'ok', reference: resultReference })
    expect(await getSetting(pool, SettingsKey.FS_STATE_REFERENCE)).toBe(resultReference)

    const mfs = initFs()
    await mfs.download(resultReference, {
      downloadData: async item => downloadData(item.reference),
      withUpdates: true,
    })

    const exported = mfs.exportMeta()
    expect(exported.users).toHaveLength(3)
    assertTree(exported.tree)

    const rootDirectories = exported.tree.directory.directories
    assertDirectories(rootDirectories)
    expect(rootDirectories).toHaveLength(3)

    for (const rootDirectory of rootDirectories) {
      const subDirectories = rootDirectory.directories
      expect(subDirectories).toHaveLength(3)
      assertDirectories(subDirectories)

      for (const subDirectory of subDirectories) {
        const filesInSubDirectory = subDirectory.files
        expect(filesInSubDirectory).toHaveLength(3)
        assertFiles(filesInSubDirectory)
      }
    }
  })

  it('set and get settings', async () => {
    const supertestApp = supertest(app)
    let data0 = await supertestApp.get(`/v1/fs/app/get-settings`)
    expect(data0.status).toBe(500)
    expect(data0.body).toStrictEqual({
      status: 'error',
      message: `"key" is not set`,
    })

    data0 = await supertestApp.get(`/v1/fs/app/get-settings?key=${SettingsKey.FS_STATE_REFERENCE}`)
    expect(data0.status).toBe(500)
    expect(data0.body).toStrictEqual({
      status: 'error',
      message: `No setting found for key: ${SettingsKey.FS_STATE_REFERENCE}`,
    })

    const checkValue = 'Hello-world'
    await upsertSettings(pool, SettingsKey.FS_STATE_REFERENCE, checkValue)
    data0 = await supertestApp.get(`/v1/fs/app/get-settings?key=${SettingsKey.FS_STATE_REFERENCE}`)
    expect(data0.status).toBe(200)
    expect(data0.body).toStrictEqual({
      status: 'ok',
      value: checkValue,
    })
  })
})
