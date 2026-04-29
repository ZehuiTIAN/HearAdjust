// src/js/background.js

const activeTabs = {};
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
const ACTIVE_TAB_STORAGE_KEY = 'activeProcessingTabId';
const ACTIVE_TAB_MUTED_BEFORE_KEY = 'activeProcessingTabMutedBefore';

function log(...args) {
    console.log('[HearAdjust background]', ...args);
}

function logError(...args) {
    console.error('[HearAdjust background]', ...args);
}

function getStoredActiveTabId() {
    return new Promise((resolve) => {
        chrome.storage.local.get([ACTIVE_TAB_STORAGE_KEY], (data) => {
            if (chrome.runtime.lastError) {
                logError('Failed to read active tab from storage:', chrome.runtime.lastError.message);
                resolve(null);
                return;
            }

            resolve(data[ACTIVE_TAB_STORAGE_KEY] ?? null);
        });
    });
}

function setStoredActiveTabId(tabId) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [ACTIVE_TAB_STORAGE_KEY]: tabId }, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to persist active tab:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

function clearStoredActiveTabId() {
    return new Promise((resolve) => {
        chrome.storage.local.remove(ACTIVE_TAB_STORAGE_KEY, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to clear active tab:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

function getStoredMutedBefore() {
    return new Promise((resolve) => {
        chrome.storage.local.get([ACTIVE_TAB_MUTED_BEFORE_KEY], (data) => {
            if (chrome.runtime.lastError) {
                logError('Failed to read prior mute state:', chrome.runtime.lastError.message);
                resolve(null);
                return;
            }

            resolve(data[ACTIVE_TAB_MUTED_BEFORE_KEY] ?? null);
        });
    });
}

function setStoredMutedBefore(mutedBefore) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [ACTIVE_TAB_MUTED_BEFORE_KEY]: mutedBefore }, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to persist prior mute state:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

function clearStoredMutedBefore() {
    return new Promise((resolve) => {
        chrome.storage.local.remove(ACTIVE_TAB_MUTED_BEFORE_KEY, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to clear prior mute state:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

async function setTabMuted(tabId, muted) {
    return chrome.tabs.update(tabId, { muted });
}

function broadcastStateChange(isActive, tabId, error) {
    chrome.runtime.sendMessage({
        type: 'STATE_CHANGED',
        isActive,
        tabId,
        error: error || null,
    }, () => {
        if (chrome.runtime.lastError) {
            log('STATE_CHANGED broadcast had no receiver:', chrome.runtime.lastError.message);
        }
    });
}

async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Messages targeting offscreen are handled directly by offscreen.js
    if (message.target === 'offscreen') return;

    log('Received message:', message.type, {
        sender: sender?.url || sender?.id || 'unknown',
        tabId: sender?.tab?.id ?? null,
    });

    switch (message.type) {
        case 'GET_STATE':
            Promise.all([getCurrentTab(), getStoredActiveTabId()]).then(([tab, storedActiveTabId]) => {
                if (!tab) {
                    sendResponse({ isActive: false });
                    return;
                }

                const isActive = !!activeTabs[tab.id] || storedActiveTabId === tab.id;
                if (isActive) {
                    activeTabs[tab.id] = true;
                }

                log('Resolved GET_STATE:', { currentTabId: tab.id, storedActiveTabId, isActive });
                sendResponse({ isActive });
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
    log('Starting processing for tab:', tab.id);

    if (activeTabs[tab.id]) {
        log('Tab already active in memory:', tab.id);
        sendResponse({ isActive: true });
        return;
    }

    const hasDocument = await chrome.offscreen.hasDocument();
    if (hasDocument) {
        const storedActiveTabId = await getStoredActiveTabId();
        log('Offscreen document already exists.', { storedActiveTabId });
        sendResponse({ isActive: false, error: '已有另一个标签页正在处理中。' });
        return;
    }

    try {
        const wasMuted = !!tab.mutedInfo?.muted;

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

        await setStoredMutedBefore(wasMuted);
        if (!wasMuted) {
            await setTabMuted(tab.id, true);
            log('Muted source tab while processing:', tab.id);
        }

        activeTabs[tab.id] = true;
        await setStoredActiveTabId(tab.id);
        broadcastStateChange(true, tab.id);
        log('Processing started successfully for tab:', tab.id);
        sendResponse({ isActive: true });
    } catch (error) {
        logError('Error starting processing:', error);
        broadcastStateChange(false, tab.id, error.message);
        sendResponse({ isActive: false, error: error.message });
    }
}

async function handleStopProcessing(tabId, sendResponse) {
    log('Stopping processing for tab:', tabId);

    if (!activeTabs[tabId]) {
        const storedActiveTabId = await getStoredActiveTabId();
        if (storedActiveTabId !== tabId) {
            log('Tab was not active:', tabId);
            sendResponse({ isActive: false });
            return;
        }

        activeTabs[tabId] = true;
    }

    chrome.runtime.sendMessage({
        type: 'STOP_OFFSCREEN_PROCESSING',
        target: 'offscreen',
    });

    if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
    }

    const mutedBefore = await getStoredMutedBefore();
    if (mutedBefore === false) {
        await setTabMuted(tabId, false);
        log('Restored source tab audio:', tabId);
    }

    delete activeTabs[tabId];
    await clearStoredActiveTabId();
    await clearStoredMutedBefore();
    broadcastStateChange(false, tabId);
    log('Processing stopped for tab:', tabId);
    sendResponse({ isActive: false });
}

chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeTabs[tabId]) {
        log('Active tab closed, stopping processing:', tabId);
        handleStopProcessing(tabId, () => {});
    }
});
