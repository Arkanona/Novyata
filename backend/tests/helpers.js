import { vi } from 'vitest'

export function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  }
}
