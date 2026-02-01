# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript connector for the intervals.icu API, used to manage marathon training plans for coaching clients. It enables reading activities, uploading workouts, and managing calendar events on intervals.icu.

## Commands

```bash
# Install dependencies
npm install

# Run tests (verifies API authentication and basic operations)
npm test

# Run a specific TypeScript file
npx ts-node src/examples/upload-workout.ts

# Build to JavaScript
npm run build
```

## Architecture

The codebase is a simple API client wrapper:

- `src/intervals-client.ts` - Core `IntervalsClient` class wrapping the intervals.icu REST API with axios
- `src/index.ts` - Entry point that loads config and exports a pre-configured client instance
- `src/examples/` - Usage examples for uploading workouts, reading activities, bulk operations

## Configuration

API credentials are stored in `config.json` (gitignored) with structure:
```json
{
  "intervalsIcu": {
    "apiKey": "your-api-key",
    "baseUrl": "https://intervals.icu/api/v1"
  }
}
```

## Key Concepts

- **Athlete ID**: Use `'me'` for the authenticated user, or specific IDs like `'i238425'` for clients
- **Workout descriptions**: intervals.icu parses structured text into workout steps (e.g., `- 10m Z2` for 10 minutes in Zone 2)

## API Key Setup

1. Log in to intervals.icu
2. Go to Settings > Developer Settings
3. Generate an API key
4. Add to `config.json`

## Usage Examples

```typescript
import { client } from './src/index';

// Get athlete info
const athlete = await client.getAthlete('me');

// Get activities (last 90 days default, or specify date range)
const activities = await client.getActivities('i238425');
const activities = await client.getActivities('i238425', '2026-01-01', '2026-01-31');

// Upload a workout
await client.uploadWorkout('i238425', {
  start_date_local: '2026-01-25T08:00:00',
  type: 'Run',
  name: 'Easy Recovery Run',
  description: `Warmup\n- 10m Z2\n\nMain\n- 30m Z2\n\nCooldown\n- 5m Z1`
});

// Get/delete calendar events
const events = await client.getCalendarEvents('i238425', '2026-01-20', '2026-02-20');
await client.deleteEvent('i238425', eventId);
```

## Workout Description Format

Intervals.icu parses structured text into workout steps:

```
Section Name
- duration target cadence

Intervals
- 5x 1km Z4
- 2m Z1

Sweet Spot (cycling)
- 3x 12m 88%-92% 85rpm
```

## API Reference

- `getAthlete(athleteId)` - Get athlete info ('me' for current user)
- `getActivities(athleteId, oldest?, newest?)` - Get completed activities
- `uploadWorkout(athleteId, workout)` - Upload planned workout
- `getCalendarEvents(athleteId, oldest?, newest?)` - Get calendar events
- `deleteEvent(athleteId, eventId)` - Delete calendar event
