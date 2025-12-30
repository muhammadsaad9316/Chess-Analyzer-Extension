// Chess Analyzer - Background Service Worker

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('[Chess Analyzer] Extension installed');

    // Set default settings
    chrome.storage.local.set({
        enabled: true,
        serverUrl: 'http://localhost:5000/analyze'
    });
});

// Native Messaging Port
let nativePort = null;

function connectNative() {
    const hostName = "com.chess.analyzer";
    nativePort = chrome.runtime.connectNative(hostName);
    
    nativePort.onMessage.addListener((msg) => {
        console.log("Received native message:", msg);
        // Forward status updates to popup if needed, or save to storage
        if (msg.status === "success") {
            chrome.storage.local.set({ serverStatus: 'running' });
        }
    });

    nativePort.onDisconnect.addListener(() => {
        console.log("Native host disconnected");
        nativePort = null;
        chrome.storage.local.set({ serverStatus: 'stopped' });
        
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        }
    });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_SERVER') {
        if (!nativePort) {
            connectNative();
        }
        
        if (nativePort) {
            try {
                nativePort.postMessage({ command: "start_server" });
                sendResponse({ success: true, message: "Start command sent" });
            } catch (e) {
                sendResponse({ success: false, message: e.message });
            }
        } else {
             sendResponse({ success: false, message: "Failed to connect to native host" });
        }
        return true;
    }

    if (message.type === 'GET_SETTINGS') {
        chrome.storage.local.get(['enabled', 'serverUrl'], (result) => {
            sendResponse(result);
        });
        return true;
    }

    if (message.type === 'SET_SETTINGS') {
        chrome.storage.local.set(message.settings, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// Check server health periodically
async function checkServerHealth() {
    try {
        const response = await fetch('http://localhost:5000/health', {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Export for popup
self.checkServerHealth = checkServerHealth;
