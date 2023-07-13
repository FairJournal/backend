import express from 'express'
import uploadAction from './upload-action'
import downloadAction from './download-action'
import getArticleAction from './get-article-action'
import getArticlesAction from './get-articles-action'

const router = express.Router()
router.post('/upload', uploadAction)
router.post('/download', downloadAction)
router.get('/get-article', getArticleAction)
router.get('/get-articles', getArticlesAction)

export default router
