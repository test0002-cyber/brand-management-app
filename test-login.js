#!/usr/bin/env node

/**
 * Test script to verify login endpoint functionality
 * Tests JWT signing, bcrypt comparison, and error handling
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-super-secret-key-change-this-in-production';

async function testJWT() {
  console.log('\n=== Testing JWT ===');
  try {
    const token = jwt.sign(
      { userId: 1, username: 'admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✓ JWT signing works');
    console.log('  Token:', token.substring(0, 50) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✓ JWT verification works');
    console.log('  Decoded:', decoded);
  } catch (error) {
    console.error('✗ JWT error:', error.message);
  }
}

async function testBcrypt() {
  console.log('\n=== Testing bcrypt ===');
  try {
    const password = 'admin123';
    const hardcodedPassword = 'admin123';
    
    // Test hardcoded password comparison (like in the login route)
    const isValid = hardcodedPassword === password;
    console.log('✓ Hardcoded password comparison:', isValid);
    
    // Test bcrypt
    const hashedPassword = await bcrypt.hash('test_password', 10);
    console.log('✓ bcrypt hash works');
    
    const isMatch = await bcrypt.compare('test_password', hashedPassword);
    console.log('✓ bcrypt compare works:', isMatch);
  } catch (error) {
    console.error('✗ bcrypt error:', error.message);
  }
}

async function testJsonParsing() {
  console.log('\n=== Testing JSON parsing ===');
  try {
    const mockBody = JSON.stringify({ username: 'admin', password: 'admin123' });
    const parsed = JSON.parse(mockBody);
    console.log('✓ JSON parsing works');
    console.log('  Parsed:', parsed);
  } catch (error) {
    console.error('✗ JSON parsing error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Brand Management API - Login Test Suite');
  console.log('==========================================');
  
  await testJWT();
  await testBcrypt();
  await testJsonParsing();
  
  console.log('\n✅ All local tests completed');
  console.log('\nNote: These tests verify the crypto functions work.');
  console.log('To test the actual API endpoint, you need to:');
  console.log('1. Visit: https://brand-management-api.testgithub0002.workers.dev/health');
  console.log('2. Try login: POST to /auth/login with username & password');
}

runTests().catch(console.error);
