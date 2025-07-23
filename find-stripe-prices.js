// Load environment variables
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function findStripePrices() {
    console.log('🔍 Finding your Stripe products and prices...\n');
    
    try {
        // Get all products
        console.log('📋 Fetching products...');
        const products = await stripe.products.list({
            limit: 100,
            active: true
        });
        
        console.log(`✅ Found ${products.data.length} products:\n`);
        
        for (const product of products.data) {
            console.log(`🏷️  Product: ${product.name} (ID: ${product.id})`);
            console.log(`   Description: ${product.description || 'No description'}`);
            console.log(`   Active: ${product.active}`);
            console.log(`   Created: ${new Date(product.created * 1000).toLocaleDateString()}`);
            
            // Get prices for this product
            const prices = await stripe.prices.list({
                product: product.id,
                active: true
            });
            
            if (prices.data.length > 0) {
                console.log(`   💰 Prices:`);
                prices.data.forEach(price => {
                    const amount = price.unit_amount / 100;
                    const currency = price.currency.toUpperCase();
                    const interval = price.recurring ? price.recurring.interval : 'one-time';
                    console.log(`      - ${currency} ${amount} / ${interval} (ID: ${price.id})`);
                });
            } else {
                console.log(`   ⚠️  No active prices found`);
            }
            
            console.log(''); // Empty line for readability
        }
        
        // Summary
        console.log('📊 Summary:');
        console.log(`   Total Products: ${products.data.length}`);
        const allPrices = await stripe.prices.list({ limit: 100, active: true });
        console.log(`   Total Active Prices: ${allPrices.data.length}`);
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Copy the price IDs from above');
        console.log('   2. Update the price IDs in utils/stripeSubscriptionService.js');
        console.log('   3. Make sure you have 6 price IDs (3 products × 2 intervals each)');
        console.log('   4. Run the test again to verify everything works');
        
    } catch (error) {
        console.error('❌ Error fetching Stripe data:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check your STRIPE_SECRET_KEY in .env file');
        console.log('   2. Make sure your Stripe account is active');
        console.log('   3. Verify you have products and prices in your Stripe dashboard');
    }
}

// Run the script
findStripePrices(); 