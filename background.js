// AiMaster background service worker

console.log('AiMaster background service worker loaded');

// Install or update event
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('AiMaster installed');
        // Set default configuration
        chrome.storage.local.set({
            apiBaseUrl: 'http://localhost:8000',
            username: 'admin'
        });
    } else if (details.reason === 'update') {
        console.log('AiMaster updated');
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);

    // Handle different message types
    switch (request.action) {
        case 'log':
            console.log('[Content Script]:', request.message);
            sendResponse({ success: true });
            break;

        case 'error':
            console.error('[Content Script Error]:', request.message);
            sendResponse({ success: true });
            break;

        default:
            console.log('Unknown action:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }

    return true; // Keep message channel open for async response
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Page loaded:', tab.url);
    }
});
