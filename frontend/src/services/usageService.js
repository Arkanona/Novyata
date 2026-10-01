import { authenticatedRequest } from './request'

export const getUsage = () => authenticatedRequest('/api/v1/usage')
