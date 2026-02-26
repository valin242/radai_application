/**
 * Quick test script to verify onboarding status endpoint returns correct format
 */

const API_URL = process.env.API_URL || 'http://localhost:8000';

async function testOnboardingStatus() {
  console.log('Testing onboarding status endpoint...\n');
  
  // You'll need to replace this with a real auth token from your test user
  const token = process.argv[2];
  
  if (!token) {
    console.error('Usage: npx ts-node test-onboarding-status.ts <AUTH_TOKEN>');
    console.error('\nTo get a token:');
    console.error('1. Sign in to the mobile app');
    console.error('2. Check the console logs for the auth token');
    console.error('3. Or use Supabase dashboard to get a JWT token');
    process.exit(1);
  }

  try {
    const response = await fetch(`${API_URL}/onboarding/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Error:', error);
      return;
    }

    const data = await response.json();
    console.log('\nResponse data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Verify the format
    if ('onboardingCompleted' in data) {
      console.log('\n✅ Response uses camelCase (onboardingCompleted) - CORRECT!');
    } else if ('onboarding_completed' in data) {
      console.log('\n❌ Response uses snake_case (onboarding_completed) - WRONG!');
    } else {
      console.log('\n❌ Response missing onboarding status field!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testOnboardingStatus();
