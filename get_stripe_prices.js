const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function getStripePrices() {
    try {
        console.log('🔍 Fetching Stripe prices...\n');
        
        // Get all prices
        const prices = await stripe.prices.list({
            limit: 100,
            active: true
        });
        
        console.log('📋 Found prices:');
        console.log('='.repeat(80));
        
        const priceMap = {
            starter: { monthly: null, annual: null },
            professional: { monthly: null, annual: null },
            enterprise: { monthly: null, annual: null }
        };
        
        prices.data.forEach(price => {
            const product = price.product;
            const interval = price.recurring?.interval;
            const amount = price.unit_amount / 100; // Convert from cents
            
            console.log(`💰 Price ID: ${price.id}`);
            console.log(`   Product: ${product}`);
            console.log(`   Amount: €${amount}/${interval}`);
            console.log(`   Currency: ${price.currency}`);
            console.log(`   Active: ${price.active}`);
            console.log('');
            
            // Try to match with our plan names
            const productLower = product.toLowerCase();
            if (productLower.includes('starter')) {
                if (interval === 'month') priceMap.starter.monthly = price.id;
                if (interval === 'year') priceMap.starter.annual = price.id;
            } else if (productLower.includes('professional')) {
                if (interval === 'month') priceMap.professional.monthly = price.id;
                if (interval === 'year') priceMap.professional.annual = price.id;
            } else if (productLower.includes('enterprise')) {
                if (interval === 'month') priceMap.enterprise.monthly = price.id;
                if (interval === 'year') priceMap.enterprise.annual = price.id;
            }
        });
        
        console.log('🎯 Recommended environment variables:');
        console.log('='.repeat(80));
        
        Object.entries(priceMap).forEach(([plan, prices]) => {
            console.log(`# ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`);
            if (prices.monthly) {
                console.log(`STRIPE_${plan.toUpperCase()}_MONTHLY_PRICE_ID=${prices.monthly}`);
            }
            if (prices.annual) {
                console.log(`STRIPE_${plan.toUpperCase()}_ANNUAL_PRICE_ID=${prices.annual}`);
            }
            console.log('');
        });
        
        console.log('📝 Instructions:');
        console.log('1. Copy the price IDs above');
        console.log('2. Add them to your .env file');
        console.log('3. Update routes/subscriptions.js with the real price IDs');
        console.log('4. Restart your server');
        
    } catch (error) {
        console.error('❌ Error fetching Stripe prices:', error.message);
        console.log('\n💡 Make sure your STRIPE_SECRET_KEY is set in your environment variables');
    }
}

// Run the script
getStripePrices(); 