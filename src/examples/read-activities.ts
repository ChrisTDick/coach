import { client } from '../index';

/**
 * Example: Read and analyze recent activities
 */
async function readActivities() {
  try {
    // Get current user
    const athleteInfo = await client.getAthlete('me');
    const athleteId = athleteInfo.id;

    console.log(`Reading activities for ${athleteInfo.name}...\n`);

    // Get last 30 days of activities
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activities = await client.getActivities(
      athleteId,
      thirtyDaysAgo.toISOString().split('T')[0],
      now.toISOString().split('T')[0]
    );

    console.log(`Found ${activities.length} activities in the last 30 days\n`);

    // Analyze by type
    const byType = activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Activities by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Show recent runs
    console.log('\nRecent runs:');
    const runs = activities
      .filter(a => a.type === 'Run')
      .slice(0, 5);

    runs.forEach(run => {
      const distanceKm = run.distance ? (run.distance / 1000).toFixed(1) : 'N/A';
      const date = new Date(run.start_date_local).toLocaleDateString();
      console.log(`  ${date} - ${run.name} (${distanceKm}km)`);
    });

    // Calculate total distance
    const totalDistance = activities
      .filter(a => a.distance)
      .reduce((sum, a) => sum + (a.distance || 0), 0);

    console.log(`\nTotal distance (30 days): ${(totalDistance / 1000).toFixed(1)}km`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

readActivities();
