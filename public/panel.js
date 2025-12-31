let ADMIN_KEY = "";
let usersData = [];
let userToDelete = null;

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    const savedKey = localStorage.getItem('admin_key');
    if (savedKey) {
        ADMIN_KEY = savedKey;
        document.getElementById('overlay').style.display = 'none';
        loadAll();
        startAutoRefresh();
    }
    
    // Set last changed time
    document.getElementById('lastChanged').textContent = 
        new Date().toLocaleString();
    
    // Setup event listeners
    setupEventListeners();
});

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Enter key for login
    document.getElementById('keyInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // Enter key for user search
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchUsers();
            }
        });
    }
}

// ===== TOGGLE EYE FUNCTION =====
function toggleEye() {
    const input = document.getElementById("keyInput");
    const eyeBtn = document.getElementById("eyeToggle");
    const eyeIcon = eyeBtn.querySelector('i');
    
    // Toggle input type
    if (input.type === "password") {
        input.type = "text";
        eyeIcon.className = "fas fa-eye-slash";
        eyeBtn.setAttribute('title', 'Hide Password');
        eyeBtn.classList.add('pulse');
        
        // Remove pulse animation after it completes
        setTimeout(() => {
            eyeBtn.classList.remove('pulse');
        }, 500);
    } else {
        input.type = "password";
        eyeIcon.className = "fas fa-eye";
        eyeBtn.setAttribute('title', 'Show Password');
    }
    
    // Focus back on input
    input.focus();
}

// ===== SHOW LOGIN MESSAGE =====
function showLoginMessage(type, title, message) {
    const container = document.getElementById("loginMessages");
    
    // Remove existing message
    const existing = container.querySelector('.login-message');
    if (existing) {
        existing.classList.add('hiding');
        setTimeout(() => existing.remove(), 300);
    }
    
    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = `login-message ${type}`;
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
        <div class="message-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="message-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(messageEl);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentElement) {
            messageEl.classList.add('hiding');
            setTimeout(() => messageEl.remove(), 300);
        }
    }, 5000);
}

// ===== ENHANCED LOGIN FUNCTION =====
async function login() {
    const keyInput = document.getElementById("keyInput");
    const loginBtn = document.getElementById("loginBtn");
    const inputGroup = document.querySelector('.input-group');
    const key = keyInput.value.trim();
    
    // Clear previous messages
    document.getElementById("loginMessages").innerHTML = '';
    
    // Reset states
    inputGroup.classList.remove('error', 'success');
    loginBtn.classList.remove('loading', 'success', 'error');
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Login</span>';
    
    // Validate input
    if (!key) {
        inputGroup.classList.add('error');
        showLoginMessage('error', 'Input Required', 'Please enter your admin key');
        keyInput.focus();
        return;
    }
    
    // Show loading state
    loginBtn.classList.add('loading');
    loginBtn.innerHTML = '<i class="fas fa-spinner"></i><span>Authenticating...</span>';
    loginBtn.disabled = true;
    
    try {
        // Simulate API call delay (remove in production)
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key })
        });

        if (!res.ok) {
            throw new Error('Invalid credentials');
        }

        // Success state
        inputGroup.classList.add('success');
        loginBtn.classList.remove('loading');
        loginBtn.classList.add('success');
        loginBtn.innerHTML = '<i class="fas fa-check"></i><span>Access Granted!</span>';
        
        showLoginMessage('success', 'Login Successful', 'Welcome to Nathan - Tools Dashboard');
        
        // Store credentials and transition
        ADMIN_KEY = key;
        localStorage.setItem('admin_key', key);
        
        // Delay before redirect
        setTimeout(() => {
            document.getElementById("overlay").style.display = "none";
            loadAll();
            startAutoRefresh();
            
            // Reset button
            loginBtn.disabled = false;
            loginBtn.classList.remove('success');
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Login</span>';
        }, 1500);
        
    } catch (error) {
        // Error state
        inputGroup.classList.add('error');
        loginBtn.classList.remove('loading');
        loginBtn.classList.add('error');
        loginBtn.innerHTML = '<i class="fas fa-times"></i><span>Login Failed</span>';
        
        showLoginMessage('error', 'Authentication Failed', 
            error.message === 'Invalid credentials' 
                ? 'The admin key is incorrect. Please try again.'
                : 'Connection error. Please check your network.');
        
        // Reset after delay
        setTimeout(() => {
            loginBtn.disabled = false;
            loginBtn.classList.remove('error');
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Login</span>';
            
            // Clear input and focus
            keyInput.value = '';
            keyInput.focus();
            
            // Remove error state
            setTimeout(() => {
                inputGroup.classList.remove('error');
            }, 1000);
        }, 2000);
    }
}

// ===== ENTER KEY SUPPORT =====
document.addEventListener('DOMContentLoaded', function() {
    // Enter key for login
    const keyInput = document.getElementById("keyInput");
    keyInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // Clear error state on input
    keyInput.addEventListener('input', function() {
        const inputGroup = document.querySelector('.input-group');
        inputGroup.classList.remove('error', 'success');
    });
    
    // Auto focus on input when modal is shown
    const overlay = document.getElementById('overlay');
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                if (overlay.style.display !== 'none') {
                    setTimeout(() => keyInput.focus(), 100);
                }
            }
        });
    });
    
    observer.observe(overlay, { attributes: true });
});

// ===== LOGOUT FUNCTION =====
function logout() {
    // Show logout message
    showLoginMessage('info', 'Logged Out', 'You have been successfully logged out');
    
    // Clear credentials
    ADMIN_KEY = "";
    localStorage.removeItem('admin_key');
    
    // Smooth transition back to login
    setTimeout(() => {
        document.getElementById("overlay").style.display = "flex";
        
        // Reset form
        const keyInput = document.getElementById("keyInput");
        const inputGroup = document.querySelector('.input-group');
        const eyeBtn = document.getElementById("eyeToggle");
        
        keyInput.value = '';
        keyInput.type = 'password';
        inputGroup.classList.remove('error', 'success');
        
        eyeBtn.querySelector('i').className = "fas fa-eye";
        eyeBtn.setAttribute('title', 'Show Password');
        
        // Clear messages
        document.getElementById("loginMessages").innerHTML = '';
        
        // Focus on input
        setTimeout(() => keyInput.focus(), 100);
    }, 800);
    
    stopAutoRefresh();
}

// ===== LOAD ALL =====
async function loadAll() {
    try {
        await Promise.all([
            loadStatus(),
            loadInfo(),
            loadUsers()
        ]);
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

// ===== AUTO REFRESH =====
let refreshInterval;

function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadAll();
    }, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const updateElement = document.getElementById('lastUpdate');
    if (updateElement) {
        updateElement.textContent = timeStr;
    }
}

// ===== STATUS =====
async function loadStatus() {
    try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error('Failed to load status');
        
        const data = await res.json();
        const switchEl = document.getElementById("modeSwitch");
        const textEl = document.getElementById("modeText");
        const badgeEl = document.getElementById("modeBadge");

        if (data.mode === "online") {
            switchEl.classList.add("online");
            textEl.textContent = "ONLINE";
            badgeEl.textContent = "ONLINE";
            badgeEl.style.background = "linear-gradient(135deg, #43e97b, #38f9d7)";
        } else {
            switchEl.classList.remove("online");
            textEl.textContent = "OFFLINE";
            badgeEl.textContent = "OFFLINE";
            badgeEl.style.background = "var(--danger)";
        }
    } catch (error) {
        console.error('Error loading status:', error);
    }
}

// ===== INFO =====
async function loadInfo() {
    try {
        const res = await fetch("/api/info");
        if (!res.ok) throw new Error('Failed to load info');
        
        const data = await res.json();

        document.getElementById("hit").textContent = data.hit.toLocaleString();
        document.getElementById("ip").textContent = data.ip;
        document.getElementById("message").textContent = data.message;
        
        // Format uptime
        const uptime = parseFloat(data.uptime);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        document.getElementById("uptime").textContent = 
            `${hours}h ${minutes}m ${seconds}s`;
    } catch (error) {
        console.error('Error loading info:', error);
    }
}

// ===== TOGGLE MODE =====
async function toggleMode() {
    try {
        const res = await fetch("/api/switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: ADMIN_KEY })
        });

        if (!res.ok) {
            throw new Error('Session expired');
        }

        const data = await res.json();
        
        // Update last changed time
        document.getElementById('lastChanged').textContent = 
            new Date().toLocaleString();
        
        // Reload status with animation
        await loadStatus();
        
        // Show notification
        showNotification(
            `Mode switched to ${data.mode.toUpperCase()}`,
            data.mode === 'online' ? 'success' : 'warning'
        );
        
    } catch (error) {
        alert("Session expired. Please login again.");
        logout();
    }
}

// ===== USER MANAGEMENT =====
async function loadUsers() {
    try {
        const res = await fetch(`/api/users?key=${ADMIN_KEY}`);
        if (!res.ok) throw new Error('Failed to load users');
        
        const data = await res.json();
        usersData = data.users;
        renderUsersTable(usersData);
        updateUserStats(usersData);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users: ' + error.message, 'error');
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users" style="font-size: 48px; color: var(--gray); margin-bottom: 20px; display: block;"></i>
                    <h3 style="color: var(--gray); margin-bottom: 10px;">No Users Found</h3>
                    <p style="color: var(--gray);">Click "Add User" to create your first user</p>
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Calculate days progress percentage (max 30 days for 100%)
        const maxDays = 30;
        const progressPercent = Math.min(100, (user.days_remaining / maxDays) * 100);
        
        // Determine color based on days remaining
        let dayColor = 'var(--success)';
        if (user.days_remaining <= 7) {
            dayColor = 'var(--danger)';
        } else if (user.days_remaining <= 14) {
            dayColor = 'var(--warning)';
        }
        
        // Format dates
        const createdDate = new Date(user.created_at).toLocaleDateString();
        const expiresDate = new Date(user.expires_at).toLocaleDateString();
        
        row.innerHTML = `
            <td><code class="user-id">${user.id.substring(0, 8)}...</code></td>
            <td>
                <div class="user-info-cell">
                    <div class="username">${user.username}</div>
                    <small class="user-id-full" title="Full ID: ${user.id}">ID: ${user.id}</small>
                </div>
            </td>
            <td>
                <span class="status-badge ${user.status}">
                    <i class="fas fa-circle" style="font-size: 8px; margin-right: 5px;"></i>
                    ${user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
            </td>
            <td>
                <div class="days-cell">
                    <div class="days-value" style="color: ${dayColor}">
                        ${user.days_remaining} days
                    </div>
                    <div class="days-progress">
                        <div class="days-progress-bar" style="width: ${progressPercent}%; background: ${dayColor};"></div>
                    </div>
                </div>
            </td>
            <td>${createdDate}</td>
            <td>${expiresDate}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="openEditUserModal('${user.id}')">
                        <i class="fas fa-edit"></i> Edit User
                    </button>
                    <button class="btn-delete" onclick="openDeleteUserModal('${user.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    const userCountElement = document.getElementById('userCount');
    if (userCountElement) {
        userCountElement.textContent = users.length;
    }
}

function updateUserStats(users) {
    const activeUsers = users.filter(u => u.status === 'active').length;
    const expiringSoon = users.filter(u => u.days_remaining <= 7 && u.status === 'active').length;
    
    const activeUsersElement = document.getElementById('activeUsers');
    const expiringUsersElement = document.getElementById('expiringUsers');
    
    if (activeUsersElement) {
        activeUsersElement.textContent = activeUsers;
    }
    
    if (expiringUsersElement) {
        expiringUsersElement.textContent = 
            expiringSoon > 0 ? `${expiringSoon} users expiring soon` : 'No expiring users';
    }
    
    // Update storage info
    const storageSize = JSON.stringify(users).length;
    const storageInfoElement = document.getElementById('storageInfo');
    if (storageInfoElement) {
        storageInfoElement.textContent = 
            `Users: ${users.length} | Size: ${(storageSize / 1024).toFixed(2)} KB`;
    }
}

function searchUsers() {
    const searchInput = document.getElementById('userSearch');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const filteredUsers = usersData.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        user.id.includes(searchTerm) ||
        user.status.toLowerCase().includes(searchTerm)
    );
    renderUsersTable(filteredUsers);
}

// ===== USER MODAL FUNCTIONS =====
function openAddUserModal() {
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('statusGroup').style.display = 'none';
    document.getElementById('saveBtn').innerHTML = '<i class="fas fa-plus"></i> Add User';
    document.getElementById('userModal').style.display = 'flex';
}

function openEditUserModal(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user.id;
    document.getElementById('username').value = user.username;
    document.getElementById('expires_in_days').value = user.days_remaining;
    document.getElementById('status').value = user.status;
    document.getElementById('statusGroup').style.display = 'block';
    document.getElementById('saveBtn').innerHTML = '<i class="fas fa-save"></i> Update User';
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function saveUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const username = document.getElementById('username').value;
    const expires_in_days = document.getElementById('expires_in_days').value;
    const status = document.getElementById('status').value;
    
    const url = userId ? `/api/users/${userId}` : '/api/users';
    const method = userId ? 'PUT' : 'POST';
    
    const payload = { 
        username, 
        expires_in_days: parseInt(expires_in_days)
    };
    
    if (userId) {
        payload.status = status;
    }
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...payload, key: ADMIN_KEY })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to save user');
        }
        
        const data = await res.json();
        
        closeUserModal();
        await loadUsers();
        
        showNotification(
            userId ? 'User updated successfully' : 'User created successfully',
            'success'
        );
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== DELETE USER FUNCTIONS =====
function openDeleteUserModal(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    userToDelete = userId;
    document.getElementById('deleteMessage').textContent = 
        `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    userToDelete = null;
    document.getElementById('deleteModal').style.display = 'none';
}

async function confirmDelete() {
    if (!userToDelete) return;
    
    try {
        const res = await fetch(`/api/users/${userToDelete}?key=${ADMIN_KEY}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete user');
        }
        
        closeDeleteModal();
        await loadUsers();
        
        showNotification('User deleted successfully', 'success');
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Add notification styles if not already present
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 30px;
                right: 30px;
                background: white;
                padding: 20px 25px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 15px;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
                min-width: 300px;
                border-left: 4px solid;
            }
            
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .notification.success {
                border-left-color: #4cc9f0;
            }
            
            .notification.error {
                border-left-color: #f72585;
            }
            
            .notification.warning {
                border-left-color: #f8961e;
            }
            
            .notification.info {
                border-left-color: #4361ee;
            }
            
            .notification i:first-child {
                font-size: 20px;
            }
            
            .notification.success i:first-child {
                color: #4cc9f0;
            }
            
            .notification.error i:first-child {
                color: #f72585;
            }
            
            .notification.warning i:first-child {
                color: #f8961e;
            }
            
            .notification.info i:first-child {
                color: #4361ee;
            }
            
            .notification span {
                flex: 1;
                color: var(--dark);
                font-weight: 500;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--gray);
                cursor: pointer;
                padding: 5px;
                border-radius: 6px;
                transition: all 0.3s;
            }
            
            .notification-close:hover {
                background: rgba(0, 0, 0, 0.05);
                color: var(--dark);
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}