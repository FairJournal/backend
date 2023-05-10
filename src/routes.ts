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

const router = Router()

// User Routes
router.get('/users/:id', getUserById)
router.get('/users/:id/articles', getArticlesByUserId)
router.post('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

// Article Routes
router.get('/articles', getAllArticles)
router.get('/articles/:id', getArticleById)
router.post('/articles', createArticle)
router.put('/articles/:id', updateArticle)
router.delete('/articles/:id', deleteArticle)

// Auth route
router.post('/auth', authorizeByWallet)

export default router
