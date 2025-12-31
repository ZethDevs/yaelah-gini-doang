const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const { encode } = require("./encode");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Load config
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const ADMIN_KEY = config.admin_key;
const USERS_FILE = config.users_file;
const AES_KEY = config.aes_key || "leafions星河V6";
let MODE = config.mode;
let totalHit = 0;

// Helper functions
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function calculateDaysRemaining(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function updateUserExpiry() {
  const users = loadUsers();
  const now = new Date();
  let updated = false;

  const updatedUsers = users.map(user => {
    const daysRemaining = calculateDaysRemaining(user.expires_at);
    if (daysRemaining === 0 && user.status === "active") {
      updated = true;
      return { ...user, status: "expired" };
    }
    return user;
  });

  if (updated) {
    saveUsers(updatedUsers);
  }
}

// Run expiry check on startup
updateUserExpiry();

// ===== MIDDLEWARE =====
function authenticateAdmin(req, res, next) {
  if (req.body.key === ADMIN_KEY || req.query.key === ADMIN_KEY) {
    next();
  } else {
    res.status(401).json({ ok: false, error: "Invalid admin key" });
  }
}

// ===== PANEL API =====
app.post("/api/login", (req, res) => {
  if (req.body.key === ADMIN_KEY) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

app.get("/api/status", (req, res) => {
  res.json({ mode: MODE, encryption: "AES-256-CBC" });
});

app.post("/api/switch", authenticateAdmin, (req, res) => {
  MODE = MODE === "online" ? "offline" : "online";
  
  // Update config file
  config.mode = MODE;
  fs.writeFileSync("config.json", JSON.stringify(config, null, 2), "utf8");
  
  res.json({ mode: MODE });
});

app.get("/api/info", (req, res) => {
  res.json({
    hit: totalHit,
    ip: req.socket.localAddress || "127.0.0.1",
    message: "Server running normally",
    version: "2.0.0",
    uptime: process.uptime(),
    encryption: "AES-256-CBC"
  });
});

// ===== PUBLIC API =====
// Get all users (public access - no encryption needed)
app.get("/api/users/public", (req, res) => {
  const users = loadUsers();
  
  // Filter only necessary public information
  const publicUsers = users.map(user => ({
    username: user.username,
    status: user.status,
    days_remaining: calculateDaysRemaining(user.expires_at)
  }));
  
  res.json({ 
    ok: true, 
    users: publicUsers,
    total: publicUsers.length,
    timestamp: new Date().toISOString()
  });
});

// ===== USER MANAGEMENT API =====
// Get all users (unencrypted for dashboard)
app.get("/api/users", authenticateAdmin, (req, res) => {
  const users = loadUsers();
  const usersWithDays = users.map(user => ({
    id: user.id,
    username: user.username,
    created_at: user.created_at,
    expires_at: user.expires_at,
    status: user.status,
    days_remaining: calculateDaysRemaining(user.expires_at)
  }));
  res.json({ ok: true, users: usersWithDays });
});

// Get single user
app.get("/api/users/:id", authenticateAdmin, (req, res) => {
  const users = loadUsers();
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  
  res.json({ 
    ok: true, 
    user: {
      id: user.id,
      username: user.username,
      created_at: user.created_at,
      expires_at: user.expires_at,
      status: user.status,
      days_remaining: calculateDaysRemaining(user.expires_at)
    }
  });
});

// Create new user
app.post("/api/users", authenticateAdmin, (req, res) => {
  const { username, expires_in_days } = req.body;
  
  if (!username || !expires_in_days) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }
  
  const users = loadUsers();
  
  // Check if username already exists
  if (users.some(u => u.username === username)) {
    return res.status(400).json({ ok: false, error: "Username already exists" });
  }
  
  // Generate ID
  const id = Date.now().toString();
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(now.getDate() + parseInt(expires_in_days));
  
  const newUser = {
    id,
    username,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: "active"
  };
  
  users.push(newUser);
  saveUsers(users);
  
  res.json({ 
    ok: true, 
    user: {
      ...newUser,
      days_remaining: parseInt(expires_in_days)
    }
  });
});

// Update user
app.put("/api/users/:id", authenticateAdmin, (req, res) => {
  const { username, expires_in_days, status } = req.body;
  const users = loadUsers();
  const index = users.findIndex(u => u.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  
  // Check if username already exists (excluding current user)
  if (username && users.some((u, i) => i !== index && u.username === username)) {
    return res.status(400).json({ ok: false, error: "Username already exists" });
  }
  
  // Update user
  if (username) users[index].username = username;
  if (status) users[index].status = status;
  
  // Update expiry if provided
  if (expires_in_days) {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + parseInt(expires_in_days));
    users[index].expires_at = expiresAt.toISOString();
  }
  
  saveUsers(users);
  
  res.json({ 
    ok: true, 
    user: {
      ...users[index],
      days_remaining: expires_in_days || calculateDaysRemaining(users[index].expires_at)
    }
  });
});

// Delete user
app.delete("/api/users/:id", authenticateAdmin, (req, res) => {
  const users = loadUsers();
  const filteredUsers = users.filter(u => u.id !== req.params.id);
  
  if (filteredUsers.length === users.length) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  
  saveUsers(filteredUsers);
  res.json({ ok: true, message: "User deleted successfully" });
});

// ===== SCRIPT API =====
app.get("/script", (req, res) => {
  totalHit++;
  const raw = fs.readFileSync(
    MODE === "online" ? "./online.js" : "./offline.js",
    "utf8"
  );

  const encrypted = encode(raw, AES_KEY);

  res.json({
    creator: "Nathan",
    mode: MODE,
    data: encrypted,
    time: new Date().toISOString(),
    encryption: "星河-V6-BETA"
  //  encryption: "AES-256-CBC"
  });
});

// Start server
app.listen(3000, () => {
  console.log("Admin Panel : http://localhost:3000");
  console.log("Script Api : http://localhost:3000/script");
  console.log("Encryption : AES-256-CBC enabled");
});