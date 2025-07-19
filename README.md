# Dashcam Backend Server

Production-ready backend server for the Headless Dashcam Application, designed for deployment on Render.com and other cloud platforms.

## Features

- **Device Authentication**: JWT-based authentication for dashcam devices
- **Media Upload**: Handle video and image uploads from devices
- **Event Reporting**: Process and store collision/event data
- **Configuration Management**: Dynamic device configuration
- **Real-time Dashboard**: Monitor connected devices and system health
- **Production Ready**: Security, logging, error handling, and performance optimizations

## Quick Start

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Test the server**:
   ```bash
   curl http://localhost:3000/health
   ```

### Deploy to Render.com

1. **Push to GitHub**:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/dashcam-server.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [Render.com](https://render.com)
   - Connect your GitHub repository
   - Create a new Web Service
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables (see Environment Variables section)

## API Endpoints

### Authentication

- `POST /auth/login` - Device authentication
- `POST /auth/refresh` - Refresh access token

### Device Management

- `GET /config` - Get device configuration
- `PUT /config` - Update device configuration
- `POST /heartbeat` - Send device status

### Media & Events

- `POST /media/upload` - Upload video/image files
- `GET /media/upload/status/:fileId` - Check upload status
- `POST /events` - Report collision/event data

### Monitoring

- `GET /health` - Server health check
- `GET /dashboard` - System overview
- `GET /dashboard/devices` - Connected devices
- `GET /dashboard/events` - Recent events
- `GET /dashboard/media` - Media files

### Commands

- `POST /commands/:deviceId` - Send command to device
- `GET /commands/:commandId/status` - Check command status

## Environment Variables

Set these environment variables in Render.com:

| Variable          | Description                          | Default              |
| ----------------- | ------------------------------------ | -------------------- |
| `NODE_ENV`        | Environment (production/development) | `production`         |
| `PORT`            | Server port                          | `3000`               |
| `JWT_SECRET`      | JWT signing secret                   | `change-this-secret` |
| `ALLOWED_ORIGINS` | CORS allowed origins                 | `*`                  |
| `SERVER_BASE_URL` | Base URL for API responses           | Auto-detected        |

## Device Authentication

Devices authenticate using device ID and secret:

```json
{
  "deviceId": "your-device-id",
  "deviceSecret": "test-secret"
}
```

**Default credentials for testing**:

- Device Secret: `test-secret`
- Any device ID is accepted

## Configuration for Android App

Update your Android app's `build.gradle` to point to your Render.com server:

```gradle
// Release build configuration (staging)
buildConfigField "String", "DEFAULT_SERVER_HOST", "\"your-app-name.onrender.com\""
buildConfigField "int", "DEFAULT_SERVER_PORT", "443"
buildConfigField "String", "DEFAULT_SERVER_PROTOCOL", "\"https\""
```

## File Upload

The server accepts video and image files up to 100MB:

- Supported formats: MP4, AVI, MOV (video), JPG, PNG (images)
- Files are stored in `/uploads` directory
- Accessible via `/uploads/:filename`

## Dashboard

Access the web dashboard at:

- Local: `http://localhost:3000/dashboard`
- Production: `https://your-app.onrender.com/dashboard`

## Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin requests
- **JWT**: Secure token-based authentication
- **File validation**: Type and size limits
- **Rate limiting**: Prevent abuse (configurable)
- **Input validation**: Request validation and sanitization

## Monitoring

### Health Check

```bash
curl https://your-app.onrender.com/health
```

### System Stats

```bash
curl https://your-app.onrender.com/dashboard
```

## Development

### Project Structure

```
dashcam-server/
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env.example       # Environment template
├── README.md          # This file
├── uploads/           # Uploaded files (created automatically)
└── logs/              # Server logs (created automatically)
```

### Adding Features

1. **Database Integration**: Replace in-memory storage with PostgreSQL/MongoDB
2. **File Storage**: Integrate AWS S3 or similar for file storage
3. **Real-time Updates**: Add WebSocket support for live dashboard
4. **Analytics**: Add event analytics and reporting
5. **Notifications**: Email/SMS alerts for critical events

### Testing

Test authentication:

```bash
curl -X POST https://your-app.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-device", "deviceSecret": "test-secret"}'
```

Test with device token:

```bash
curl -X POST https://your-app.onrender.com/heartbeat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-device", "timestamp": "2024-01-01T00:00:00Z"}'
```

## Troubleshooting

### Common Issues

1. **Port binding error**: Render automatically assigns PORT environment variable
2. **File upload fails**: Check file size limits and CORS settings
3. **Authentication fails**: Verify JWT_SECRET is set correctly
4. **CORS errors**: Update ALLOWED_ORIGINS environment variable

### Logs

View logs in Render.com dashboard or check local logs:

```bash
tail -f logs/access.log
```

## Support

For issues and questions:

1. Check the logs in Render.com dashboard
2. Test endpoints with curl or Postman
3. Verify environment variables are set correctly
4. Check the health endpoint for system status

## License

MIT License - see LICENSE file for details.
