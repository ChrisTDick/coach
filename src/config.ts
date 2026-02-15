import * as fs from 'fs';
import * as path from 'path';

export interface IntervalsConfig {
  apiKey: string;
  baseUrl?: string;
}

export function loadConfig(): IntervalsConfig {
  const envApiKey = process.env.INTERVALS_ICU_API_KEY;
  const envBaseUrl = process.env.INTERVALS_ICU_BASE_URL;

  if (envApiKey) {
    return {
      apiKey: envApiKey,
      baseUrl: envBaseUrl,
    };
  }

  const configPath =
    process.env.COACH_CONFIG_PATH || path.join(__dirname, '../config.json');

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Missing INTERVALS_ICU_API_KEY and config file not found at ${configPath}`
    );
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(raw);

  if (!config?.intervalsIcu?.apiKey) {
    throw new Error('config.json missing intervalsIcu.apiKey');
  }

  return {
    apiKey: config.intervalsIcu.apiKey,
    baseUrl: config.intervalsIcu.baseUrl,
  };
}
