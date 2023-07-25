import express from 'express'
import userRouter from './user'
import blobRouter from './blob'
import updateRouter from './update'
import appRouter from './app'

const router = express.Router()
router.use('/user', userRouter)
router.use('/blob', blobRouter)
router.use('/update', updateRouter)
router.use('/app', appRouter)

export default router
