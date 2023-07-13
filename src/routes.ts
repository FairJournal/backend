import { Router } from 'express'
import {
  deleteUser,
  getUserById,
  updateUser,
  getArticlesByUserId,
  authorizeByWallet,
} from './controllers/UserController'
import {
  createArticle,
  deleteArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
} from './controllers/ArticleController'
import Image from './controllers/ImageController'
import multer from 'multer'
import path from 'path'
// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'avatars/')
  },
  filename: (req, file, cb) => {
    // Use the originalname property to get the original extension
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  },
})

const upload = multer({ storage })

const router = Router()

// User Routes
router.get('/users/:id', getUserById)
router.get('/users/:id/articles', getArticlesByUserId)
router.post('/users/:id', upload.single('avatar'), updateUser)
router.delete('/users/:id', deleteUser)

// Article Routes
router.get('/articles', getAllArticles)
router.get('/articles/:id', getArticleById)
router.post('/articles', createArticle)
router.put('/articles/:id', updateArticle)
router.delete('/articles/:id', deleteArticle)

// Images Routes
router.post('/image/upload', upload.single('image'), Image.upload)

// Auth route
router.post('/auth', authorizeByWallet)

export default router
