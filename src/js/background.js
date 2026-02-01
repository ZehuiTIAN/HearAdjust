// src/js/background.js

// Using an object to store the active state for each tab
const activeTabs = {};

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// Listener for messages from the popup or other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // A simple switch to handle different message types
    switch (message.type) {
        case 'GET_STATE':
            handleGetState(sender.tab.id, sendResponse);
            break;
        case 'START_PROCESSING':
            handleStartProcessing(sender.tab, sendResponse);
            break;
        case 'STOP_PROCESSING':
            handleStopProcessing(sender.tab.id, sendResponse);
            break;
        default:
            console.warn('Unknown message type received:', message.type);
    }
    // Return true to indicate that the response will be sent asynchronously
    return true;
});

// Responds with the current active state for a given tab
function handleGetState(tabId, sendResponse) {
    sendResponse({ isActive: !!activeTabs[tabId] });
}

// Starts the audio capture and processing
async function handleStartProcessing(tab, sendResponse) {
    if (activeTabs[tab.id]) {
        console.warn('Processing is already active for this tab.');
        sendResponse({ isActive: true });
        return;
    }

    // 1. Check for an existing offscreen document
    const hasDocument = await chrome.offscreen.hasDocument();
    if (hasDocument) {
        // In this simple model, we only allow one tab to be processed at a time.
        // A more advanced version could manage multiple offscreen documents or contexts.
        console.warn('An offscreen document is already active. Cannot start another.');
        // Find which tab is active and inform the user/dev
        const activeTabId = Object.keys(activeTabs).find(id => activeTabs[id]);
        if (activeTabId) {
            chrome.tabs.get(parseInt(activeTabId), (activeTab) => {
                console.error(`Audio processing is already running on: ${activeTab.title}`);
            });
        }
        sendResponse({ isActive: false, error: 'Another tab is already being processed.' });
        return;
    }
    
    // 2. Create the offscreen document
    await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Required for processing audio from tab capture.',
    });

    // 3. Get a media stream from the active tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tab.id,
    });

    // 4. Send the stream ID to the offscreen document to start processing
    chrome.runtime.sendMessage({
        type: 'START_OFFSCREEN_PROCESSING',
        target: 'offscreen',
        streamId: streamId,
    });
    
    // 5. Update state and respond to popup
    activeTabs[tab.id] = true;
    sendResponse({ isActive: true });
    broadcastStateChange(tab.id, true);
}

// Stops the audio processing
async function handleStopProcessing(tabId, sendResponse) {
    if (!activeTabs[tabId]) {
        console.warn('Processing is not active for this tab.');
        sendResponse({ isActive: false });
        return;
    }

    // 1. Message the offscreen document to stop its audio work
    chrome.runtime.sendMessage({
        type: 'STOP_OFFSCREEN_PROCESSING',
        target: 'offscreen',
    });

    // 2. The offscreen document will close itself, but we can also force it
    // if it's guaranteed to be tied to this one tab's stream.
    // For this simple model, we close it here.
    if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
    }

    // 3. Update state and respond to popup
    delete activeTabs[tabId];
    sendResponse({ isActive: false });
    broadcastStateChange(tabId, false);
}

// Function to inform the popup about state changes
function broadcastStateChange(tabId, isActive) {
    chrome.tabs.sendMessage(tabId, { type: 'STATE_CHANGED', isActive: isActive })
        .catch(err => console.log(`Could not send state change to tab ${tabId}: ${err.message}`));
}

// Clean up if the tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeTabs[tabId]) {
        handleStopProcessing(tabId, () => {});
    }
});
