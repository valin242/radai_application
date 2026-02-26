// Simple script to test database connection
// Run with: node test-db-connection.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')); // Hide password
  
  try {
    await prisma.$connect();
    console.log('✓ Successfully connected to database!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('✓ Query successful:', result);
    
    await prisma.$disconnect();
    console.log('✓ Connection test passed!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Your DATABASE_URL in .env file');
    console.error('2. Get the correct connection string from Supabase dashboard:');
    console.error('   - Go to https://supabase.com/dashboard');
    console.error('   - Select your project');
    console.error('   - Go to Project Settings > Database');
    console.error('   - Copy the "Connection string" under "Session pooler" or "Direct connection"');
    console.error('3. Make sure to use the password shown in the connection string');
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
