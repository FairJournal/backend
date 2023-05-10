import { Request, Response } from 'express'
import { OkPacket, RowDataPacket } from 'mysql2'
import pool from '../db'

const getAllArticles = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM articles')
    const articles = rows
    return res.json(articles)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

const getArticleById = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM articles WHERE id = ?', [id])
    const article = rows[0]
    if (!article) {
      return res.status(404).send(`Article with id ${id} not found`)
    }
    return res.json(article)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

const createArticle = async (req: Request, res: Response) => {
  const { authorId, hash, content } = req.body
  try {
    const [result] = await pool.query<OkPacket>('INSERT INTO articles(author_id, hash, content) VALUES(?, ?, ?)', [
      authorId,
      hash,
      JSON.stringify(content),
    ])
    const id = result.insertId
    return res.status(201).json({ id })
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

const updateArticle = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const { authorId, hash, content } = req.body
  try {
    const [result] = await pool.query<OkPacket>(
      'UPDATE articles SET author_id = ?, hash = ?, content = ? WHERE id = ?',
      [authorId, hash, content, id],
    )
    if (result.affectedRows === 0) {
      return res.status(404).send(`Article with id ${id} not found`)
    }
    return res.sendStatus(204)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

const deleteArticle = async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    const [result] = await pool.query<OkPacket>('DELETE FROM articles WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).send(`Article with id ${id} not found`)
    }
    return res.sendStatus(204)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Internal Server Error')
  }
}

export { getAllArticles, getArticleById, createArticle, updateArticle, deleteArticle }
