import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup requests mocking for browser environment
export const worker = setupWorker(...handlers);