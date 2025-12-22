#!/usr/bin/env node

/**
 * Test Worker API endpoints from Node.js
 */

const API_URL = 'https://brand-management-api.testgithub0002.workers.dev';

async function testEndpoint(method, path) {
  try {
    console.log(`\n🧪 Testing ${method} ${path}`);
    const response = await fetch(`${API_URL}${path}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   CORS Headers:`);
    console.log(`   - Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`   - Content-Type: ${response.headers.get('Content-Type')}`);
    
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      console.log(`   Response:`, JSON.stringify(json, null, 2));
    } catch {
      console.log(`   Response (raw):`, text.substring(0, 200));
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🔍 Testing Brand Management API Worker');
  console.log(`   URL: ${API_URL}`);
  
  // Test basic endpoints
  await testEndpoint('GET', '/ping');
  await testEndpoint('GET', '/health');
  await testEndpoint('GET', '/debug/env');
  await testEndpoint('OPTIONS', '/setup/init-db');
  await testEndpoint('POST', '/setup/init-db');
  
  console.log('\n✅ Tests complete');
}

runTests().catch(console.error);
