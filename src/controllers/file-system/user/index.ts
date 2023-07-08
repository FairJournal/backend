import express from 'express'
import infoAction from './info-action'

const router = express.Router()
router.get('/info', infoAction)

export default router
