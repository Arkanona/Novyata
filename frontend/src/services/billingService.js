import { authenticatedRequest } from './request'

export const startProCheckout = () => authenticatedRequest('/api/v1/billing/checkout', { method: 'POST' })
export const openCustomerPortal = () => authenticatedRequest('/api/v1/billing/portal', { method: 'POST' })
