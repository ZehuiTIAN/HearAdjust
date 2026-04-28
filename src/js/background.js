// src/js/background.js

const activeTabs = {};
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Messages targeting offscreen are handled directly by offscreen.js
    if (message.target === 'offscreen') return;

    switch (message.type) {
        case 'GET_STATE':
            getCurrentTab().then(tab => {
                if (!tab) { sendResponse({ isActive: false }); return; }
                sendResponse({ isActive: !!activeTabs[tab.id] });
            });
            return true;

        case 'START_PROCESSING':
            getCurrentTab().then(tab => {
                if (!tab) { sendResponse({ isActive: false, error: 'No active tab' }); return; }
                handleStartProcessing(tab, sendResponse);
            });
            return true;

        case 'STOP_PROCESSING':
            getCurrentTab().then(tab => {
                if (!tab) { sendResponse({ isActive: false }); return; }
                handleStopProcessing(tab.id, sendResponse);
            });
            return true;

        default:
            return false;
    }
});

async function handleStartProcessing(tab, sendResponse) {
    if (activeTabs[tab.id]) {
        sendResponse({ isActive: true });
        return;
    }

    const hasDocument = await chrome.offscreen.hasDocument();
    if (hasDocument) {
        sendResponse({ isActive: false, error: '已有另一个标签页正在处理中。' });
        return;
    }

    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: [chrome.offscreen.Reason.USER_MEDIA],
            justification: 'Required for processing audio from tab capture.',
        });

        const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tab.id,
        });

        chrome.runtime.sendMessage({
            type: 'START_OFFSCREEN_PROCESSING',
            target: 'offscreen',
            streamId: streamId,
        });

        activeTabs[tab.id] = true;
        sendResponse({ isActive: true });
    } catch (error) {
        console.error('Error starting processing:', error);
        sendResponse({ isActive: false, error: error.message });
    }
}

async function handleStopProcessing(tabId, sendResponse) {
    if (!activeTabs[tabId]) {
        sendResponse({ isActive: false });
        return;
    }

    chrome.runtime.sendMessage({
        type: 'STOP_OFFSCREEN_PROCESSING',
        target: 'offscreen',
    });

    if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
    }

    delete activeTabs[tabId];
    sendResponse({ isActive: false });
}

chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeTabs[tabId]) {
        handleStopProcessing(tabId, () => {});
    }
});
