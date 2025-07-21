let autoRefreshInterval;
let logEntries = [];
let requestEntries = [];

// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all tabs and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Auto-refresh functionality
    document.getElementById('autoRefresh').addEventListener('change', function() {
        if (this.checked) {
            autoRefreshInterval = setInterval(refreshData, 5000);
            addLogEntry('Auto-refresh enabled (5 seconds)');
        } else {
            clearInterval(autoRefreshInterval);
            addLogEntry('Auto-refresh disabled');
        }
    });

    // Clear requests button
    document.getElementById('clearRequests').addEventListener('click', function() {
        requestEntries = [];
        updateRequestsDisplay();
        addLogEntry('API request history cleared');
    });

    // Initial load and start auto-refresh
    refreshData();
    autoRefreshInterval = setInterval(refreshData, 5000);
    
    // Add initial log entry
    addLogEntry('Dashboard loaded and monitoring started');
});

function addLogEntry(message) {
    const timestamp = new Date().toISOString();
    logEntries.unshift({
        timestamp,
        message
    });
    
    // Keep only last 50 entries
    if (logEntries.length > 50) {
        logEntries = logEntries.slice(0, 50);
    }
    
    updateLogsDisplay();
}

function addRequestEntry(method, path, data, response) {
    const timestamp = new Date().toISOString();
    requestEntries.unshift({
        timestamp,
        method: method.toUpperCase(),
        path,
        data,
        response,
        id: Date.now()
    });
    
    // Keep only last 100 entries
    if (requestEntries.length > 100) {
        requestEntries = requestEntries.slice(0, 100);
    }
    
    updateRequestsDisplay();
}

function updateLogsDisplay() {
    const logsContainer = document.getElementById('serverLogs');
    logsContainer.innerHTML = logEntries.map(entry => 
        '<div class="log-entry">' +
            '<span class="log-timestamp">[' + new Date(entry.timestamp).toLocaleTimeString() + ']</span> ' +
            entry.message +
        '</div>'
    ).join('');
    
    // Auto-scroll to top
    logsContainer.scrollTop = 0;
}

function updateRequestsDisplay() {
    const requestList = document.getElementById('requestList');
    
    if (requestEntries.length === 0) {
        requestList.innerHTML = '<div class="empty-state">No requests captured yet</div>';
        return;
    }
    
    requestList.innerHTML = requestEntries.map(req => 
        '<div class="request-item ' + req.method.toLowerCase() + '">' +
            '<div class="request-header">' +
                '<div>' +
                    '<span class="request-method ' + req.method.toLowerCase() + '">' + req.method + '</span> ' +
                    '<span class="request-path">' + req.path + '</span>' +
                '</div>' +
                '<span class="request-time">' + new Date(req.timestamp).toLocaleTimeString() + '</span>' +
            '</div>' +
            (req.data ? 
                '<div class="request-details">' +
                    '<h4>Request Data:</h4>' +
                    '<div class="request-data">' + JSON.stringify(req.data, null, 2) + '</div>' +
                '</div>' : '') +
            (req.response ? 
                '<div class="request-details">' +
                    '<h4>Response:</h4>' +
                    '<div class="request-data">' + JSON.stringify(req.response, null, 2) + '</div>' +
                '</div>' : '') +
        '</div>'
    ).join('');
}

async function fetchData(endpoint) {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        // Log the request
        addRequestEntry('GET', endpoint, null, data);
        
        return data;
    } catch (error) {
        console.error('Error fetching ' + endpoint + ':', error);
        addLogEntry('Error fetching data from ' + endpoint + ': ' + error.message);
        return null;
    }
}

async function refreshData() {
    const container = document.body;
    container.classList.add('loading');
    
    try {
        // Fetch all data
        const [dashboardData, devicesData, eventsData, mediaData, requestsData] = await Promise.all([
            fetchData('/dashboard/api'),
            fetchData('/dashboard/devices'),
            fetchData('/dashboard/events'),
            fetchData('/dashboard/media'),
            fetchData('/dashboard/requests')
        ]);

        if (dashboardData && dashboardData.success) {
            updateStats(dashboardData.data);
        }
        if (devicesData && devicesData.success) {
            updateDevicesTable(devicesData.data);
            // Dispatch event for commands.js to update device selector
            document.dispatchEvent(new CustomEvent('devicesUpdated', { 
                detail: { devices: devicesData.data.devices } 
            }));
        }
        if (eventsData && eventsData.success) {
            updateEventsTable(eventsData.data);
        }
        if (mediaData && mediaData.success) {
            updateMediaTable(mediaData.data);
        }
        if (requestsData && requestsData.success) {
            updateRequestsList(requestsData.data.requests);
        }

        document.getElementById('lastUpdate').textContent = 
            'Last updated: ' + new Date().toLocaleString();
        
        addLogEntry('Dashboard data refreshed successfully');
    } catch (error) {
        addLogEntry('Error refreshing dashboard: ' + error.message);
    } finally {
        container.classList.remove('loading');
    }
}

function updateStats(data) {
    const stats = data.statistics;
    const server = data.server;
    
    const statsCards = document.querySelectorAll('.stat-card');
    const statsData = [
        stats.totalDevices,
        stats.onlineDevices,
        stats.totalEvents,
        stats.totalMediaFiles,
        Math.round(server.uptime / 60) + 'm',
        Math.round(server.memory.heapUsed / 1024 / 1024) + 'MB'
    ];
    
    statsCards.forEach(function(card, index) {
        const numberEl = card.querySelector('.stat-number');
        if (numberEl && statsData[index] !== undefined) {
            numberEl.textContent = statsData[index];
        }
    });
}

function updateDevicesTable(data) {
    const tbody = document.querySelector('#devicesTable tbody');
    
    if (!data.devices || data.devices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-text">No devices connected</td></tr>';
        return;
    }

    tbody.innerHTML = data.devices.map(function(device) {
        return '<tr>' +
            '<td><strong>' + device.deviceId + '</strong></td>' +
            '<td>' +
                '<span class="' + (device.isOnline ? 'status-online' : 'status-offline') + '">' +
                    (device.isOnline ? '🟢 Online' : '🔴 Offline') +
                '</span>' +
            '</td>' +
            '<td>' + new Date(device.lastSeen).toLocaleString() + '</td>' +
            '<td>' + (device.ipAddress || 'N/A') + '</td>' +
            '<td>' + new Date(device.registrationDate).toLocaleString() + '</td>' +
        '</tr>';
    }).join('');
}

function updateEventsTable(data) {
    const tbody = document.querySelector('#eventsTable tbody');
    
    if (!data.events || data.events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-text">No events recorded</td></tr>';
        return;
    }

    tbody.innerHTML = data.events.slice(0, 20).map(function(event) {
        const severityClass = event.severity > 0.8 ? 'badge-danger' :
                             event.severity > 0.5 ? 'badge-warning' : 'badge-info';
        const severityText = event.severity ? (event.severity * 100).toFixed(0) + '%' : 'N/A';
        const locationText = event.location ? 
            event.location.latitude.toFixed(4) + ', ' + event.location.longitude.toFixed(4) : 'N/A';
        
        return '<tr>' +
            '<td><strong>' + event.eventType + '</strong></td>' +
            '<td>' + event.deviceId + '</td>' +
            '<td><span class="badge ' + severityClass + '">' + severityText + '</span></td>' +
            '<td>' + new Date(event.timestamp).toLocaleString() + '</td>' +
            '<td>' + locationText + '</td>' +
        '</tr>';
    }).join('');
}

function updateMediaTable(data) {
    const tbody = document.querySelector('#mediaTable tbody');
    
    if (!data.mediaFiles || data.mediaFiles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-text">No media files uploaded</td></tr>';
        return;
    }

    tbody.innerHTML = data.mediaFiles.slice(0, 20).map(function(file) {
        const badgeClass = file.fileType === 'video' ? 'badge-info' : 'badge-success';
        const fileSize = (file.fileSize / 1024 / 1024).toFixed(2);
        
        return '<tr>' +
            '<td><strong>' + file.fileName + '</strong></td>' +
            '<td>' + file.deviceId + '</td>' +
            '<td><span class="badge ' + badgeClass + '">' + file.fileType + '</span></td>' +
            '<td>' + fileSize + ' MB</td>' +
            '<td>' + new Date(file.uploadedAt).toLocaleString() + '</td>' +
            '<td><a href="' + file.storageUrl + '" target="_blank" style="color: #667eea;">View</a></td>' +
        '</tr>';
    }).join('');
    
    // Add summary
    const summaryRow = '<tr style="background: #f8f9fa; font-weight: bold;">' +
        '<td colspan="6">Total: ' + data.totalFiles + ' files (' + data.totalSizeMB + ' MB)</td>' +
    '</tr>';
    tbody.innerHTML += summaryRow;
}

// Global refresh function for the button
window.refreshData = refreshData;
functio
n updateRequestsList(requests) {
    const requestList = document.getElementById('requestList');
    
    if (!requests || requests.length === 0) {
        requestList.innerHTML = '<div class="empty-state">No requests captured yet</div>';
        return;
    }
    
    requestList.innerHTML = requests.map(function(req) {
        const method = req.method.toLowerCase();
        return '<div class="request-item ' + method + '">' +
            '<div class="request-header">' +
                '<div>' +
                    '<span class="request-method ' + method + '">' + req.method + '</span> ' +
                    '<span class="request-path">' + req.path + '</span>' +
                '</div>' +
                '<span class="request-time">' + new Date(req.timestamp).toLocaleTimeString() + '</span>' +
            '</div>' +
            '<div class="request-details">' +
                '<div><strong>IP:</strong> ' + req.ip + '</div>' +
                '<div><strong>User-Agent:</strong> ' + (req.userAgent || 'N/A') + '</div>' +
                (req.body ? 
                    '<h4>Request Body:</h4>' +
                    '<div class="request-data">' + JSON.stringify(req.body, null, 2) + '</div>' : '') +
                (req.query ? 
                    '<h4>Query Parameters:</h4>' +
                    '<div class="request-data">' + JSON.stringify(req.query, null, 2) + '</div>' : '') +
            '</div>' +
        '</div>';
    }).join('');
}