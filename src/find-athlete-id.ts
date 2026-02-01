import { client } from './index';

/**
 * Helper script to find your athlete ID
 * This will try common patterns to help you identify your athlete ID
 */
async function findAthleteId() {
  console.log('Attempting to find your athlete ID...\n');

  // Method 1: Try to use the /athlete endpoint without an ID (some APIs support this)
  console.log('Method 1: Trying to access athlete info endpoint...');
  try {
    // Try accessing with 'me' or without ID
    const response = await (client as any).client.get('/athlete/me');
    console.log('✅ Found using /athlete/me:', response.data);
    return response.data.id;
  } catch (error: any) {
    console.log('❌ /athlete/me not available');
  }

  // Method 2: Check if we can list athletes (for coaches)
  console.log('\nMethod 2: Trying to list athletes...');
  try {
    const response = await (client as any).client.get('/athletes');
    console.log('✅ Athletes list:', response.data);
    if (response.data.length > 0) {
      console.log('Your athlete IDs:', response.data.map((a: any) => a.id));
      return response.data[0].id;
    }
  } catch (error: any) {
    console.log('❌ Cannot list athletes');
  }

  // Method 3: Provide instructions
  console.log('\n📋 To find your athlete ID manually:');
  console.log('1. Log in to intervals.icu');
  console.log('2. Look at the URL when viewing your calendar or activities');
  console.log('3. Your athlete ID is in the format: i12345678');
  console.log('4. Or go to Settings > Developer Settings to see your athlete ID');
  console.log('\nOnce you have your athlete ID, update it in the test.ts file');
}

findAthleteId().catch(console.error);
