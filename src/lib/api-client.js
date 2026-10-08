import { createApiClient } from '@code-cat-studio/api-client';

const isBackendEnabled = process.env.IS_BACKEND_ENABLED !== 'false';

export const STUDENT_HEADERS = {
  'uchi-user-type': 'Student',
  'uchi-user-id': '1'
};

export const isDev = process.env.NODE_ENV === 'development';

const apiClient = createApiClient({
  apiUrl: process.env.API_BASE_URL || '',
  mockBackend: !isBackendEnabled,
  headers: isDev ? STUDENT_HEADERS : {}
});

export default apiClient;
