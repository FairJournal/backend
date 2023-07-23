import { Request, Response } from 'express'
import { OkPacket } from 'mysql2'
import pool from '../db'

const upload = async (req: Request, res: Response) => {
  const { authorId } = req.body

  if (!authorId) {
    return res.status(400).send('Author id is required')
  }

  if (!(req.file && req.file.path)) {
    return res.status(400).send('No image uploaded.')
  }

  // Check image size
  const fileSizeInBytes = req.file.size
  const maxSizeInBytes = 10 * 1024 * 1024 // 10 megabytes

  if (fileSizeInBytes > maxSizeInBytes) {
    return res.status(400).send('Image size exceeds the maximum limit of 10 megabytes.')
  }

  try {
    const path = req.file.path
    const [result] = await pool.query<OkPacket>('INSERT INTO images(author_id, signature, path) VALUES(?, ?, ?)', [
      authorId,
      '---',
      path,
    ])
    const id = result.insertId

    return res.status(201).json({
      id,
      success: 1,
      file: {
        url: `${process.env.URL}${path}`,
        relativePath: path,
      },
    })
  } catch (e) {
    return res.status(500).send(`Internal Server Error: ${(e as Error).message}`)
  }
}

export default { upload }
