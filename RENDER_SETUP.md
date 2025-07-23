# Render Deployment Setup Guide

## 🔧 Environment Variables Setup

To fix the "Neither apiKey nor config.authenticator provided" error in Render, you need to set up your environment variables properly.

### Step 1: Access Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your SaaS app service
3. Go to **Environment** tab

### Step 2: Add Environment Variables

Add these environment variables to your Render service:

```env
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Supabase Configuration (REQUIRED)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
NODE_ENV=production
PORT=3000

# CORS Configuration
CORS_ORIGIN=https://chronoshr.onrender.com

# Frontend URL
FRONTEND_URL=https://chronoshr.onrender.com
```

### Step 3: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
4. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

### Step 4: Get Your Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key

### Step 5: Set Up Webhook (Optional but Recommended)

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Create endpoint: `https://your-app-name.onrender.com/api/subscriptions/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret

### Step 6: Deploy

After setting all environment variables:

1. Go to **Manual Deploy** in Render
2. Click **Deploy latest commit**
3. Wait for deployment to complete

## 🔍 Troubleshooting

### Error: "Neither apiKey nor config.authenticator provided"

**Cause**: `STRIPE_SECRET_KEY` is not set or invalid

**Solution**:
1. Check that `STRIPE_SECRET_KEY` is set in Render environment variables
2. Verify the key starts with `sk_test_` or `sk_live_`
3. Make sure there are no extra spaces or characters

### Error: "Supabase client not initialized"

**Cause**: Supabase environment variables are missing

**Solution**:
1. Add all required Supabase environment variables
2. Verify the URLs and keys are correct

### Error: "CORS error"

**Cause**: CORS configuration is incorrect

**Solution**:
1. Set `CORS_ORIGIN` to your Render URL
2. Make sure `FRONTEND_URL` is set correctly

## ✅ Verification

After deployment, test these endpoints:

1. **Health check**: `https://your-app.onrender.com/api/subscriptions/plans`
2. **Should return**: JSON with subscription plans
3. **No errors**: Should not show Stripe API errors

## 🚀 Production vs Test Mode

- **Test Mode**: Use keys starting with `sk_test_` and `pk_test_`
- **Production Mode**: Use keys starting with `sk_live_` and `pk_live_`

Make sure to use the correct mode for your deployment!

## 📞 Support

If you still have issues:

1. Check Render logs for specific error messages
2. Verify all environment variables are set correctly
3. Test with a simple API call to verify connectivity 