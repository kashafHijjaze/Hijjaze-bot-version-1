import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  delay
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import { getSessions, saveSessions, WASession, addLog } from './db';

// Map of active WhatsApp sockets by userId
const activeSockets = new Map<string, any>();

// Socket.IO server reference to emit live events
let ioRef: SocketIOServer | null = null;

export function setIoInstance(io: SocketIOServer) {
  ioRef = io;
}

// Clean phone number (remove +, spaces, hyphens)
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Initializes a WhatsApp session for a user.
 * If credentials exist, it will auto-connect.
 */
export async function initWhatsAppSession(userId: string, userEmail: string, autoConnect = true) {
  try {
    const sessionDir = path.join(process.cwd(), 'data', 'sessions', userId);
    
    // Ensure session directory exists
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Get multi-file auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    // Check if we already have an active socket, close it if so
    if (activeSockets.has(userId)) {
      try {
        const oldSock = activeSockets.get(userId);
        oldSock.end();
      } catch (err) {}
      activeSockets.delete(userId);
    }

    // Create the socket
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    activeSockets.set(userId, sock);

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Handle connection status updates
    sock.ev.on('connection.update', async (update) => {
      // Check if this socket is still the active socket for this user
      if (activeSockets.get(userId) !== sock) {
        console.log(`Connection update ignored for stale socket of user ${userId}`);
        return;
      }

      const { connection, lastDisconnect, qr } = update;
      
      const sessions = getSessions();
      let session = sessions.find(s => s.userId === userId);

      if (!session) {
        session = {
          id: userId,
          userId,
          phone: '',
          status: 'disconnected'
        };
        sessions.push(session);
      }

      if (connection === 'close') {
        const isRegistered = sock.authState?.creds?.registered;
        const shouldReconnect = isRegistered && (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`Connection closed for user ${userId}. Registered? ${isRegistered}. Reconnecting?`, shouldReconnect);
        
        session.status = 'disconnected';
        saveSessions(sessions);
        
        // Emit update
        if (ioRef) {
          ioRef.to(userId).emit('wa-status', {
            status: 'disconnected',
            reason: lastDisconnect?.error?.message || 'Connection closed'
          });
        }

        activeSockets.delete(userId);

        if (shouldReconnect) {
          // Add delay and attempt reconnect
          await delay(5000);
          initWhatsAppSession(userId, userEmail, true);
        } else {
          // Logged out or unregistered: clean up credentials if logged out
          if ((lastDisconnect?.error as any)?.output?.statusCode === DisconnectReason.loggedOut) {
            addLog(userId, userEmail, 'whatsapp_logout', 'WhatsApp session was logged out or disconnected permanently.');
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch (e) {}
          }
        }
      } else if (connection === 'open') {
        console.log(`WhatsApp connection opened successfully for user ${userId}`);
        
        const userJid = sock.user?.id;
        const phone = userJid ? cleanPhoneNumber(userJid.split(':')[0]) : '';
        const name = sock.user?.name || 'WhatsApp User';
        
        session.status = 'connected';
        session.phone = phone;
        session.name = name;
        session.lastConnected = new Date().toISOString();
        
        // Fetch profile picture if possible
        try {
          const ppUrl = await sock.profilePictureUrl(userJid!, 'image');
          session.avatar = ppUrl;
        } catch (err) {
          session.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
        }

        saveSessions(sessions);
        addLog(userId, userEmail, 'whatsapp_connected', `Successfully connected WhatsApp account: +${phone} (${name})`);

        // Emit successful status
        if (ioRef) {
          ioRef.to(userId).emit('wa-status', {
            status: 'connected',
            phone,
            name,
            avatar: session.avatar,
            lastConnected: session.lastConnected
          });
        }
      }
    });

    return sock;
  } catch (error) {
    console.error('Error initializing Baileys socket:', error);
    return null;
  }
}

/**
 * Wait for the underlying WebSocket to be open (readyState === 1)
 */
async function waitForSocketReady(sock: any, maxTimeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxTimeoutMs) {
    if (sock && sock.ws && sock.ws.readyState === 1) { // 1 is OPEN
      return true;
    }
    await delay(200);
  }
  return false;
}

/**
 * Request a Pairing Code for a phone number
 */
export async function generatePairingCode(userId: string, userEmail: string, phone: string): Promise<string> {
  const cleanedPhone = cleanPhoneNumber(phone);
  if (!cleanedPhone) {
    throw new Error('Invalid phone number format');
  }

  // Clear any existing/stale session directory first to ensure a completely clean slate
  const sessionDir = path.join(process.cwd(), 'data', 'sessions', userId);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (e) {}

  // Initialize a fresh WhatsApp session
  const sock = await initWhatsAppSession(userId, userEmail, false);

  if (!sock) {
    throw new Error('Failed to initialize WhatsApp connection client');
  }

  // Update session record state
  const sessions = getSessions();
  let session = sessions.find(s => s.userId === userId);
  if (!session) {
    session = {
      id: userId,
      userId,
      phone: cleanedPhone,
      status: 'connecting'
    };
    sessions.push(session);
  } else {
    session.status = 'connecting';
    session.phone = cleanedPhone;
  }
  saveSessions(sessions);

  addLog(userId, userEmail, 'pairing_requested', `Requested pairing code for phone number +${cleanedPhone}`);

  // Request code from WhatsApp
  try {
    console.log(`Waiting up to 15s for WhatsApp socket connection to establish for user ${userId}...`);
    const isReady = await waitForSocketReady(sock, 15000);
    console.log(`WhatsApp socket ready state: ${isReady ? 'READY (OPEN)' : 'TIMEOUT / NOT READY'}`);
    
    // Give a short extra delay for Noise handshake
    await delay(2000);
    
    let code: string;
    try {
      code = await sock.requestPairingCode(cleanedPhone);
    } catch (firstErr: any) {
      console.warn('First pairing code request failed, retrying after delay:', firstErr);
      await delay(3000);
      code = await sock.requestPairingCode(cleanedPhone);
    }
    
    console.log(`Generated pairing code for ${cleanedPhone}: ${code}`);
    return code;
  } catch (err: any) {
    console.error('Error generating pairing code:', err);
    session.status = 'disconnected';
    saveSessions(sessions);
    throw new Error(err.message || 'Failed to request pairing code from WhatsApp. Ensure the number is correct and has WhatsApp active.');
  }
}

/**
 * Disconnect WhatsApp session
 */
export async function disconnectWhatsApp(userId: string, userEmail: string) {
  const sock = activeSockets.get(userId);
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // If logout fails, end socket directly
      try {
        sock.end();
      } catch (err) {}
    }
    activeSockets.delete(userId);
  }

  const sessionDir = path.join(process.cwd(), 'data', 'sessions', userId);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (e) {}

  const sessions = getSessions();
  const updated = sessions.filter(s => s.userId !== userId);
  saveSessions(updated);

  addLog(userId, userEmail, 'whatsapp_disconnected', 'WhatsApp disconnected and credentials deleted by user.');
  
  if (ioRef) {
    ioRef.to(userId).emit('wa-status', { status: 'disconnected' });
  }
}

/**
 * Send a message using the active WhatsApp socket
 */
export async function sendWhatsAppMessage(
  userId: string, 
  targetPhone: string, 
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker',
  content: string, // Text message content or file URL/base64
  fileName?: string
) {
  const sock = activeSockets.get(userId);
  if (!sock || sock.state?.connection !== 'open') {
    const sessions = getSessions();
    const session = sessions.find(s => s.userId === userId);
    if (session && session.status === 'connected') {
      // Try to re-init
      await initWhatsAppSession(userId, 'unknown@hijjaze.com');
      await delay(2000);
    }
    
    const reSock = activeSockets.get(userId);
    if (!reSock) {
      throw new Error('WhatsApp is not connected. Please connect your account first.');
    }
  }

  const targetJid = `${cleanPhoneNumber(targetPhone)}@s.whatsapp.net`;
  let result;

  const activeSock = activeSockets.get(userId);

  if (messageType === 'text') {
    result = await activeSock.sendMessage(targetJid, { text: content });
  } else if (messageType === 'image') {
    result = await activeSock.sendMessage(targetJid, { 
      image: { url: content }, 
      caption: fileName || 'Sent from Hijjaze Bot' 
    });
  } else if (messageType === 'video') {
    result = await activeSock.sendMessage(targetJid, { 
      video: { url: content }, 
      caption: fileName || 'Sent from Hijjaze Bot' 
    });
  } else if (messageType === 'audio') {
    result = await activeSock.sendMessage(targetJid, { 
      audio: { url: content },
      mimetype: 'audio/mp4',
      ptt: true // push to talk (voice note)
    });
  } else if (messageType === 'document') {
    result = await activeSock.sendMessage(targetJid, { 
      document: { url: content },
      mimetype: 'application/octet-stream',
      fileName: fileName || 'document.bin'
    });
  } else if (messageType === 'sticker') {
    result = await activeSock.sendMessage(targetJid, { 
      sticker: { url: content } 
    });
  }

  return result;
}

/**
 * Get contacts and chats from the active WhatsApp connection
 */
export async function getWhatsAppGroups(userId: string) {
  const sock = activeSockets.get(userId);
  if (!sock) {
    throw new Error('WhatsApp not connected');
  }
  
  try {
    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups);
  } catch (err) {
    console.error('Error fetching participating groups:', err);
    return [];
  }
}

/**
 * Helper to get the creds.json content for download
 */
export function getCredsJson(userId: string): string {
  const credsPath = path.join(process.cwd(), 'data', 'sessions', userId, 'creds.json');
  if (fs.existsSync(credsPath)) {
    return fs.readFileSync(credsPath, 'utf-8');
  }
  throw new Error('Credentials file not found. Ensure WhatsApp is paired successfully.');
}

/**
 * Auto-connect all saved sessions on server startup
 */
export async function autoConnectAllSessions() {
  const sessions = getSessions();
  const users = getSessions(); // sessions are stored by userId
  console.log(`Auto-connecting ${sessions.length} saved WhatsApp sessions...`);
  
  for (const session of sessions) {
    if (session.status === 'connected') {
      try {
        console.log(`Restoring session for user: ${session.userId}`);
        await initWhatsAppSession(session.userId, 'system-restore@hijjaze.com', true);
      } catch (err) {
        console.error(`Failed to restore session for ${session.userId}:`, err);
      }
    }
  }
}
