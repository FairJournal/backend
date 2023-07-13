import { config } from 'dotenv'
import { Knex } from 'knex'

config()

const knexConfig: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  migrations: {
    directory: './migrations',
  },
}

const configurations: { [key: string]: Knex.Config } = {
  development: knexConfig,
  production: knexConfig,
}

export default configurations
