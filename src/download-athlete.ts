import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';

// Load config
const config = loadConfig();

const client: AxiosInstance = axios.create({
  baseURL: config.baseUrl || 'https://intervals.icu/api/v1',
  auth: {
    username: 'API_KEY',
    password: config.apiKey,
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

const DATA_DIR = path.join(__dirname, '../data');
const START_DATE = '2025-12-25';
const END_DATE = new Date().toISOString().split('T')[0]; // Today

// Parse command line args
const args = process.argv.slice(2);
const athleteId = args[0] || 'me';
const athleteName = args[1] || 'me';

interface DownloadResult {
  athlete: any;
  activities: any[];
  activityDetails: any[];
  calendarEvents: any[];
  wellness: any[];
  powerCurve: any;
  streams: { [activityId: string]: any };
}

async function downloadAllData(): Promise<DownloadResult> {
  console.log(`\n=== Downloading data for ${athleteName} (${athleteId}) ===`);
  console.log(`Date range: ${START_DATE} to ${END_DATE}\n`);

  const result: DownloadResult = {
    athlete: null,
    activities: [],
    activityDetails: [],
    calendarEvents: [],
    wellness: [],
    powerCurve: null,
    streams: {},
  };

  // 1. Get athlete profile
  console.log('Fetching athlete profile...');
  try {
    const athleteRes = await client.get(`/athlete/${athleteId}`);
    result.athlete = athleteRes.data;
    console.log(`  ✓ Athlete: ${result.athlete.name} (ID: ${result.athlete.id})`);
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.message}`);
  }

  const id = result.athlete?.id || athleteId;

  // 2. Get activities list
  console.log('\nFetching activities list...');
  try {
    const activitiesRes = await client.get(`/athlete/${id}/activities`, {
      params: { oldest: START_DATE, newest: END_DATE },
    });
    result.activities = activitiesRes.data;
    console.log(`  ✓ Found ${result.activities.length} activities`);
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.message}`);
  }

  // 3. Get detailed info for each activity
  console.log('\nFetching detailed activity data...');
  for (const activity of result.activities) {
    try {
      const detailRes = await client.get(`/activity/${activity.id}`);
      result.activityDetails.push(detailRes.data);
      console.log(`  ✓ ${activity.start_date_local?.split('T')[0]} - ${activity.name || activity.type}`);

      // Try to get activity streams
      try {
        const streamsRes = await client.get(`/activity/${activity.id}/streams`, {
          params: { types: 'time,latlng,distance,altitude,heartrate,cadence,watts,temp' },
        });
        result.streams[activity.id] = streamsRes.data;
      } catch {
        // Streams may not be available
      }
    } catch (err: any) {
      console.log(`  ✗ Activity ${activity.id}: ${err.message}`);
    }
  }

  // 4. Get calendar events
  console.log('\nFetching calendar events...');
  try {
    const eventsRes = await client.get(`/athlete/${id}/events`, {
      params: { oldest: START_DATE, newest: END_DATE },
    });
    result.calendarEvents = eventsRes.data;
    console.log(`  ✓ Found ${result.calendarEvents.length} calendar events`);
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.message}`);
  }

  // 5. Get wellness data
  console.log('\nFetching wellness data...');
  try {
    const wellnessRes = await client.get(`/athlete/${id}/wellness`, {
      params: { oldest: START_DATE, newest: END_DATE },
    });
    result.wellness = wellnessRes.data;
    console.log(`  ✓ Found ${result.wellness.length} wellness records`);
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.message}`);
  }

  // 6. Get power curve
  console.log('\nFetching power curve...');
  try {
    const powerRes = await client.get(`/athlete/${id}/power-curves`, {
      params: { oldest: START_DATE, newest: END_DATE },
    });
    result.powerCurve = powerRes.data;
    console.log(`  ✓ Power curve data retrieved`);
  } catch (err: any) {
    console.log(`  ✗ Error: ${err.message}`);
  }

  return result;
}

function saveData(data: DownloadResult, name: string): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '-');
  const subDir = path.join(DATA_DIR, `${safeName}-${timestamp}`);
  fs.mkdirSync(subDir, { recursive: true });

  fs.writeFileSync(path.join(subDir, 'athlete.json'), JSON.stringify(data.athlete, null, 2));
  fs.writeFileSync(path.join(subDir, 'activities-list.json'), JSON.stringify(data.activities, null, 2));
  fs.writeFileSync(path.join(subDir, 'activities-detailed.json'), JSON.stringify(data.activityDetails, null, 2));
  fs.writeFileSync(path.join(subDir, 'calendar-events.json'), JSON.stringify(data.calendarEvents, null, 2));
  fs.writeFileSync(path.join(subDir, 'wellness.json'), JSON.stringify(data.wellness, null, 2));
  fs.writeFileSync(path.join(subDir, 'power-curve.json'), JSON.stringify(data.powerCurve, null, 2));

  if (Object.keys(data.streams).length > 0) {
    fs.writeFileSync(path.join(subDir, 'activity-streams.json'), JSON.stringify(data.streams, null, 2));
  }

  fs.writeFileSync(path.join(subDir, 'all-data.json'), JSON.stringify(data, null, 2));

  console.log(`\n📁 Data saved to: ${subDir}`);
  return subDir;
}

function generateSummary(data: DownloadResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD SUMMARY');
  console.log('='.repeat(60));

  console.log(`\nDate Range: ${START_DATE} to ${END_DATE}`);

  if (data.athlete) {
    console.log(`\n👤 ATHLETE`);
    console.log(`   Name: ${data.athlete.name}`);
    console.log(`   ID: ${data.athlete.id}`);
  }

  console.log(`\n🏃 ACTIVITIES (${data.activities.length} total)`);

  const byType: { [key: string]: any[] } = {};
  for (const activity of data.activityDetails.length ? data.activityDetails : data.activities) {
    const type = activity.type || 'Unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(activity);
  }

  for (const [type, activities] of Object.entries(byType)) {
    const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalTime = activities.reduce((sum, a) => sum + (a.moving_time || 0), 0);
    console.log(`   ${type}: ${activities.length} activities, ${(totalDistance / 1000).toFixed(1)}km, ${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m`);
  }

  console.log(`\n📆 CALENDAR EVENTS: ${data.calendarEvents.length}`);
  console.log(`💚 WELLNESS RECORDS: ${data.wellness.length}`);
  console.log(`⚡ ACTIVITY STREAMS: ${Object.keys(data.streams).length} activities`);
  console.log('='.repeat(60));
}

async function main() {
  try {
    const data = await downloadAllData();
    const folderPath = saveData(data, athleteName);
    generateSummary(data);

    // Output folder path for chaining
    console.log(`\nFOLDER_PATH=${folderPath}`);
  } catch (err: any) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
