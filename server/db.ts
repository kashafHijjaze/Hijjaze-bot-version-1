import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure data directory and files exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    // Seed default admin and a sample user
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const defaultUsers = [
      {
        id: 'admin-id',
        email: 'admin@hijjaze.com',
        passwordHash: adminPasswordHash,
        name: 'Hijjaze Admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-id-demo',
        email: 'demo@hijjaze.com',
        passwordHash: bcrypt.hashSync('user123', 10),
        name: 'Demo User',
        role: 'user',
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
  }

  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
  }
}

initDb();

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  name: string;
  role: 'user' | 'admin';
  googleId?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface WASession {
  id: string; // usually equals the phone number or custom session ID
  userId: string;
  phone: string;
  status: 'disconnected' | 'connecting' | 'connected';
  name?: string;
  avatar?: string;
  lastConnected?: string;
  creds?: any; // Baileys authentication state
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

// Read helpers
export function getUsers(): User[] {
  try {
    initDb();
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveUsers(users: User[]) {
  initDb();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function getSessions(): WASession[] {
  try {
    initDb();
    const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveSessions(sessions: WASession[]) {
  initDb();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export function getLogs(): ActivityLog[] {
  try {
    initDb();
    const data = fs.readFileSync(LOGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveLogs(logs: ActivityLog[]) {
  initDb();
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

export function addLog(userId: string, userEmail: string, action: string, details: string) {
  const logs = getLogs();
  const log: ActivityLog = {
    id: 'log_' + Math.random().toString(36).substr(2, 9),
    userId,
    userEmail,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  logs.unshift(log); // newest first
  // Keep last 500 logs
  if (logs.length > 500) logs.pop();
  saveLogs(logs);
  return log;
}
