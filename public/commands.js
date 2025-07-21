// Command functionality for the dashboard
let selectedDevice = null;

// Initialize command UI
document.addEventListener('DOMContentLoaded', function() {
    // Add command tab content if not already present
    if (!document.getElementById('commands')) {
        addCommandsTab();
    }
    
    // Initialize command form
    initializeCommandForm();
});

function addCommandsTab() {
    // Add tab button
    const tabsContainer = document.querySelector('.tabs');
    const commandTabBtn = document.createElement('button');
    commandTabBtn.className = 'tab-btn';
    commandTabBtn.dataset.tab = 'commands';
    commandTabBtn.textContent = 'Send Commands';
    tabsContainer.appendChild(commandTabBtn);
    
    // Add tab content
    const tabContent = document.querySelector('.tab-content');
    const commandsTab = document.createElement('div');
    commandsTab.id = 'commands';
    commandsTab.className = 'tab-pane';
    commandsTab.innerHTML = `
        <h2>Send Commands to Devices</h2>
        <div class="command-panel">
            <div class="device-selector">
                <h3>1. Select Device</h3>
                <select id="deviceSelector">
                    <option value="">-- Select a device --</option>
                </select>
            </div>
            
            <div class="command-type">
                <h3>2. Select Command Type</h3>
                <select id="commandType">
                    <option value="">-- Select command type --</option>
                    <option value="take_snapshot">Take Snapshot</option>
                    <option value="start_recording">Start Recording</option>
                    <option value="stop_recording">Stop Recording</option>
                    <option value="upload_logs">Upload Logs</option>
                    <option value="restart_app">Restart App</option>
                    <option value="update_config">Update Configuration</option>
                    <option value="custom">Custom Command</option>
                </select>
            </div>
            
            <div class="command-params">
                <h3>3. Command Parameters</h3>
                <div id="paramFields">
                    <p class="placeholder-text">Select a command type to configure parameters</p>
                </div>
            </div>
            
            <div class="command-execute">
                <h3>4. Execute Command</h3>
                <div class="command-priority">
                    <label>Priority:</label>
                    <select id="commandPriority">
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <button id="sendCommand" class="send-command-btn" disabled>Send Command</button>
            </div>
        </div>
        
        <div class="command-history">
            <h3>Command History</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Command ID</th>
                            <th>Device</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="commandHistoryTable">
                        <tr>
                            <td colspan="6" class="loading-text">No commands sent yet</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    tabContent.appendChild(commandsTab);
}

function initializeCommandForm() {
    // Get form elements
    const deviceSelector = document.getElementById('deviceSelector');
    const commandType = document.getElementById('commandType');
    const paramFields = document.getElementById('paramFields');
    const sendCommandBtn = document.getElementById('sendCommand');
    
    // Update device selector when data refreshes
    document.addEventListener('devicesUpdated', function(e) {
        updateDeviceSelector(e.detail.devices);
    });
    
    // Handle device selection
    deviceSelector.addEventListener('change', function() {
        selectedDevice = this.value;
        updateSendButtonState();
    });
    
    // Handle command type selection
    commandType.addEventListener('change', function() {
        const selectedCommand = this.value;
        updateParamFields(selectedCommand);
        updateSendButtonState();
    });
    
    // Handle send command button
    sendCommandBtn.addEventListener('click', function() {
        sendCommand();
    });
}

function updateDeviceSelector(devices) {
    const deviceSelector = document.getElementById('deviceSelector');
    const currentValue = deviceSelector.value;
    
    // Clear existing options except the placeholder
    while (deviceSelector.options.length > 1) {
        deviceSelector.remove(1);
    }
    
    // Add device options
    if (devices && devices.length > 0) {
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = `${device.deviceId} ${device.isOnline ? '(Online)' : '(Offline)'}`;
            option.disabled = !device.isOnline;
            deviceSelector.appendChild(option);
        });
        
        // Restore previous selection if still available
        if (currentValue) {
            deviceSelector.value = currentValue;
        }
    }
}

function updateParamFields(commandType) {
    const paramFields = document.getElementById('paramFields');
    
    // Clear existing fields
    paramFields.innerHTML = '';
    
    // Add appropriate fields based on command type
    switch (commandType) {
        case 'take_snapshot':
            paramFields.innerHTML = `
                <div class="param-field">
                    <label for="cameraId">Camera:</label>
                    <select id="cameraId" name="cameraId">
                        <option value="0">Front Camera</option>
                        <option value="1">Rear Camera</option>
                    </select>
                </div>
                <div class="param-field">
                    <label for="resolution">Resolution:</label>
                    <select id="resolution" name="resolution">
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            `;
            break;
            
        case 'start_recording':
            paramFields.innerHTML = `
                <div class="param-field">
                    <label for="duration">Duration (seconds):</label>
                    <input type="number" id="duration" name="duration" value="60" min="5" max="300">
                </div>
                <div class="param-field">
                    <label for="recordingQuality">Quality:</label>
                    <select id="recordingQuality" name="recordingQuality">
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            `;
            break;
            
        case 'update_config':
            paramFields.innerHTML = `
                <div class="param-field full-width">
                    <label for="configJson">Configuration JSON:</label>
                    <textarea id="configJson" name="configJson" rows="6">{
  "heartbeatIntervalSeconds": 30,
  "snapshotIntervalMinutes": 10,
  "audioRecordingEnabled": true
}</textarea>
                </div>
            `;
            break;
            
        case 'custom':
            paramFields.innerHTML = `
                <div class="param-field">
                    <label for="commandName">Command Name:</label>
                    <input type="text" id="commandName" name="commandName" placeholder="Enter command name">
                </div>
                <div class="param-field full-width">
                    <label for="customParams">Parameters (JSON):</label>
                    <textarea id="customParams" name="customParams" rows="4">{}</textarea>
                </div>
            `;
            break;
            
        case '':
            paramFields.innerHTML = `<p class="placeholder-text">Select a command type to configure parameters</p>`;
            break;
            
        default:
            paramFields.innerHTML = `<p>No parameters needed for this command</p>`;
    }
}

function updateSendButtonState() {
    const sendCommandBtn = document.getElementById('sendCommand');
    const deviceSelected = document.getElementById('deviceSelector').value !== '';
    const commandSelected = document.getElementById('commandType').value !== '';
    
    sendCommandBtn.disabled = !(deviceSelected && commandSelected);
}

async function sendCommand() {
    const deviceId = document.getElementById('deviceSelector').value;
    const commandType = document.getElementById('commandType').value;
    const priority = document.getElementById('commandPriority').value;
    
    if (!deviceId || !commandType) {
        addLogEntry('❌ Error: Please select both device and command type');
        return;
    }
    
    // Get access token (you'll need to implement authentication)
    let accessToken;
    try {
        const authResponse = await fetch('/api/v1/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId: 'dashboard-admin',
                deviceSecret: 'test-secret'
            })
        });
        
        const authData = await authResponse.json();
        if (authData.success) {
            accessToken = authData.data.accessToken;
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        addLogEntry(`❌ Error authenticating: ${error.message}`);
        return;
    }
    
    // Collect parameters based on command type
    let parameters = {};
    switch (commandType) {
        case 'take_snapshot':
            parameters = {
                cameraId: parseInt(document.getElementById('cameraId').value),
                resolution: document.getElementById('resolution').value
            };
            break;
            
        case 'start_recording':
            parameters = {
                duration: parseInt(document.getElementById('duration').value),
                quality: document.getElementById('recordingQuality').value
            };
            break;
            
        case 'update_config':
            try {
                parameters = JSON.parse(document.getElementById('configJson').value);
            } catch (e) {
                addLogEntry('❌ Error: Invalid JSON in configuration');
                return;
            }
            break;
            
        case 'custom':
            const commandName = document.getElementById('commandName').value;
            if (!commandName) {
                addLogEntry('❌ Error: Custom command name is required');
                return;
            }
            
            try {
                const customParams = JSON.parse(document.getElementById('customParams').value);
                parameters = {
                    name: commandName,
                    ...customParams
                };
            } catch (e) {
                addLogEntry('❌ Error: Invalid JSON in custom parameters');
                return;
            }
            break;
    }
    
    // Send command to server
    try {
        const response = await fetch(`/api/v1/commands/${deviceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                commandType,
                parameters,
                priority
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLogEntry(`✅ Command sent to ${deviceId}: ${commandType}`);
            updateCommandHistory(data.data.commandId, deviceId, commandType);
        } else {
            addLogEntry(`❌ Error sending command: ${data.error.message}`);
        }
    } catch (error) {
        addLogEntry(`❌ Error sending command: ${error.message}`);
    }
}

function updateCommandHistory(commandId, deviceId, commandType) {
    const historyTable = document.getElementById('commandHistoryTable');
    
    // Remove placeholder if present
    if (historyTable.querySelector('.loading-text')) {
        historyTable.innerHTML = '';
    }
    
    // Add new command to history
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${commandId}</td>
        <td>${deviceId}</td>
        <td>${commandType}</td>
        <td><span class="badge badge-info">Pending</span></td>
        <td>${new Date().toLocaleString()}</td>
        <td>
            <button class="check-status-btn" onclick="checkCommandStatus('${commandId}')">Check Status</button>
        </td>
    `;
    
    // Add to top of table
    if (historyTable.firstChild) {
        historyTable.insertBefore(row, historyTable.firstChild);
    } else {
        historyTable.appendChild(row);
    }
}

async function checkCommandStatus(commandId) {
    try {
        // Get access token
        const authResponse = await fetch('/api/v1/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId: 'dashboard-admin',
                deviceSecret: 'test-secret'
            })
        });
        
        const authData = await authResponse.json();
        if (!authData.success) {
            throw new Error('Authentication failed');
        }
        
        const accessToken = authData.data.accessToken;
        
        // Check command status
        const response = await fetch(`/api/v1/commands/${commandId}/status`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update status in table
            const rows = document.querySelectorAll('#commandHistoryTable tr');
            for (const row of rows) {
                if (row.cells[0].textContent === commandId) {
                    // Update status cell
                    const statusCell = row.cells[3];
                    let badgeClass = 'badge-info';
                    
                    switch (data.data.status) {
                        case 'completed':
                            badgeClass = 'badge-success';
                            break;
                        case 'failed':
                            badgeClass = 'badge-danger';
                            break;
                        case 'pending':
                            badgeClass = 'badge-warning';
                            break;
                    }
                    
                    statusCell.innerHTML = `<span class="badge ${badgeClass}">${data.data.status}</span>`;
                    
                    // Add result if available
                    if (data.data.result) {
                        const resultCell = document.createElement('td');
                        resultCell.textContent = JSON.stringify(data.data.result);
                        if (row.cells.length === 6) {
                            row.insertBefore(resultCell, row.cells[5]);
                        }
                    }
                    
                    break;
                }
            }
            
            addLogEntry(`ℹ️ Command ${commandId} status: ${data.data.status}`);
        } else {
            addLogEntry(`❌ Error checking command status: ${data.error.message}`);
        }
    } catch (error) {
        addLogEntry(`❌ Error checking command status: ${error.message}`);
    }
}

// Expose functions globally
window.checkCommandStatus = checkCommandStatus;