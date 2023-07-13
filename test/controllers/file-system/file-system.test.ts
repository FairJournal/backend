// todo change managing of the file system to configure and call when needed
process.env.SHOW_LOGS = 'false'
import knex from 'knex'
import knexConfig from '../../../knexfile'
import pool from '../../../src/db'
import supertest from 'supertest'
import app, { clearFileSystem, fileSystem, syncFileSystem } from '../../../src/app'
import { createAddUserAction, Update, personalSign } from '@fairjournal/file-system'
import { PROJECT_NAME } from '../../../src/controllers/file-system/const'
import { createWallet, getUpdatesCount } from '../../utils'

const db = knex(knexConfig.development)

describe('file-system', () => {
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

  it('update/apply - empty data', async () => {
    const supertestApp = supertest(app)
    const response = await supertestApp.post('/v1/fs/update/apply').send()
    expect(response.status).toBe(500)
    expect(response.body).toStrictEqual({
      status: 'error',
      message: 'Data is not an object',
    })
  })

  it('update/apply - empty object', async () => {
    const supertestApp = supertest(app)
    const response = await supertestApp.post('/v1/fs/update/apply').send({ update: {} })
    expect(response.status).toBe(500)
    expect(response.body).toStrictEqual({
      status: 'error',
      message: 'UpdateDataSigned: signature is not defined',
    })
  })

  it('update/apply - register, clear fs and recover from db', async () => {
    const supertestApp = supertest(app)

    const authors = await Promise.all(
      Array.from({ length: 3 }, async () => {
        const wallet = await createWallet()

        return {
          address: wallet.publicKey.toString('hex'),
          personalSign: (data: string) => personalSign(data, wallet.secretKey),
        }
      }),
    )

    const responseUserCheck0 = await supertestApp.get(`/v1/fs/user/info?address=${authors[0].address}`)
    expect(responseUserCheck0.status).toBe(200)
    expect(responseUserCheck0.body).toStrictEqual({
      address: authors[0].address,
      isUserExists: false,
      status: 'ok',
    })

    const update = new Update(PROJECT_NAME, authors[0].address, 1)
    update.addAction(createAddUserAction(authors[0].address))
    update.setSignature(authors[0].personalSign(update.getSignData()))
    expect(await getUpdatesCount(db)).toEqual(0)
    expect(fileSystem.getUpdateId(authors[0].address)).toEqual(0)
    const response = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(response.status).toBe(200)
    expect(response.body).toStrictEqual({ status: 'ok' })
    expect(await getUpdatesCount(db)).toEqual(1)
    expect(fileSystem.getUpdateId(authors[0].address)).toEqual(1)

    const responseUserCheck1 = await supertestApp.get(`/v1/fs/user/info?address=${authors[0].address}`)
    expect(responseUserCheck1.status).toBe(200)
    expect(responseUserCheck1.body).toStrictEqual({
      address: authors[0].address,
      isUserExists: true,
      status: 'ok',
    })

    const response1 = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(response1.status).toBe(500)
    expect(response1.body).toStrictEqual({ status: 'error', message: 'Update with id "1" already exists' })

    expect(fileSystem.getUpdateId(authors[0].address)).toEqual(1)
    update.setId(2)
    update.setSignature(authors[0].personalSign(update.getSignData()))
    const response2 = await supertestApp.post('/v1/fs/update/apply').send({ update })
    expect(response2.status).toBe(500)
    expect(response2.body).toStrictEqual({
      status: 'error',
      message: `User with address "${authors[0].address}" already exists`,
    })

    expect(fileSystem.getUpdateId(authors[0].address)).toEqual(1)
    clearFileSystem()
    expect(fileSystem.getUpdateId(authors[0].address)).toEqual(0)

    // recover filesystem from the db
    await syncFileSystem()
    expect(fileSystem.getUpdateId(authors[0].address)).toEqual(1)
  })

  it('user/info - user do not exists', async () => {
    const supertestApp = supertest(app)
    const address = 'd66401889725ada1f6ba8e78f67d24aec386341d8e3310f00ef64df463def1ef'
    const response = await supertestApp.get(`/v1/fs/user/info?address=${address}`)
    expect(response.status).toBe(200)
    expect(response.body).toStrictEqual({
      address: address,
      isUserExists: false,
      status: 'ok',
    })
  })
})
