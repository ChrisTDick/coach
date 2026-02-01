import { client } from '../index';

/**
 * Example: Upload a marathon training workout
 */
async function uploadMarathonWorkout() {
  try {
    // Get current user
    const athleteInfo = await client.getAthlete('me');
    const athleteId = athleteInfo.id;

    console.log(`Uploading workout for ${athleteInfo.name}...\n`);

    // Example marathon long run workout
    const longRun = {
      start_date_local: '2026-01-25T08:00:00',
      type: 'Run',
      name: 'Marathon Long Run - 25km',
      description: `Warmup
- 10m Z2

Main Set
- 23km Z2-Z3 (marathon pace effort)

Cooldown
- 2km Z1 easy`,
    };

    console.log('Workout details:');
    console.log('Name:', longRun.name);
    console.log('Date:', longRun.start_date_local);
    console.log('Type:', longRun.type);
    console.log('\nDescription:');
    console.log(longRun.description);

    console.log('\nUploading...');
    const result = await client.uploadWorkout(athleteId, longRun);

    console.log('✅ Workout uploaded successfully!');
    console.log('Event ID:', result.id);
    console.log('\nCheck your intervals.icu calendar to see the workout.');

    return result;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

uploadMarathonWorkout();
