// import pool from '../../../db'
// import mysql from 'mysql2/promise'
import { NextFunction, Request, Response } from 'express'
import { assertReference } from '../../../utils'

export default async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.query
    assertReference(id)

    // todo find bag id in allowed files and just uploaded (in case of article preview)

    // const connection = await pool.getConnection()
    // try {
    //   const [result] = await connection.query<mysql.RowDataPacket[]>(`
    //     SELECT 'invites' as type, COUNT(*) as count FROM invite
    //     UNION ALL
    //     SELECT 'accounts', COUNT(*) FROM account
    //     UNION ALL
    //     SELECT 'inviters', COUNT(*) FROM inviter
    //   `)
    //
    //   const info = result.reduce((acc: Record<string, number>, row) => {
    //     acc[row.type] = row.count
    //
    //     return acc
    //   }, {})
    //
    //   res.json({
    //     status: 'ok',
    //     data: info,
    //   })
    // } catch (error) {
    //   next(error)
    // } finally {
    //   connection.release()
    // }
  } catch (e) {
    next(e)
  }
}
