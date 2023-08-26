import { Request, Response } from 'express'
import { OkPacket, RowDataPacket } from 'mysql2'
import pool from '../db'

const getAllArticles = async (req: Request, res: Response): Promise<Response> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM articles')

    return res.json(rows)
  } catch (e) {
    return res.status(500).send(`Internal Server Error: ${(e as Error).message}`)
  }
}

const getArticleById = async (req: Request, res: Response): Promise<Response> => {
  const id = Number(req.params.id)

  if (!id) {
    return res.status(400).send('Article id is required')
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT articles.*, users.name, users.avatar, users.wallet
       FROM articles
       JOIN users ON articles.author_id = users.id
       WHERE articles.id = ?`,
      [id],
    )
    const article = rows[0]

    if (!article) {
      return res.status(404).send(`Article with id ${id} not found`)
    }

    return res.json(article)
  } catch (e) {
    return res.status(500).send(`Internal Server Error: ${(e as Error).message}`)
  }
}

const createArticle = async (req: Request, res: Response): Promise<Response> => {
  const { authorId, hash, content } = req.body

  if (!authorId) {
    return res.status(400).send('Author id is required')
  }

  if (!hash) {
    return res.status(400).send('Hash is required')
  }

  if (!content) {
    return res.status(400).send('Content is required')
  }
  try {
    const [result] = await pool.query<OkPacket>('INSERT INTO articles(author_id, hash, content) VALUES(?, ?, ?)', [
      authorId,
      hash,
      JSON.stringify(content),
    ])
    const id = result.insertId

    return res.status(201).json({ id })
  } catch (e) {
    return res.status(500).send(`Internal Server Error: ${(e as Error).message}`)
  }
}

const updateArticle = async (req: Request, res: Response): Promise<Response | void> => {
  const id = Number(req.params.id)
  const { authorId, hash, content } = req.body

  if (!authorId) {
    return res.status(400).send('Author id is required')
  }

  if (!hash) {
    return res.status(400).send('Hash is required')
  }

  if (!content) {
    return res.status(400).send('Content is required')
  }
  try {
    const [result] = await pool.query<OkPacket>(
      'UPDATE articles SET author_id = ?, hash = ?, content = ? WHERE id = ?',
      [authorId, hash, JSON.stringify(content), id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).send(`Article with id ${id} not found`)
    }

    return res.json({ id })
  } catch (e) {
    return res.status(500).send(`Internal Server Error: ${(e as Error).message}`)
  }
}

const deleteArticle = async (req: Request, res: Response): Promise<Response | void> => {
  const id = Number(req.params.id)

  if (!id) {
    return res.status(400).send('Id is required')
  }
  try {
    const [result] = await pool.query<OkPacket>('DELETE FROM articles WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(404).send(`Article with id ${id} not found`)
    }

    return res.json({ id })
  } catch (e) {
    return res.status(500).send(`Internal Server Error: ${(e as Error).message}`)
  }
}

export { getAllArticles, getArticleById, createArticle, updateArticle, deleteArticle }
