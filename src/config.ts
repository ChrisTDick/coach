import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore unreadable env files; rely on process env instead.
  }
}

export interface IntervalsConfig {
  apiKey: string;
  baseUrl?: string;
}

export function loadConfig(): IntervalsConfig {
  const envFile =
    process.env.OPENCLAW_ENV_FILE || '/etc/openclaw/openclaw.env';
  loadEnvFile(envFile);

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
