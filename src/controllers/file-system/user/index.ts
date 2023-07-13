import express from 'express'
import infoAction from './info-action'
import getUpdateIdAction from './get-update-id-action'

const router = express.Router()
router.get('/info', infoAction)
router.get('/get-update-id', getUpdateIdAction)

export default router
