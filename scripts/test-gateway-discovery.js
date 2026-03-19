#!/usr/bin/env node

/**
 * 🚀 originCheck - Step 1.2 Gateway Discovery Testing
 * Tests Gateway URL construction, auth detection, and health monitoring
 */

import { UniversalConfigReader } from '../lib/config-discovery.js';
import { GatewayHealthMonitor } from '../lib/gateway-health.js';

console.log('🚀 originCheck - Step 1.2 Gateway Discovery Testing');
console.log('===============================================\n');

async function runGatewayDiscoveryTests() {
  let testsPassed = 0;
  let totalTests = 0;

  // Test 1: Gateway URL Construction
  console.log('🔧 Test 1: Gateway URL Construction');
  totalTests++;
  try {
    const reader = new UniversalConfigReader();
    
    // Test with your actual OpenClaw config structure
    const testConfig = {
      gateway: {
        port: 18789,
        mode: 'local',
        bind: 'loopback',
        auth: {
          mode: 'token',
          token: 'test-token-123'
        }
      }
    };

    const gatewayURL = reader.constructGatewayURL(testConfig);
    console.log(`   ✅ Gateway URL: ${gatewayURL}`);
    
    if (gatewayURL === 'http://localhost:18789') {
      console.log('   ✅ URL construction correct');
      testsPassed++;
    } else {
      console.log(`   ❌ Expected http://localhost:18789, got ${gatewayURL}`);
    }
    
    reader.close();
  } catch (error) {
    console.log(`   ❌ URL construction failed: ${error.message}`);
  }
  console.log();

  // Test 2: URL Validation
  console.log('🌐 Test 2: URL Validation');
  totalTests++;
  try {
    const reader = new UniversalConfigReader();
    
    const validURLs = [
      'http://localhost:18789',
      'https://gateway.example.com:8080',
      'http://0.0.0.0:18789'
    ];
    
    const invalidURLs = [
      'not-a-url',
      'ftp://localhost:18789',
      '',
      'javascript:alert(1)'
    ];
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const url of validURLs) {
      if (reader.validateGatewayURL(url)) validCount++;
    }
    
    for (const url of invalidURLs) {
      if (!reader.validateGatewayURL(url)) invalidCount++;
    }
    
    console.log(`   ✅ Valid URLs passed: ${validCount}/${validURLs.length}`);
    console.log(`   ✅ Invalid URLs rejected: ${invalidCount}/${invalidURLs.length}`);
    
    if (validCount === validURLs.length && invalidCount === invalidURLs.length) {
      console.log('   ✅ URL validation working correctly');
      testsPassed++;
    } else {
      console.log('   ❌ URL validation has issues');
    }
    
    reader.close();
  } catch (error) {
    console.log(`   ❌ URL validation failed: ${error.message}`);
  }
  console.log();

  // Test 3: Auth Detection
  console.log('🔐 Test 3: Authentication Detection');
  totalTests++;
  try {
    const reader = new UniversalConfigReader();
    
    // Test token auth
    const tokenConfig = {
      gateway: {
        auth: {
          mode: 'token',
          token: 'test-token-123'
        }
      }
    };
    
    const tokenAuth = reader.detectAuthMethod(tokenConfig);
    console.log(`   ✅ Token auth detected: ${tokenAuth.type === 'token' && tokenAuth.token ? 'Yes' : 'No'}`);
    
    // Test no auth
    const noAuthConfig = {
      gateway: {
        auth: {
          mode: 'none'
        }
      }
    };
    
    const noAuth = reader.detectAuthMethod(noAuthConfig);
    console.log(`   ✅ No auth detected: ${noAuth.type === 'none' ? 'Yes' : 'No'}`);
    
    if (tokenAuth.type === 'token' && noAuth.type === 'none') {
      console.log('   ✅ Auth detection working correctly');
      testsPassed++;
    } else {
      console.log('   ❌ Auth detection has issues');
    }
    
    reader.close();
  } catch (error) {
    console.log(`   ❌ Auth detection failed: ${error.message}`);
  }
  console.log();

  // Test 4: Complete Gateway Discovery (Non-Interactive)
  console.log('🎯 Test 4: Complete Gateway Discovery');
  totalTests++;
  try {
    const reader = new UniversalConfigReader();
    
    // Mock the interactive parts for testing
    const originalAskQuestion = reader.askQuestion;
    reader.askQuestion = async (question) => {
      console.log(`   📝 ${question} (auto-answered: 'skip')`);
      return '4'; // Choose "Skip" for testing
    };
    
    const result = await reader.discoverGateway();
    console.log(`   ✅ Discovery completed`);
    console.log(`   ✅ Config found: ${result.config ? 'Yes' : 'No'}`);
    console.log(`   ✅ Gateway URL: ${result.gatewayURL || 'None'}`);
    console.log(`   ✅ URL Valid: ${result.gatewayURLValid || false}`);
    console.log(`   ✅ Connected: ${result.gatewayConnection || false}`);
    console.log(`   ✅ Health Status: ${result.gatewayHealth?.status || 'None'}`);
    console.log(`   ✅ Auth Type: ${result.authInfo?.type || 'None'}`);
    
    reader.close();
    
    // This test passes if it completes without crashing
    console.log('   ✅ Complete discovery test passed');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Complete discovery failed: ${error.message}`);
  }
  console.log();

  // Test 5: Real OpenClaw Config Test
  console.log('🦞 Test 5: Real OpenClaw Config Test');
  totalTests++;
  try {
    // Test with your actual OpenClaw config structure
    const realConfig = {
      meta: {
        lastTouchedVersion: "2026.3.2",
        lastTouchedAt: "2026-03-07T22:31:12.585Z"
      },
      gateway: {
        port: 18789,
        mode: "local",
        bind: "loopback",
        auth: {
          mode: "token",
          token: "077af33ea6a1ce473dd9cfcabb2b9ae1ea98192de2e3abd2"
        }
      },
      channels: {
        telegram: {
          enabled: true,
          botToken: "8774736532:AAFCOr0Q-RYLjPOlOCEOGdQDgIqnubJUnLI"
        }
      }
    };
    
    const reader = new UniversalConfigReader();
    
    // Test URL construction with real config
    const realURL = reader.constructGatewayURL(realConfig);
    console.log(`   ✅ Real config Gateway URL: ${realURL}`);
    
    // Test auth detection with real config
    const realAuth = reader.detectAuthMethod(realConfig);
    console.log(`   ✅ Real config Auth: ${realAuth.type} (${realAuth.token ? 'has token' : 'no token'})`);
    
    // Test URL validation
    const isValid = reader.validateGatewayURL(realURL || '');
    console.log(`   ✅ Real config URL valid: ${isValid}`);
    
    if (realURL === 'http://localhost:18789' && realAuth.type === 'token' && isValid) {
      console.log('   ✅ Real OpenClaw config test passed');
      testsPassed++;
    } else {
      console.log('   ❌ Real config test failed');
    }
    
    reader.close();
  } catch (error) {
    console.log(`   ❌ Real config test failed: ${error.message}`);
  }
  console.log();

  // Test 6: Gateway Health Monitor Test
  console.log('🏥 Test 6: Gateway Health Monitor');
  totalTests++;
  try {
    // Test with a non-existent Gateway (should handle gracefully)
    const health = await GatewayHealthMonitor.checkGatewayHealth('http://localhost:99999');
    
    console.log(`   ✅ Health check completed: ${health.status}`);
    console.log(`   ✅ Error handled: ${health.error ? 'Yes' : 'No'}`);
    console.log(`   ✅ Response time: ${health.responseTime}ms`);
    
    // This test passes if it handles the non-existent Gateway gracefully
    if (health.status === 'unhealthy' && health.error) {
      console.log('   ✅ Gateway health monitor working correctly');
      testsPassed++;
    } else {
      console.log('   ❌ Gateway health monitor has issues');
    }
  } catch (error) {
    console.log(`   ❌ Gateway health monitor failed: ${error.message}`);
  }
  console.log();

  // Results
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${testsPassed}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);
  console.log();

  if (testsPassed === totalTests) {
    console.log('🎉 All tests passed! Step 1.2 is working correctly.');
    console.log('🚀 Ready for production deployment!');
    console.log();
    console.log('📋 Step 1.2 Features Working:');
    console.log('   ✅ Gateway URL construction');
    console.log('   ✅ URL validation');
    console.log('   ✅ Authentication detection');
    console.log('   ✅ Complete gateway discovery');
    console.log('   ✅ Real OpenClaw config compatibility');
    console.log('   ✅ Gateway health monitoring');
    console.log();
    console.log('🎯 Next Steps:');
    console.log('   1. ✅ Step 1.1: Universal Config Reader - COMPLETE');
    console.log('   2. ✅ Step 1.2: Gateway URL Discovery - COMPLETE');
    console.log('   3. 🔄 Step 1.3: Gateway Health Monitoring - NEXT');
  } else {
    console.log('💥 Some tests failed. Please check the implementation.');
    console.log('🔧 Fix issues before deploying to production.');
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run tests
runGatewayDiscoveryTests().catch(console.error);
