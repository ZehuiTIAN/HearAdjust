// src/js/background.js

import { MESSAGE_TARGETS, MESSAGE_TYPES, STORAGE_KEYS } from './shared/constants.js';

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
let activeSessionCache = null;

function log(...args) {
    console.log('[HearAdjust background]', ...args);
}

function logError(...args) {
    console.error('[HearAdjust background]', ...args);
}

function getStoredActiveTabId() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.activeProcessingTabId], (data) => {
            if (chrome.runtime.lastError) {
                logError('Failed to read active tab from storage:', chrome.runtime.lastError.message);
                resolve(null);
                return;
            }

            resolve(data[STORAGE_KEYS.activeProcessingTabId] ?? null);
        });
    });
}

function setStoredActiveTabId(tabId) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.activeProcessingTabId]: tabId }, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to persist active tab:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

function clearStoredActiveTabId() {
    return new Promise((resolve) => {
        chrome.storage.local.remove(STORAGE_KEYS.activeProcessingTabId, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to clear active tab:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

function getStoredMutedBefore() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.activeProcessingTabMutedBefore], (data) => {
            if (chrome.runtime.lastError) {
                logError('Failed to read prior mute state:', chrome.runtime.lastError.message);
                resolve(null);
                return;
            }

            resolve(data[STORAGE_KEYS.activeProcessingTabMutedBefore] ?? null);
        });
    });
}

function setStoredMutedBefore(mutedBefore) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.activeProcessingTabMutedBefore]: mutedBefore }, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to persist prior mute state:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

function clearStoredMutedBefore() {
    return new Promise((resolve) => {
        chrome.storage.local.remove(STORAGE_KEYS.activeProcessingTabMutedBefore, () => {
            if (chrome.runtime.lastError) {
                logError('Failed to clear prior mute state:', chrome.runtime.lastError.message);
            }
            resolve();
        });
    });
}

async function getActiveSession() {
    if (activeSessionCache?.tabId) {
        return activeSessionCache;
    }

    const [tabId, mutedBefore] = await Promise.all([
        getStoredActiveTabId(),
        getStoredMutedBefore(),
    ]);

    if (tabId === null) {
        activeSessionCache = null;
        return null;
    }

    activeSessionCache = {
        tabId,
        mutedBefore,
    };
    return activeSessionCache;
}

async function persistActiveSession(tabId, mutedBefore) {
    activeSessionCache = { tabId, mutedBefore };
    await Promise.all([
        setStoredActiveTabId(tabId),
        setStoredMutedBefore(mutedBefore),
    ]);
}

async function clearActiveSession() {
    activeSessionCache = null;
    await Promise.all([
        clearStoredActiveTabId(),
        clearStoredMutedBefore(),
    ]);
}

async function setTabMuted(tabId, muted) {
    return chrome.tabs.update(tabId, { muted });
}

function sendMessageToOffscreen(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(response);
        });
    });
}

function broadcastStateChange(isActive, tabId, error) {
    chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.stateChanged,
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
    if (message.target === MESSAGE_TARGETS.offscreen) return;

    log('Received message:', message.type, {
        sender: sender?.url || sender?.id || 'unknown',
        tabId: sender?.tab?.id ?? null,
    });

    switch (message.type) {
        case MESSAGE_TYPES.getState:
            Promise.all([getCurrentTab(), getActiveSession()]).then(([tab, activeSession]) => {
                if (!tab) {
                    sendResponse({ isActive: false });
                    return;
                }

                const isActive = activeSession?.tabId === tab.id;

                log('Resolved GET_STATE:', { currentTabId: tab.id, activeSessionTabId: activeSession?.tabId ?? null, isActive });
                sendResponse({ isActive });
            });
            return true;

        case MESSAGE_TYPES.startProcessing:
            getCurrentTab().then(tab => {
                if (!tab) { sendResponse({ isActive: false, error: 'No active tab' }); return; }
                handleStartProcessing(tab, sendResponse);
            });
            return true;

        case MESSAGE_TYPES.stopProcessing:
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

    const activeSession = await getActiveSession();

    if (activeSession?.tabId === tab.id) {
        log('Tab already active:', tab.id);
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

        const offscreenResponse = await sendMessageToOffscreen({
            type: MESSAGE_TYPES.startOffscreenProcessing,
            target: MESSAGE_TARGETS.offscreen,
            streamId: streamId,
        });
        if (!offscreenResponse?.ok) {
            throw new Error(offscreenResponse?.error || 'Offscreen processor failed to start.');
        }

        if (!wasMuted) {
            await setTabMuted(tab.id, true);
            log('Muted source tab while processing:', tab.id);
        }

        await persistActiveSession(tab.id, wasMuted);
        broadcastStateChange(true, tab.id);
        log('Processing started successfully for tab:', tab.id);
        sendResponse({ isActive: true });
    } catch (error) {
        logError('Error starting processing:', error);
        if (await chrome.offscreen.hasDocument()) {
            await chrome.offscreen.closeDocument();
        }
        broadcastStateChange(false, tab.id, error.message);
        sendResponse({ isActive: false, error: error.message });
    }
}

async function handleStopProcessing(tabId, sendResponse) {
    log('Stopping processing for tab:', tabId);

    const activeSession = await getActiveSession();
    if (activeSession?.tabId !== tabId) {
        log('Tab was not active:', tabId);
        sendResponse({ isActive: false });
        return;
    }

    chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.stopOffscreenProcessing,
        target: MESSAGE_TARGETS.offscreen,
    });

    if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
    }

    if (activeSession.mutedBefore === false) {
        try {
            await setTabMuted(tabId, false);
            log('Restored source tab audio:', tabId);
        } catch (error) {
            log('Skipping audio restore for unavailable tab:', tabId, error?.message || error);
        }
    }

    await clearActiveSession();
    broadcastStateChange(false, tabId);
    log('Processing stopped for tab:', tabId);
    sendResponse({ isActive: false });
}

chrome.tabs.onRemoved.addListener((tabId) => {
    void (async () => {
        const activeSession = await getActiveSession();
        if (activeSession?.tabId !== tabId) {
            return;
        }

        log('Active tab closed, stopping processing:', tabId);
        await handleStopProcessing(tabId, () => {});
    })();
});
