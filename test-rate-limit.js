const fetch = require('node-fetch');

async function testRateLimit() {
    const baseUrl = 'http://localhost:3000';
    const token = 'your-test-token'; // Replace with actual token
    
    console.log('🧪 Testing rate limiting...');
    
    try {
        // Test multiple requests to see rate limiting in action
        for (let i = 1; i <= 50; i++) {
            try {
                const response = await fetch(`${baseUrl}/api/users`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.status === 429) {
                    const errorData = await response.json();
                    console.log(`❌ Rate limited at request ${i}:`, errorData);
                    break;
                } else if (response.ok) {
                    console.log(`✅ Request ${i} successful`);
                } else {
                    console.log(`⚠️ Request ${i} failed with status:`, response.status);
                }
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.log(`❌ Request ${i} error:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testRateLimit(); 