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
  docker: {
    ...knexConfig,
    connection: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ...knexConfig.connection,
      socketPath: '/run/mysqld/mysqld2.sock',
    },
  },
}

export default configurations
