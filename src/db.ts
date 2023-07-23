import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const simpleConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
}
const socketConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  socketPath: process.env.DB_SOCKET_PATH,
}

const config = process.env.DB_SOCKET_PATH ? socketConfig : simpleConfig

export const pool = mysql.createPool(config)

export default pool
