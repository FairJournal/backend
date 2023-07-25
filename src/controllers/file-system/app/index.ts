import express from 'express'
import publishAction from './publish-action'
import getSettingsAction from './get-settings-action'

const router = express.Router()
router.post('/publish', publishAction)
router.get('/get-settings', getSettingsAction)

export default router
