import { IntervalsClient } from './intervals-client';
import { loadConfig } from './config';

// Create and export client
const config = loadConfig();
export const client = new IntervalsClient({
  apiKey: config.apiKey,
  baseUrl: config.baseUrl,
});

export { IntervalsClient };
