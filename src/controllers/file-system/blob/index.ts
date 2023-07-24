import express from 'express'
import uploadAction from './upload-action'
import getArticleAction from './get-article-action'
import getArticlesAction from './get-articles-action'
import getPathInfoAction from './get-path-info-action'
import multer from 'multer'
import { MAX_BLOB_SIZE } from '../const'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'blob/')
  },
})

const upload = multer({ storage, limits: { fileSize: MAX_BLOB_SIZE } })

const router = express.Router()
router.post('/upload', upload.single('blob'), uploadAction)
router.get('/get-article', getArticleAction)
router.get('/get-articles', getArticlesAction)
router.get('/get-path-info', getPathInfoAction)

export default router
