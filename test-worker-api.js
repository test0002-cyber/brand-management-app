#!/usr/bin/env node

/**
 * Test Worker API endpoints from Node.js with Authentication
 */

const API_URL = 'http://localhost:8787';
let authToken = '';

async function testEndpoint(method, path, body = null, isCsv = false) {
  try {
    console.log(`\n🧪 Testing ${method} ${path}`);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      method: method,
      headers: headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${path}`, options);

    console.log(`   Status: ${response.status} ${response.statusText}`);

    const text = await response.text();
    if (isCsv && response.ok) {
      console.log(`   CSV Length: ${text.length} characters`);
      console.log(`   First Line: ${text.split('\n')[0]}`);
      return text;
    }

    try {
      const json = JSON.parse(text);
      console.log(`   Response:`, JSON.stringify(json, null, 2));
      return json;
    } catch {
      console.log(`   Response (raw):`, text.substring(0, 200));
      return text;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🔍 Testing Brand Management API Worker (Authenticated)');

  // 1. Health Check
  await testEndpoint('GET', '/health');

  // 2. Login
  console.log('\n🔑 Attempting Login...');
  const loginRes = await testEndpoint('POST', '/auth/login', {
    username: 'admin',
    password: 'admin123'
  });

  if (loginRes && loginRes.token) {
    authToken = loginRes.token;
    console.log('   ✅ Logged in successfully');
  } else {
    console.log('   ❌ Login failed, skipping authenticated tests');
    return;
  }

  // 3. Test Brands
  await testEndpoint('GET', '/brands');

  // 4. Create a Brand
  const newBrand = {
    brand_name: 'Test Brand ' + Date.now(),
    master_outlet_id: 'MO-123'
  };
  await testEndpoint('POST', '/brands', newBrand);

  // 5. Get Brands again
  const brandsRes = await testEndpoint('GET', '/brands');
  const brands = brandsRes.brands || [];
  const testBrand = brands.find(b => b.brand_name === newBrand.brand_name);

  if (testBrand) {
    console.log(`   ✅ Brand created and found: ID ${testBrand.id}`);

    // 6. Test Export
    await testEndpoint('GET', '/export/all-brands', null, true);

    // 7. Test Users
    await testEndpoint('GET', '/users');

    // 8. Test Data Logs
    await testEndpoint('GET', '/data/login-logs');
  }

  console.log('\n✅ Authenticated Tests complete');
}

runTests().catch(console.error);
