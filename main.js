import { app, BrowserWindow, ipcMain, systemPreferences } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import dotenv from 'dotenv';
import OpenAIService from './frontend/src/app/src/services/openai';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable speech dispatcher
app.commandLine.appendSwitch('enable-speech-dispatcher');

// Add IPC handlers for both microphone and ElizaOS
ipcMain.handle('check-microphone-permission', async () => {
    if (process.platform === 'darwin') {
        return systemPreferences.getMediaAccessStatus('microphone');
    }
    return 'granted';
});

ipcMain.handle('request-microphone-permission', async () => {
    if (process.platform === 'darwin') {
        return systemPreferences.askForMediaAccess('microphone');
    }
    return true;
});
const openAIService = new OpenAIService();

// Add ElizaOS IPC handlers
ipcMain.handle('eliza-send-message', async (event, { agentId, message }) => {
    try {
        const response = await fetch(`http://192.168.1.124:3000/${agentId}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error sending message to ElizaOS:', error);
        throw error;
    }
});

ipcMain.handle('eliza-check-server', async () => {
    try {        const response = await fetch('http://192.168.1.124:3500');        return response.ok;
    } catch (error) {
        console.error('Error checking ElizaOS server:', error);
        return false;
    }
});

process.env.REACT_APP_API_URL = 'http://192.168.1.124:3500';

// Create preload script content
const preloadScript = `
    const { contextBridge, ipcRenderer } = require('electron');

    contextBridge.exposeInMainWorld('elizaAPI', {
        sendMessage: async (agentId, message) => 
            ipcRenderer.invoke('eliza-send-message', { agentId, message }),
        checkServerStatus: async () => 
            ipcRenderer.invoke('eliza-check-server'),
    });

    contextBridge.exposeInMainWorld('microphone', {
        checkPermission: () => ipcRenderer.invoke('check-microphone-permission'),
        requestPermission: () => ipcRenderer.invoke('request-microphone-permission'),
    });

    contextBridge.exposeInMainWorld('electron', {
        env: process.env
    });
`;
// OpenAI IPC handlers
ipcMain.handle('create-chat-completion', async (event, { model, messages }) => {
    try {
      const completion = await openAIService.createChatCompletion(model, messages);
      return completion;
    } catch (error) {
      console.error('Error in create-chat-completion:', error);
      throw new Error(error.message);
    }
  });
  
  ipcMain.handle('create-session', async () => {
    try {
      const sessionResult = await openAIService.createSession();
      return sessionResult;
    } catch (error) {
      console.error('Error in create-session:', error);
      throw new Error(error.message);
    }
  });
  
// Write preload script to a file
import { writeFileSync } from 'fs';
const preloadPath = path.join(__dirname, 'preload.ts');
writeFileSync(preloadPath, preloadScript);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false, // Changed to false for security
            contextIsolation: true, // Changed to true for security
            webSecurity: true,
            permissions: ['microphone', 'audioCapture'],
            webAudio: true,
            audioWorklet: true,
            preload: preloadPath // Add preload script
        }
    });

    // Set permissions for media
    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'audioCapture', 'microphone'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
    });

    // Make env variables available to renderer process
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('env-vars', {
            VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY
        });

        // Request microphone permission on macOS
        if (process.platform === 'darwin') {
            systemPreferences.askForMediaAccess('microphone')
                .then(granted => {
                    console.log('Microphone permission:', granted ? 'granted' : 'denied');
                })
                .catch(error => {
                    console.error('Error requesting microphone permission:', error);
                });
        }
    });

    // Load the app
    if (!app.isPackaged) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    // Add CSP headers with audio/media permissions and ElizaOS endpoints
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                    "connect-src 'self' ws://localhost:8081 ws://localhost:8081 http://localhost:8080 wss://localhost:8081 https://api.openai.com/v1/realtime/sessions http://localhost:3000 https://localhost:3000 " +
                    "http://localhost:3001 https://localhost:3001 http://192.168.1.124:3001 https://192.168.1.124:3001 " +
                    "http://localhost:3500 https://localhost:3500 " +
                    "http://localhost:5000 https://localhost:5000 http://localhost:5173 ws://localhost:5173 " +
                    "https://api.openai.com wss://api.openai.com https://api.openai.com/v1/realtime/sessions " +
                    "https://api.openai.com " +
                    "http://localhost:8080" +
                    "http://192.168.1.124:5000" +
                    "http://192.168.1.124:3000" +
                    "http://192.168.1.124:3001" +
                    "http://192.168.1.124:3005" +
                    "wss://api.openai.com " +
                    "https://*.openai.com " +
                    "wss://*.openai.com " +
                    "http://localhost:* " +
                    "ws://localhost:* " +
                    "https://localhost:*;" +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
                ],
                'Access-Control-Allow-Origin': ['*'],
                'Access-Control-Allow-Methods': ['GET, POST, OPTIONS'],
                'Access-Control-Allow-Headers': ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
                'Access-Control-Allow-Credentials': ['true']
            }
        });
    });



    // Send safe environment variables to the renderer if needed
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('env-vars', {
        VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY
        });
    });
}

// App lifecycle handlers remain the same
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});