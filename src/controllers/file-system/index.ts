import express from 'express'
import userRouter from './user'
import blobRouter from './blob'
import updateRouter from './update'

const router = express.Router()
router.use('/user', userRouter)
router.use('/blob', blobRouter)
router.use('/update', updateRouter)

export default router
