# Deployment Guide for Render.com

## Step 1: Prepare Repository

1. **Initialize Git repository**:

   ```bash
   cd dashcam-server
   git init
   git add .
   git commit -m "Initial commit: Dashcam backend server"
   ```

2. **Create GitHub repository**:

   - Go to GitHub and create a new repository named `dashcam-backend-server`
   - Don't initialize with README (we already have one)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/dashcam-backend-server.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy on Render.com

1. **Sign up/Login to Render.com**:

   - Go to [render.com](https://render.com)
   - Sign up or login with GitHub

2. **Create New Web Service**:

   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select your `dashcam-backend-server` repository

3. **Configure Service**:

   ```
   Name: dashcam-backend-server
   Environment: Node
   Region: Choose closest to your location
   Branch: main
   Build Command: npm install
   Start Command: npm start
   ```

4. **Set Environment Variables**:

   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   ALLOWED_ORIGINS=*
   ```

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (usually 2-5 minutes)
   - Your server will be available at: `https://your-app-name.onrender.com`

## Step 3: Test Deployment

1. **Health Check**:

   ```bash
   curl https://your-app-name.onrender.com/health
   ```

2. **Test Authentication**:

   ```bash
   curl -X POST https://your-app-name.onrender.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"deviceId": "test-device", "deviceSecret": "test-secret"}'
   ```

3. **View Dashboard**:
   - Open: `https://your-app-name.onrender.com/dashboard`

## Step 4: Update Android App

Update your Android app's `build.gradle` to use the new server:

```gradle
// Release build configuration (staging)
buildConfigField "String", "DEFAULT_SERVER_HOST", "\"your-app-name.onrender.com\""
buildConfigField "int", "DEFAULT_SERVER_PORT", "443"
buildConfigField "String", "DEFAULT_SERVER_PROTOCOL", "\"https\""
buildConfigField "String", "DEFAULT_DEVICE_ID", "\"staging-device-001\""
buildConfigField "String", "DEFAULT_DEVICE_SECRET", "\"test-secret\""
```

## Step 5: Build and Test App

```bash
cd CarSDKSample
./build_simple.sh release
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Render.com Features

- **Automatic Deployments**: Pushes to main branch auto-deploy
- **Free Tier**: 750 hours/month free (enough for testing)
- **HTTPS**: Automatic SSL certificates
- **Logs**: View real-time logs in dashboard
- **Metrics**: CPU, memory, and request metrics
- **Custom Domains**: Add your own domain (paid plans)

## Monitoring

- **Render Dashboard**: View logs, metrics, and deployment status
- **Server Dashboard**: `https://your-app.onrender.com/dashboard`
- **Health Endpoint**: `https://your-app.onrender.com/health`

## Troubleshooting

1. **Build Fails**: Check package.json and dependencies
2. **Server Won't Start**: Check environment variables and logs
3. **CORS Issues**: Update ALLOWED_ORIGINS environment variable
4. **File Uploads Fail**: Render has ephemeral storage, files are lost on restart

## Next Steps

1. **Database**: Add PostgreSQL database for persistent storage
2. **File Storage**: Use AWS S3 or similar for file uploads
3. **Monitoring**: Add error tracking (Sentry, etc.)
4. **Scaling**: Upgrade to paid plan for better performance
