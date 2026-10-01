import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Load the backend environment file explicitly. Resolving it from process.cwd()
// made `nodemon .\\backend\\app.js` pick up a potentially unrelated root .env.
// The API must always use backend/.env, regardless of the terminal directory.
const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(backendDirectory, '.env'), override: true })

// app imports the database pool. It must only be loaded once the environment
// has been configured, otherwise the pool can retain an outdated DATABASE_URL.
const { default: app } = await import('./app.js')

const port = process.env.PORT || 3001

app.listen(port, () => {
  console.log(`Novyata API available on http://localhost:${port}`)
})
