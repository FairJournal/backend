import express from 'express'
import uploadAction from './upload-action'
import downloadAction from './download-action'
import getArticleAction from './get-article-action'
import getArticlesAction from './get-articles-action'
import multer from 'multer'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'blob/')
  },
})

const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 10 } })

const router = express.Router()
router.post('/upload', upload.single('blob'), uploadAction)
router.post('/download', downloadAction)
router.get('/get-article', getArticleAction)
router.get('/get-articles', getArticlesAction)

export default router
