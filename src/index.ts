import { IntervalsClient } from './intervals-client';
import * as fs from 'fs';
import * as path from 'path';

// Load config
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Create and export client
export const client = new IntervalsClient({
  apiKey: config.intervalsIcu.apiKey,
  baseUrl: config.intervalsIcu.baseUrl,
});

export { IntervalsClient };
