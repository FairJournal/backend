import app, { clearFileSystem, syncFileSystem } from './app'

// Start server
const PORT = process.env.PORT || 5000

async function start(): Promise<void> {
  clearFileSystem()
  await syncFileSystem()
  // eslint-disable-next-line no-console
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
}

start().then()
