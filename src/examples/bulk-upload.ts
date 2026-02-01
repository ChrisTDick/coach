import { client } from '../index';

/**
 * Example: Upload a week of marathon training workouts
 */
async function uploadWeekOfTraining() {
  try {
    // Get current user
    const athleteInfo = await client.getAthlete('me');
    const athleteId = athleteInfo.id;

    console.log(`Uploading training week for ${athleteInfo.name}...\n`);

    // Define a week of marathon training (starting next Monday)
    const startDate = new Date('2026-01-19'); // Adjust this to your target week

    const workouts = [
      {
        day: 0, // Monday
        type: 'Run',
        name: 'Easy Recovery Run',
        description: `Warmup
- 5m Z1-Z2

Main
- 40m Z2

Cooldown
- 5m Z1`,
      },
      {
        day: 1, // Tuesday
        type: 'Run',
        name: 'Tempo Run',
        description: `Warmup
- 15m Z2

Tempo
- 20m Z3-Z4 (tempo pace)

Cooldown
- 10m Z1`,
      },
      {
        day: 2, // Wednesday
        type: 'Run',
        name: 'Easy Run',
        description: `Easy
- 45m Z2`,
      },
      {
        day: 3, // Thursday
        type: 'Run',
        name: 'Interval Session',
        description: `Warmup
- 15m Z2

Intervals
- 6x 800m Z4-Z5
- 90s Z1 recovery

Cooldown
- 10m Z1`,
      },
      {
        day: 4, // Friday
        type: 'Run',
        name: 'Rest or Cross-Training',
        description: `Optional
- 30m easy cross-training
- Or complete rest`,
      },
      {
        day: 5, // Saturday
        type: 'Run',
        name: 'Easy Run',
        description: `Easy
- 50m Z2`,
      },
      {
        day: 6, // Sunday
        type: 'Run',
        name: 'Long Run',
        description: `Warmup
- 10m Z2

Long Run
- 90m Z2-Z3 (build to marathon pace in final 30m)

Cooldown
- 5m Z1`,
      },
    ];

    console.log(`Uploading ${workouts.length} workouts...\n`);

    for (const workout of workouts) {
      const workoutDate = new Date(startDate);
      workoutDate.setDate(workoutDate.getDate() + workout.day);

      const workoutData = {
        start_date_local: `${workoutDate.toISOString().split('T')[0]}T08:00:00`,
        type: workout.type,
        name: workout.name,
        description: workout.description,
      };

      console.log(`Uploading: ${workout.name} (${workoutDate.toDateString()})`);

      const result = await client.uploadWorkout(athleteId, workoutData);
      console.log(`  ✅ Uploaded (Event ID: ${result.id})`);
    }

    console.log('\n✅ All workouts uploaded successfully!');
    console.log('Check your intervals.icu calendar to see the training week.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

uploadWeekOfTraining();
