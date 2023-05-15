import { Request, Response } from 'express'
import { OkPacket, RowDataPacket } from 'mysql2'
import pool from '../db'
import User from '../models/User'
import * as fs from 'fs'

const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id])
    const user = rows[0] as User
    if (!user) {
      return res.status(404).send(`User with id ${id} not found`)
    }
    return res.json(user)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

const getArticlesByUserId = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM articles WHERE author_id = ?', [id])
    const articles = rows
    if (!articles) {
      return res.status(404).send(`No articles found for user with id ${id}`)
    }
    return res.json(articles)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

// const createUser = async (req: Request, res: Response) => {
//   const { wallet } = req.body
//   try {
//     const [result] = await pool.query<OkPacket>(
//       'INSERT INTO users(wallet, avatar, name, description) VALUES(?, ?, ?, ?)',
//       [wallet, '', '', ''],
//     )
//     const id = result.insertId
//     const newUser: User = { id, wallet, avatar: '', name: '', description: '', articles: [] }
//     return res.status(201).json(newUser)
//   } catch (err) {
//     console.error(err)
//     return res.status(500).send('Internal Server Error')
//   }
// }

/**
 * Update user info
 */
const updateUser = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      throw new Error('Id is required')
    }

    const { wallet, name, description } = req.body
    if (!wallet) {
      throw new Error('Wallet is required')
    }

    if (!name) {
      throw new Error('Name is required')
    }

    if (!description) {
      throw new Error('Description is required')
    }

    let avatarPath = null
    if (req.file) {
      avatarPath = req.file.path
    }

    // get old user info
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id])
    const user = rows[0] as User

    // update user info
    const [result] = await pool.query<OkPacket>(
      'UPDATE users SET wallet = ?, avatar = IFNULL(?, avatar), name = ?, description = ? WHERE id = ?',
      [wallet, avatarPath, name, description, id],
    )

    // remove old avatar if exists sync
    if (user.avatar && fs.existsSync(user.avatar)) {
      fs.unlinkSync(user.avatar)
    }

    if (result.affectedRows === 0) {
      return res.status(404).send(`User with id "${id}" not found`)
    }

    // get updated user info
    const [updatedRows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id])
    const updatedUser = updatedRows[0]

    return res.json(updatedUser)
  } catch (err) {
    console.error(err)
    return res.status(500).send(err.message)
  }
}

const deleteUser = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    const [result] = await pool.query<OkPacket>('DELETE FROM users WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).send(`User with id ${id} not found`)
    }
    return res.sendStatus(204)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

const authorizeByWallet = async (req: Request, res: Response) => {
  const { wallet }: { wallet: string } = req.body

  try {
    // Check if the user already exists in the database
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE wallet = ?', [wallet])
    let user = rows[0]

    if (!user) {
      // If the user doesn't exist, create a new one
      const [result] = await pool.query<OkPacket>(
        'INSERT INTO users (wallet, name, description, avatar) VALUES (?, ?, ?, ?)',
        [wallet, '', '', ''],
      )
      const newUserId = result.insertId

      // Retrieve the newly created user from the database
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [newUserId])
      user = rows[0]
    }

    return res.json(user)
  } catch (err) {
    console.error(err)
    return res.status(500).send(err.message)
  }
}

export { getUserById, updateUser, deleteUser, getArticlesByUserId, authorizeByWallet }
