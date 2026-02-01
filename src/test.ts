import { client } from './index';

async function test() {
  try {
    console.log('Testing intervals.icu API connector...\n');

    console.log('1. Testing authentication...');

    // Use 'me' to get current user info
    const athleteInfo = await client.getAthlete('me');
    const athleteId = athleteInfo.id;
    console.log('✅ Authenticated as:', athleteInfo.name);
    console.log('   Athlete ID:', athleteId);

    console.log(`\n2. Getting activities for athlete ${athleteId}...`);
    const activities = await client.getActivities(athleteId, undefined, undefined);
    console.log(`Found ${activities.length} activities`);
    if (activities.length > 0) {
      console.log('Most recent activity:', {
        name: activities[0].name,
        type: activities[0].type,
        date: activities[0].start_date_local,
      });
    }

    console.log('\n3. Getting calendar events...');
    const events = await client.getCalendarEvents(athleteId);
    console.log(`Found ${events.length} calendar events`);

    // Test uploading a workout (commented out to avoid creating test data)
    /*
    console.log('\n4. Testing workout upload...');
    const workout = {
      start_date_local: '2026-01-20T09:00:00',
      type: 'Run',
      name: 'Test Easy Run',
      description: 'Warmup\n- 10m Z2\n\nMain\n- 30m Z2\n\nCooldown\n- 5m Z1',
    };
    const uploadResult = await client.uploadWorkout(athleteId, workout);
    console.log('Workout uploaded:', uploadResult);
    */

    console.log('\n✅ All tests passed!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

test();
