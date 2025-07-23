# Stripe Subscription Setup Guide

## Overview
This guide will help you configure the Stripe subscription system with your actual price IDs.

## Step 1: Update Price IDs in the Service

You need to update the `utils/stripeSubscriptionService.js` file with your actual Stripe price IDs.

### Current Configuration (Replace with your actual price IDs):

```javascript
this.products = {
    starter: {
        name: 'Starter',
        monthly: {
            priceId: 'price_starter_monthly', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
            amount: 29,
            currency: 'eur',
            interval: 'month'
        },
        annual: {
            priceId: 'price_starter_annual', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
            amount: 299,
            currency: 'eur',
            interval: 'year'
        }
    },
    professional: {
        name: 'Professional',
        monthly: {
            priceId: 'price_professional_monthly', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
            amount: 79,
            currency: 'eur',
            interval: 'month'
        },
        annual: {
            priceId: 'price_professional_annual', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
            amount: 799,
            currency: 'eur',
            interval: 'year'
        }
    },
    enterprise: {
        name: 'Enterprise',
        monthly: {
            priceId: 'price_enterprise_monthly', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
            amount: 199,
            currency: 'eur',
            interval: 'month'
        },
        annual: {
            priceId: 'price_enterprise_annual', // ⚠️ REPLACE WITH YOUR ACTUAL PRICE ID
            amount: 1999,
            currency: 'eur',
            interval: 'year'
        }
    }
};
```

### How to Find Your Price IDs:

1. Go to your Stripe Dashboard
2. Navigate to **Products** → **Pricing**
3. Find your 3 products (Starter, Professional, Enterprise)
4. For each product, you should have 2 price IDs:
   - Monthly price ID (starts with `price_`)
   - Annual price ID (starts with `price_`)

### Example of Updated Configuration:

```javascript
this.products = {
    starter: {
        name: 'Starter',
        monthly: {
            priceId: 'price_1OqX2Y3Z4A5B6C7D8E9F0G1H', // Your actual monthly price ID
            amount: 29,
            currency: 'eur',
            interval: 'month'
        },
        annual: {
            priceId: 'price_2PqX3Y4Z5A6B7C8D9E0F1G2H', // Your actual annual price ID
            amount: 299,
            currency: 'eur',
            interval: 'year'
        }
    },
    // ... repeat for professional and enterprise
};
```

## Step 2: Environment Variables

Make sure you have these environment variables set in your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook endpoint secret
```

## Step 3: Webhook Configuration

1. In your Stripe Dashboard, go to **Developers** → **Webhooks**
2. Create a new webhook endpoint with URL: `https://yourdomain.com/api/subscriptions/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret and add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Step 4: Test the Integration

1. Start your server: `npm start`
2. Go to your landing page
3. Try to subscribe to a plan
4. Check the console for any errors

## Features Implemented

### ✅ Dynamic Pricing Display
- Pricing loads from your Stripe products
- Annual pricing shows total yearly cost (e.g., "€299/year")
- Monthly/Annual toggle with savings calculation
- Savings badges for annual plans

### ✅ Subscription Management
- Create subscriptions via Stripe Checkout
- Customer portal for subscription management
- Webhook handling for subscription events
- Database tracking of subscriptions and payments

### ✅ User Experience
- Seamless checkout flow
- Automatic customer creation
- Subscription status tracking
- Payment history

## Database Tables Created

1. **stripe_customers** - Links users to Stripe customers
2. **user_subscriptions** - Tracks user subscriptions
3. **subscription_payments** - Records payment history

## API Endpoints

- `GET /api/subscriptions/plans` - Get all subscription plans
- `GET /api/subscriptions/current` - Get user's current subscription
- `POST /api/subscriptions/create-checkout-session` - Create checkout session
- `POST /api/subscriptions/create-portal-session` - Create customer portal session
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/reactivate` - Reactivate subscription
- `POST /api/subscriptions/update` - Update subscription plan
- `POST /api/subscriptions/webhook` - Stripe webhook endpoint

## Next Steps

1. Update the price IDs in `utils/stripeSubscriptionService.js`
2. Set up your webhook endpoint in Stripe
3. Test the subscription flow
4. Customize the pricing display as needed

## Troubleshooting

### Common Issues:

1. **Price ID not found**: Make sure you're using the correct price IDs from your Stripe dashboard
2. **Webhook errors**: Check that your webhook secret is correct
3. **Authentication errors**: Ensure your Stripe secret key is valid
4. **Database errors**: Verify that the subscription tables exist in your Supabase database

### Debug Mode:

Add this to your `.env` file to enable detailed logging:
```env
DEBUG_STRIPE=true
```

## Support

If you encounter any issues, check the server console for detailed error messages and ensure all environment variables are properly configured. 