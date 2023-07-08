import express from 'express'
import uploadAction from './upload-action'

const router = express.Router()
router.post('/upload', uploadAction)

export default router
