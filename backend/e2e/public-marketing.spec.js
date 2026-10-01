import { expect, test } from '@playwright/test'

test('public marketing routes are directly reachable and expose the main navigation', async ({ page }) => {
  await page.goto('/tarifs')
  await expect(page.getByRole('heading', { level: 1, name: /Un plan simple pour avancer/i })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Tarifs' })).toHaveAttribute('href', '/tarifs')
  await page.goto('/fonctionnalites')
  await expect(page.getByRole('heading', { name: /Les bons outils pour préparer/i })).toBeVisible()
  await page.goto('/modeles')
  await expect(page.getByRole('heading', { name: /Trois façons sobres/i })).toBeVisible()
})

test('public pricing stays within a mobile viewport and keeps its menu accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/tarifs')
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
