import { Router } from 'express'

const router = Router()

// This placeholder keeps the HTTP contract ready while the Supabase schema is added.
router.get('/', (req, res) => {
  res.json({ applications: [] })
})

export default router
