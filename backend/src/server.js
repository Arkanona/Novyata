import dotenv from 'dotenv'

// The project file must take precedence over any stale environment inherited
// from a terminal or process manager.
dotenv.config({ override: true })

// app imports the database pool. It must only be loaded once the environment
// has been configured, otherwise the pool can retain an outdated DATABASE_URL.
const { default: app } = await import('./app.js')

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Novyata API available on http://localhost:${port}`)
})
