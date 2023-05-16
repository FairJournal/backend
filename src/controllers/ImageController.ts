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
        // todo should be changed to the actual url depends of the server url (local, dev, prod and etc)
        url: `http://localhost:5555/${path}`,
        relativePath: path,
      }
    })
  } catch (err) {
    console.error(err)
    return res.status(500).send(`Internal Server Error: ${err.message}`)
  }
}

export default { upload }
