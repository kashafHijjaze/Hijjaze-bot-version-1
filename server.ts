import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Local files & DB helpers
import { 
  getUsers, 
  saveUsers, 
  getSessions, 
  saveSessions, 
  getLogs, 
  addLog, 
  User 
} from './server/db';

import {
  initWhatsAppSession,
  generatePairingCode,
  disconnectWhatsApp,
  sendWhatsAppMessage,
  getWhatsAppGroups,
  getCredsJson,
  autoConnectAllSessions,
  setIoInstance
} from './server/baileys';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hijjaze-bot-jwt-super-secret-key-2026';

// Attach Io instance to Baileys manager
setIoInstance(io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to encrypt session IDs (just simple hex encoding of user credential mapping for demo)
function encryptSessionId(userId: string): string {
  return Buffer.from(`hijjaze_session_${userId}_${Date.now()}`).toString('hex');
}

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin Auth Middleware
const authenticateAdmin = (req: any, res: any, next: any) => {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Requires administrator privileges' });
    }
  });
};

// --- AUTHENTICATION ROUTES ---

// Register New User
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 10),
      name,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    addLog(newUser.id, newUser.email, 'register', `Successfully registered account: ${name}`);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Login User
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    addLog(user.id, user.email, 'login', `User logged in: ${user.name}`);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Google Sign In Mock (Automatically logs in or registers based on Google user profile payloads)
app.post('/api/auth/google', (req, res) => {
  try {
    const { email, name, googleId, imageUrl } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required for Google Login' });
    }

    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Create new account
      user = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        name,
        role: 'user',
        googleId,
        avatarUrl: imageUrl,
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
      addLog(user.id, user.email, 'google_register', `Registered with Google: ${name}`);
    } else {
      // Update google profile
      user.googleId = googleId || user.googleId;
      user.avatarUrl = imageUrl || user.avatarUrl;
      saveUsers(users);
      addLog(user.id, user.email, 'google_login', `Logged in with Google: ${name}`);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});


// --- WHATSAPP PAIRING & SESSIONS API ---

// Request Pairing Code
app.post('/api/whatsapp/pair', authenticateToken, async (req: any, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'WhatsApp phone number is required' });
    }

    const code = await generatePairingCode(req.user.id, req.user.email, phone);
    res.json({ code, expiresSeconds: 120 });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate pairing code' });
  }
});

// Check Session Connection Status
app.get('/api/whatsapp/status', authenticateToken, (req: any, res) => {
  try {
    const sessions = getSessions();
    const session = sessions.find(s => s.userId === req.user.id);
    if (!session) {
      return res.json({ status: 'disconnected' });
    }
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch status' });
  }
});

// Copy Encrypted Session ID token
app.get('/api/whatsapp/session-token', authenticateToken, (req: any, res) => {
  try {
    const sessions = getSessions();
    const session = sessions.find(s => s.userId === req.user.id);
    if (!session || session.status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp is not paired or connected.' });
    }
    const token = encryptSessionId(req.user.id);
    res.json({ token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch session token' });
  }
});

// Download WhatsApp Creds.json file payload
app.get('/api/whatsapp/download-creds', authenticateToken, (req: any, res) => {
  try {
    const credsJson = getCredsJson(req.user.id);
    res.setHeader('Content-disposition', 'attachment; filename=creds.json');
    res.setHeader('Content-type', 'application/json');
    res.send(credsJson);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Credentials not found. Connect WhatsApp first.' });
  }
});

// Disconnect/Logout WhatsApp
app.post('/api/whatsapp/disconnect', authenticateToken, async (req: any, res) => {
  try {
    await disconnectWhatsApp(req.user.id, req.user.email);
    res.json({ success: true, message: 'WhatsApp session disconnected and removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to disconnect WhatsApp' });
  }
});


// --- BOT CONTROL PANEL ENDPOINTS ---

// Send Custom WhatsApp Messages
app.post('/api/whatsapp/send', authenticateToken, async (req: any, res) => {
  try {
    const { targetPhone, messageType, content, fileName } = req.body;
    if (!targetPhone || !messageType || !content) {
      return res.status(400).json({ error: 'targetPhone, messageType, and content are required' });
    }

    const result = await sendWhatsAppMessage(
      req.user.id,
      targetPhone,
      messageType,
      content,
      fileName
    );

    addLog(req.user.id, req.user.email, 'send_message', `Sent ${messageType} message to +${targetPhone}`);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send WhatsApp message' });
  }
});

// Fetch participating WhatsApp groups
app.get('/api/whatsapp/groups', authenticateToken, async (req: any, res) => {
  try {
    const groups = await getWhatsAppGroups(req.user.id);
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch participating groups' });
  }
});


// --- ADMIN MANAGEMENT PANEL ENDPOINTS ---

// Get Users List (Admin)
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  try {
    const users = getUsers().map(u => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Connected Sessions (Admin)
app.get('/api/admin/sessions', authenticateAdmin, (req, res) => {
  try {
    const sessions = getSessions();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete or Disable User Session (Admin)
app.delete('/api/admin/sessions/:userId', authenticateAdmin, async (req: any, res) => {
  try {
    const targetUserId = req.params.userId;
    const users = getUsers();
    const targetUser = users.find(u => u.id === targetUserId);
    
    await disconnectWhatsApp(targetUserId, targetUser?.email || 'admin-action');
    res.json({ success: true, message: 'Successfully disconnected and cleared session for target user.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Disable User Account (Admin)
app.post('/api/admin/users/:userId/toggle-role', authenticateAdmin, (req: any, res) => {
  try {
    const targetUserId = req.params.userId;
    const users = getUsers();
    const index = users.findIndex(u => u.id === targetUserId);
    
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[index].role === 'admin') {
      users[index].role = 'user';
    } else {
      users[index].role = 'admin';
    }

    saveUsers(users);
    res.json({ success: true, user: users[index] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download System Session Backups Zip/JSON payload
app.get('/api/admin/backup', authenticateAdmin, (req, res) => {
  try {
    const backup = {
      users: getUsers(),
      sessions: getSessions(),
      logs: getLogs()
    };
    res.setHeader('Content-disposition', 'attachment; filename=hijjaze-bot-backup.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Activity & Device Logs (Admin)
app.get('/api/admin/logs', authenticateAdmin, (req, res) => {
  try {
    const logs = getLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- REAL-TIME COMMUNICATIONS (SOCKET.IO) ---
io.on('connection', (socket) => {
  console.log('Client connected to Socket.IO status pipeline:', socket.id);

  // Authenticate socket connection
  socket.on('join', (userId: string) => {
    socket.join(userId);
    console.log(`Socket client ${socket.id} joined room ${userId}`);
    
    // Send immediate state if exists
    const sessions = getSessions();
    const session = sessions.find(s => s.userId === userId);
    if (session) {
      socket.emit('wa-status', session);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});


// --- VITE RUNTIME CONFIGURATION ---
async function startServer() {
  // Restore pre-existing sessions on boot
  await autoConnectAllSessions();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server and WhatsApp sockets listening on http://localhost:${PORT}`);
  });
}

startServer();
