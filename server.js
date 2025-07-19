const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dashcam-production-secret-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security and performance middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create directories for file storage
const uploadsDir = path.join(__dirname, 'uploads');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ 
  storage, 
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept video and image files
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image files are allowed'), false);
    }
  }
});

// In-memory storage for demo (replace with database in production)
const devices = new Map();
const mediaFiles = new Map();
const events = new Map();
const commands = new Map();
const configurations = new Map();

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${req.method} ${req.path} - ${req.ip} - ${req.get('User-Agent') || 'Unknown'}\n`;
  
  // Log to file in production
  if (NODE_ENV === 'production') {
    fs.appendFileSync(path.join(logsDir, 'access.log'), logEntry);
  }
  
  console.log(`${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Access token required'
      },
      timestamp: new Date().toISOString()
    });
  }

  jwt.verify(token, JWT_SECRET, (err, device) => {
    if (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID',
          message: 'Invalid access token'
        },
        timestamp: new Date().toISOString()
      });
    }
    req.device = device;
    next();
  });
};

// Default device configuration
const getDefaultConfig = (deviceId) => ({
  deviceId,
  segmentLengthSeconds: 120,
  preEventSeconds: 10,
  postEventSeconds: 10,
  heartbeatIntervalSeconds: 60,
  snapshotIntervalMinutes: 5,
  audioRecordingEnabled: true,
  collisionSensitivity: 5,
  serverBaseUrl: process.env.SERVER_BASE_URL || `https://${req.get('host')}`,
  authToken: "will-be-replaced-by-jwt",
  networkThrottleConfig: {
    enabled: true,
    offPeakHours: {
      start: "22:00",
      end: "06:00"
    },
    maxUploadBandwidthKbps: 1024,
    throttledUploadBandwidthKbps: 256
  },
  cameraConfig: {
    frontCameraEnabled: true,
    rearCameraEnabled: true,
    videoResolution: "1080p",
    videoQuality: "high",
    snapshotResolution: "1080p"
  },
  storageConfig: {
    maxStorageUsagePercent: 90,
    cleanupThresholdPercent: 85,
    eventClipRetentionDays: 30,
    continuousRecordingRetentionDays: 7
  },
  gpsConfig: {
    enabled: true,
    updateIntervalSeconds: 30,
    accuracyThresholdMeters: 10
  },
  eventDetection: {
    collisionDetectionEnabled: true,
    harshBrakingDetectionEnabled: true,
    sharpTurnDetectionEnabled: true,
    speedingDetectionEnabled: false,
    speedLimitKmh: 120
  }
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: NODE_ENV,
      memory: process.memoryUsage(),
      activeDevices: devices.size,
      totalEvents: events.size,
      totalMediaFiles: mediaFiles.size
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dashcam Backend Server',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth/token',
      config: '/api/v1/config',
      heartbeat: '/api/v1/heartbeat',
      mediaUpload: '/api/v1/media/upload',
      events: '/api/v1/events',
      dashboard: '/dashboard'
    }
  });
});

// Authentication endpoints
app.post('/api/v1/auth/token', (req, res) => {
  try {
    const { deviceId, deviceSecret, deviceInfo } = req.body;

    if (!deviceId || !deviceSecret) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Device ID and secret are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // For demo, accept any device with secret "test-secret"
    // In production, validate against database
    if (deviceSecret !== 'test-secret') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID',
          message: 'Invalid device credentials'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Register or update device
    devices.set(deviceId, {
      deviceId,
      deviceInfo: deviceInfo || {},
      registrationDate: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      status: 'active',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Create default configuration if not exists
    if (!configurations.has(deviceId)) {
      configurations.set(deviceId, getDefaultConfig(deviceId));
    }

    const accessToken = jwt.sign(
      { 
        sub: deviceId, 
        deviceType: 'dashcam',
        scope: ['read', 'write', 'upload'],
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`Device authenticated: ${deviceId} from ${req.ip}`);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: `refresh-${deviceId}-${Date.now()}`,
        expiresIn: 86400,
        tokenType: 'Bearer',
        deviceId: deviceId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Authentication failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Extract device ID from refresh token (simplified for demo)
    const deviceId = refreshToken.split('-')[1];
    
    if (!devices.has(deviceId)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_INVALID',
          message: 'Invalid refresh token'
        },
        timestamp: new Date().toISOString()
      });
    }

    const accessToken = jwt.sign(
      { 
        sub: deviceId, 
        deviceType: 'dashcam',
        scope: ['read', 'write', 'upload'],
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 86400
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Token refresh failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Configuration endpoints
app.get('/api/v1/config', authenticateToken, (req, res) => {
  try {
    const deviceId = req.device.sub;
    const config = configurations.get(deviceId) || getDefaultConfig(deviceId);

    res.json({
      success: true,
      data: {
        deviceConfig: config,
        configVersion: '1.0.0',
        lastUpdated: new Date().toISOString(),
        serverTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch configuration'
      },
      timestamp: new Date().toISOString()
    });
  }
});

app.put('/api/v1/config', authenticateToken, (req, res) => {
  try {
    const deviceId = req.device.sub;
    const { deviceConfig } = req.body;

    if (!deviceConfig) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Device configuration required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Merge with existing configuration
    const existingConfig = configurations.get(deviceId) || getDefaultConfig(deviceId);
    const updatedConfig = { ...existingConfig, ...deviceConfig };
    configurations.set(deviceId, updatedConfig);

    console.log(`Configuration updated for device: ${deviceId}`);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update configuration'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Heartbeat endpoint
app.post('/api/v1/heartbeat', authenticateToken, (req, res) => {
  try {
    const deviceId = req.device.sub;
    const { timestamp, location, deviceStatus, performanceMetrics } = req.body;

    // Update device last seen
    const device = devices.get(deviceId);
    if (device) {
      device.lastSeen = timestamp || new Date().toISOString();
      device.location = location;
      device.status = deviceStatus;
      device.performanceMetrics = performanceMetrics;
      device.ipAddress = req.ip;
      devices.set(deviceId, device);
    }

    // Check for pending commands
    const pendingCommands = Array.from(commands.values())
      .filter(cmd => cmd.deviceId === deviceId && cmd.status === 'pending')
      .map(cmd => ({
        id: cmd.id,
        type: cmd.commandType,
        parameters: cmd.parameters
      }));

    // Mark commands as sent
    pendingCommands.forEach(cmd => {
      const command = commands.get(cmd.id);
      if (command) {
        command.status = 'sent';
        command.sentAt = new Date().toISOString();
        commands.set(cmd.id, command);
      }
    });

    console.log(`Heartbeat received from device: ${deviceId}`);

    res.json({
      success: true,
      data: {
        commands: pendingCommands,
        configUpdateAvailable: false,
        serverTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Heartbeat processing failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Media upload endpoint
app.post('/api/v1/media/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const deviceId = req.device.sub;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    let metadata = {};
    try {
      metadata = req.body.metadata ? JSON.parse(req.body.metadata) : req.body;
    } catch (e) {
      metadata = req.body;
    }

    const fileId = uuidv4();
    const mediaFile = {
      fileId,
      deviceId,
      fileName: file.originalname,
      fileType: metadata.fileType || (file.mimetype.startsWith('video/') ? 'video' : 'image'),
      mediaType: metadata.mediaType || 'continuous',
      timestamp: metadata.timestamp || new Date().toISOString(),
      duration: metadata.duration,
      fileSize: file.size,
      checksum: metadata.checksum,
      cameraId: metadata.cameraId || 0,
      location: metadata.location,
      uploadStatus: 'completed',
      processingStatus: 'queued',
      storageUrl: `/uploads/${file.filename}`,
      uploadedAt: new Date().toISOString(),
      mimeType: file.mimetype
    };

    mediaFiles.set(fileId, mediaFile);

    console.log(`Media uploaded: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB) from device ${deviceId}`);

    res.json({
      success: true,
      data: {
        fileId,
        uploadUrl: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
        processingStatus: 'queued',
        fileSize: file.size,
        mimeType: file.mimetype
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'File upload failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Media file status
app.get('/api/v1/media/upload/status/:fileId', authenticateToken, (req, res) => {
  try {
    const { fileId } = req.params;
    const mediaFile = mediaFiles.get(fileId);

    if (!mediaFile) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Media file not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        fileId,
        status: 'processed',
        uploadStatus: mediaFile.uploadStatus,
        processingStatus: 'completed',
        fileSize: mediaFile.fileSize,
        uploadedAt: mediaFile.uploadedAt,
        downloadUrl: `${req.protocol}://${req.get('host')}/uploads/${path.basename(mediaFile.storageUrl)}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Media status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get media status'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Event reporting endpoint
app.post('/api/v1/events', authenticateToken, (req, res) => {
  try {
    const deviceId = req.device.sub;
    const eventData = req.body;

    if (!eventData.eventType || !eventData.timestamp) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event type and timestamp are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const eventId = eventData.eventId || uuidv4();
    const event = {
      eventId,
      deviceId,
      ...eventData,
      receivedAt: new Date().toISOString(),
      processed: false,
      acknowledged: true,
      ipAddress: req.ip
    };

    events.set(eventId, event);

    console.log(`Event received: ${eventData.eventType} from device ${deviceId} (severity: ${eventData.severity || 'N/A'})`);

    // Simulate event processing actions
    const actions = [];
    if (eventData.severity && eventData.severity > 0.8) {
      actions.push({
        type: 'notify_emergency_contact',
        parameters: { contactId: 'emergency-contact-123' }
      });
      console.log(`High severity event detected: ${eventId}`);
    }

    res.json({
      success: true,
      data: {
        eventId,
        acknowledged: true,
        actions,
        processingStatus: 'queued'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Event reporting error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Event reporting failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Command endpoints
app.post('/api/v1/commands/:deviceId', authenticateToken, (req, res) => {
  try {
    const { deviceId } = req.params;
    const { commandType, parameters, priority = 'normal', timeout = 30 } = req.body;

    if (!commandType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Command type is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const commandId = uuidv4();
    const command = {
      id: commandId,
      deviceId,
      commandType,
      parameters: parameters || {},
      priority,
      timeout,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: req.device.sub
    };

    commands.set(commandId, command);

    console.log(`Command queued: ${commandType} for device ${deviceId}`);

    res.json({
      success: true,
      data: {
        commandId,
        status: 'queued',
        estimatedExecutionTime: new Date(Date.now() + 30000).toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Command creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Command creation failed'
      },
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/v1/commands/:commandId/status', authenticateToken, (req, res) => {
  try {
    const { commandId } = req.params;
    const command = commands.get(commandId);

    if (!command) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Command not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        commandId,
        status: command.status,
        result: command.result,
        createdAt: command.createdAt,
        executedAt: command.executedAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Command status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get command status'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Static file serving for uploads
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  etag: true
}));

// Dashboard endpoints for monitoring
app.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      server: {
        status: 'running',
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: '1.0.0',
        memory: process.memoryUsage()
      },
      statistics: {
        totalDevices: devices.size,
        onlineDevices: Array.from(devices.values()).filter(d => 
          new Date() - new Date(d.lastSeen) < 300000 // 5 minutes
        ).length,
        totalEvents: events.size,
        totalMediaFiles: mediaFiles.size,
        totalCommands: commands.size
      }
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/dashboard/devices', (req, res) => {
  try {
    const deviceList = Array.from(devices.values()).map(device => ({
      ...device,
      isOnline: new Date() - new Date(device.lastSeen) < 300000 // 5 minutes
    }));

    res.json({
      success: true,
      data: {
        devices: deviceList,
        totalDevices: deviceList.length,
        onlineDevices: deviceList.filter(d => d.isOnline).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard devices error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get device list'
      },
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/dashboard/events', (req, res) => {
  try {
    const eventList = Array.from(events.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50); // Last 50 events

    res.json({
      success: true,
      data: {
        events: eventList,
        totalEvents: events.size,
        recentEvents: eventList.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard events error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get events'
      },
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/dashboard/media', (req, res) => {
  try {
    const mediaList = Array.from(mediaFiles.values())
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 50); // Last 50 files

    const totalSize = Array.from(mediaFiles.values()).reduce((sum, file) => sum + (file.fileSize || 0), 0);

    res.json({
      success: true,
      data: {
        mediaFiles: mediaList,
        totalFiles: mediaFiles.size,
        totalSize: totalSize,
        totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard media error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to get media files'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds limit (100MB)'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: NODE_ENV === 'production' ? 'Internal server error' : err.message
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    },
    availableEndpoints: {
      health: '/health',
      auth: '/api/v1/auth/token',
      config: '/api/v1/config',
      heartbeat: '/api/v1/heartbeat',
      mediaUpload: '/api/v1/media/upload',
      events: '/api/v1/events',
      dashboard: '/dashboard'
    },
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Dashcam Backend Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔐 Authentication:');
  console.log('  Device Secret: test-secret');
  console.log('');
  console.log('📡 API Endpoints:');
  console.log('  POST /api/v1/auth/token - Device authentication');
  console.log('  GET  /api/v1/config - Get device configuration');
  console.log('  POST /api/v1/heartbeat - Send heartbeat');
  console.log('  POST /api/v1/media/upload - Upload media files');
  console.log('  POST /api/v1/events - Report events');
  console.log('  GET  /dashboard - Server dashboard');
  console.log('');
  console.log('🚀 Server ready for connections!');
});