import express from 'express'
import applyAction from './apply-action'

const router = express.Router()
router.get('/apply', applyAction)

export default router
