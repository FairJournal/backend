import express from 'express'
import uploadAction from './upload-action'
import downloadAction from './download-action'
import getArticleAction from './get-article-action'

const router = express.Router()
router.post('/upload', uploadAction)
router.post('/download', downloadAction)
router.post('/get-article', getArticleAction)

export default router
