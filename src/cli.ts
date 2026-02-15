import { IntervalsClient } from './intervals-client';
import { loadConfig } from './config';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function parseInput(args: string[], stdin?: string): any {
  const jsonFlagIndex = args.indexOf('--json');
  if (jsonFlagIndex !== -1 && args[jsonFlagIndex + 1]) {
    return JSON.parse(args[jsonFlagIndex + 1]);
  }
  if (stdin && stdin.trim().length > 0) {
    return JSON.parse(stdin);
  }
  return {};
}

function output(ok: boolean, data?: JsonValue, error?: string): void {
  const payload: any = { ok };
  if (ok) payload.data = data ?? null;
  if (!ok) payload.error = error || 'Unknown error';
  process.stdout.write(JSON.stringify(payload));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    output(true, {
      commands: [
        'get-athlete',
        'get-activities',
        'get-calendar-events',
        'upload-workout',
        'delete-event',
      ],
      input: 'JSON via stdin or --json \'{"key":"value"}\'',
    });
    return;
  }

  try {
    let input: any = {};
    if (args.includes('--json')) {
      input = parseInput(args);
    } else {
      const stdin = await readStdin();
      input = parseInput(args, stdin);
    }
    const config = loadConfig();
    const client = new IntervalsClient(config);

    switch (command) {
      case 'get-athlete': {
        const athleteId = input.athleteId || 'me';
        const data = await client.getAthlete(athleteId);
        output(true, data);
        break;
      }
      case 'get-activities': {
        const athleteId = input.athleteId || 'me';
        const data = await client.getActivities(
          athleteId,
          input.oldest,
          input.newest
        );
        output(true, data);
        break;
      }
      case 'get-calendar-events': {
        const athleteId = input.athleteId || 'me';
        const data = await client.getCalendarEvents(
          athleteId,
          input.oldest,
          input.newest
        );
        output(true, data);
        break;
      }
      case 'upload-workout': {
        const athleteId = input.athleteId || 'me';
        if (!input.workout) {
          throw new Error('Missing workout payload');
        }
        const data = await client.uploadWorkout(athleteId, input.workout);
        output(true, data);
        break;
      }
      case 'delete-event': {
        const athleteId = input.athleteId || 'me';
        if (!input.eventId) {
          throw new Error('Missing eventId');
        }
        const data = await client.deleteEvent(athleteId, input.eventId);
        output(true, data);
        break;
      }
      default: {
        throw new Error(`Unknown command: ${command}`);
      }
    }
  } catch (err: any) {
    output(false, null, err?.message || String(err));
    process.exitCode = 1;
  }
}

main();
