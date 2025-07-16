# Deployment Guide - Render

This guide will help you deploy your SaaS Employee Management application to Render.

## Prerequisites

1. **GitHub Account**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Supabase Project**: Make sure your Supabase project is set up and running

## Step 1: Prepare Your Environment Variables

Before deploying, you'll need to set up your environment variables in Render. Based on your `env.example` file, you'll need:

### Required Environment Variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `JWT_SECRET` - A secure random string for JWT token signing
- `NODE_ENV` - Set to "production"
- `PORT` - Render will set this automatically (10000)
- `CORS_ORIGIN` - Your Render app URL (will be set automatically)

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Connect to Render**:
   - Go to [render.com](https://render.com) and sign in
   - Click "New +" and select "Blueprint"
   - Connect your GitHub account if not already connected
   - Select your repository
   - Render will automatically detect the `render.yaml` file

3. **Configure Environment Variables**:
   - In the Render dashboard, go to your service
   - Navigate to "Environment" tab
   - Add the following environment variables:
     ```
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     JWT_SECRET=your_secure_jwt_secret_here
     NODE_ENV=production
     CORS_ORIGIN=https://your-app-name.onrender.com
     ```

4. **Deploy**:
   - Click "Create Blueprint Instance"
   - Render will automatically build and deploy your application

### Option B: Manual Deployment

1. **Create a new Web Service**:
   - Go to Render dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service**:
   - **Name**: `saas-employee-management`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (free tier)

3. **Set Environment Variables** (same as above)

4. **Deploy**:
   - Click "Create Web Service"

## Step 3: Verify Deployment

1. **Check Health Endpoint**:
   - Visit: `https://your-app-name.onrender.com/api/health`
   - Should return a JSON response with status "OK"

2. **Test the Application**:
   - Visit your main app URL
   - Test login functionality
   - Verify all features work correctly

## Step 4: Custom Domain (Optional)

1. **Add Custom Domain**:
   - In Render dashboard, go to your service
   - Navigate to "Settings" → "Custom Domains"
   - Add your domain and follow the DNS configuration instructions

2. **Update CORS_ORIGIN**:
   - Update the `CORS_ORIGIN` environment variable to include your custom domain

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check the build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Environment Variables**:
   - Double-check all environment variables are set correctly
   - Ensure no extra spaces or quotes in values

3. **CORS Issues**:
   - Verify `CORS_ORIGIN` is set to your Render app URL
   - Check browser console for CORS errors

4. **Database Connection**:
   - Ensure Supabase project is active
   - Verify Supabase URL and keys are correct
   - Check Supabase dashboard for any connection issues

### Logs and Monitoring:

- **View Logs**: In Render dashboard → your service → "Logs" tab
- **Health Checks**: Monitor the `/api/health` endpoint
- **Performance**: Use Render's built-in monitoring tools

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **JWT Secret**: Use a strong, random string for JWT_SECRET
3. **CORS**: Only allow necessary origins
4. **Rate Limiting**: Your app already has rate limiting configured
5. **HTTPS**: Render provides HTTPS by default

## Cost Optimization

- **Free Tier**: Includes 750 hours/month
- **Auto-sleep**: Free services sleep after 15 minutes of inactivity
- **Scaling**: Upgrade to paid plans for always-on service

## Support

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **Render Community**: [community.render.com](https://community.render.com)
- **GitHub Issues**: For application-specific issues

---

**Note**: The `render.yaml` file in this repository will automatically configure most settings. You only need to set the environment variables manually in the Render dashboard. 