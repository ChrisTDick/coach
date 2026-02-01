import { client } from '../index';

/**
 * Example: Working with multiple clients
 *
 * To use this with real clients, you'll need:
 * 1. OAuth setup (for accessing other athletes' data)
 * 2. Or ask clients to add you as their coach on intervals.icu
 * 3. Then you can access their athlete IDs
 */

interface Client {
  name: string;
  athleteId: string;
  plan: 'beginner' | 'intermediate' | 'advanced';
}

// Example client list
const clients: Client[] = [
  { name: 'Christopher', athleteId: 'i238425', plan: 'intermediate' },
  // Add your clients here:
  // { name: 'Client Name', athleteId: 'i123456', plan: 'beginner' },
];

async function checkClientsProgress() {
  console.log('Checking progress for all clients...\n');

  for (const client_info of clients) {
    try {
      console.log(`\n--- ${client_info.name} (${client_info.plan}) ---`);

      // Get last 7 days of activities
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const activities = await client.getActivities(
        client_info.athleteId,
        sevenDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      );

      console.log(`Activities this week: ${activities.length}`);

      const runs = activities.filter(a => a.type === 'Run');
      const totalDistance = runs.reduce((sum, a) => sum + (a.distance || 0), 0);

      console.log(`Running activities: ${runs.length}`);
      console.log(`Total running distance: ${(totalDistance / 1000).toFixed(1)}km`);

      if (runs.length > 0) {
        console.log('\nRecent runs:');
        runs.slice(0, 3).forEach(run => {
          const distanceKm = run.distance ? (run.distance / 1000).toFixed(1) : 'N/A';
          const date = new Date(run.start_date_local).toLocaleDateString();
          console.log(`  ${date} - ${run.name} (${distanceKm}km)`);
        });
      }

    } catch (error: any) {
      console.error(`Error for ${client_info.name}:`, error.message);
    }
  }

  console.log('\n✅ Client check complete!');
}

async function uploadWorkoutToClient(clientAthleteId: string, workout: any) {
  try {
    console.log(`Uploading workout to client ${clientAthleteId}...`);
    const result = await client.uploadWorkout(clientAthleteId, workout);
    console.log('✅ Workout uploaded! Event ID:', result.id);
    return result;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the client check
checkClientsProgress();
