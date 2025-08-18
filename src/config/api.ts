export const API_CONFIG = {
  BASE_URL: 'https://truereach-production.up.railway.app',
  ENDPOINTS: {
    NOTIFICATIONS: '/api/v1/notifications',
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
  },
} as const;
