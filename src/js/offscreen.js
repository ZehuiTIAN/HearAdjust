// src/js/offscreen.js

import { createHearAdjustNode, applyGains, EMPATHY_PRESETS } from './audioProcessor.js';
import { MESSAGE_TARGETS, MESSAGE_TYPES } from './shared/constants.js';

function log(...args) {
    console.log('[HearAdjust offscreen]', ...args);
}

function logError(...args) {
    console.error('[HearAdjust offscreen]', ...args);
}

let audioContext = null;
let audioStream = null;
let sourceNode = null;
let processorGraph = null;
let tinnitusOscillator = null;
let tinnitusGainNode = null;
let pendingPresetKey = null;
let pendingCustomGains = null;
const pendingBandGains = new Map();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target !== MESSAGE_TARGETS.offscreen) return;

    log('Received message:', message.type, message);

    void (async () => {
        switch (message.type) {
            case MESSAGE_TYPES.startOffscreenProcessing:
                sendResponse(await startProcessing(message.streamId));
                break;
            case MESSAGE_TYPES.stopOffscreenProcessing:
                stopProcessing();
                sendResponse({ ok: true });
                break;
            case MESSAGE_TYPES.applyPreset:
                applyPreset(message.preset);
                sendResponse({ ok: true });
                break;
            case MESSAGE_TYPES.applyCustomGains:
                applyCustomGains(message.gains);
                sendResponse({ ok: true });
                break;
            case MESSAGE_TYPES.updateFilterSettings:
                updateSingleBand(message.bandIndex, message.gainValue);
                sendResponse({ ok: true });
                break;
            default:
                console.warn('Unknown offscreen message:', message.type);
                sendResponse({ ok: false, error: `Unknown offscreen message: ${message.type}` });
        }
    })();

    return true;
});

async function startProcessing(streamId) {
    log('startProcessing called', { streamId });
    if (audioContext) {
        return { ok: true };
    }

    try {
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId,
                },
            },
        });

        audioContext = new AudioContext({ latencyHint: 'interactive' });
        sourceNode = audioContext.createMediaStreamSource(audioStream);
        processorGraph = createHearAdjustNode(audioContext);

        sourceNode.connect(processorGraph.input);
        processorGraph.output.connect(audioContext.destination);
        flushPendingSettings();

        log('Audio processing started successfully');
        return { ok: true };
    } catch (error) {
        logError('Error starting audio processing:', error);
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        if (sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
        }
        processorGraph = null;
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        return { ok: false, error: error?.message || 'Failed to start audio processing' };
    }
}

function flushPendingSettings() {
    if (!processorGraph?.filters) return;

    if (pendingCustomGains !== null) {
        log('Flushing pending custom gains');
        applyCustomGainsToGraph(pendingCustomGains);
        return;
    }

    if (pendingPresetKey !== null) {
        log('Flushing pending preset:', pendingPresetKey);
        applyPresetToGraph(pendingPresetKey);
    }

    if (pendingBandGains.size > 0) {
        for (const [bandIndex, gainValue] of pendingBandGains.entries()) {
            applyBandGainToGraph(bandIndex, gainValue);
        }
    }
}

function stopProcessing() {
    log('stopProcessing called');
    if (!audioContext) return;

    stopTinnitus();

    try {
        audioStream.getTracks().forEach(track => track.stop());
        sourceNode.disconnect();
        processorGraph.output.disconnect();
        audioContext.close();
    } catch (error) {
        logError('Error during stop:', error);
    } finally {
        audioContext = null;
        audioStream = null;
        sourceNode = null;
        processorGraph = null;
        pendingBandGains.clear();
        window.close();
    }
}

function applyPreset(presetKey) {
    log('Applying preset:', presetKey);
    pendingCustomGains = null;
    pendingPresetKey = presetKey ?? 'flat';
    if (!processorGraph?.filters) return;

    applyPresetToGraph(pendingPresetKey);
}

function applyCustomGains(gains) {
    log('Applying custom gains:', gains);
    pendingPresetKey = null;
    pendingCustomGains = Array.isArray(gains) ? [...gains] : null;
    pendingBandGains.clear();
    if (!processorGraph?.filters || !pendingCustomGains) return;

    applyCustomGainsToGraph(pendingCustomGains);
}

function applyPresetToGraph(presetKey) {
    if (!processorGraph?.filters) return;

    stopTinnitus();

    if (!presetKey || presetKey === 'flat') {
        applyGains(processorGraph.filters, [0, 0, 0, 0, 0, 0, 0, 0]);
        return;
    }

    const preset = EMPATHY_PRESETS[presetKey];
    if (!preset) return;

    applyGains(processorGraph.filters, preset.gains);

    if (preset.tinnitus) {
        startTinnitus(preset.tinnitusFreq || 6000, preset.tinnitusGain || 0.04);
    }
}

function applyCustomGainsToGraph(gains) {
    if (!processorGraph?.filters) return;

    stopTinnitus();
    applyGains(processorGraph.filters, gains);
}

function updateSingleBand(bandIndex, gainValue) {
    log('Updating single band:', { bandIndex, gainValue });
    pendingBandGains.set(bandIndex, gainValue);
    if (!processorGraph?.filters) return;

    applyBandGainToGraph(bandIndex, gainValue);
}

function applyBandGainToGraph(bandIndex, gainValue) {
    if (!processorGraph?.filters) return;
    if (bandIndex < 0 || bandIndex >= processorGraph.filters.length) return;
    stopTinnitus();
    processorGraph.filters[bandIndex].gain.value = gainValue;
}

function startTinnitus(frequency, linearGain) {
    log('Starting tinnitus tone:', { frequency, linearGain });
    if (!audioContext) return;

    tinnitusOscillator = audioContext.createOscillator();
    tinnitusGainNode = audioContext.createGain();

    tinnitusOscillator.type = 'sine';
    tinnitusOscillator.frequency.value = frequency;
    tinnitusGainNode.gain.value = linearGain;

    tinnitusOscillator.connect(tinnitusGainNode);
    tinnitusGainNode.connect(audioContext.destination);
    tinnitusOscillator.start();
}

function stopTinnitus() {
    log('Stopping tinnitus tone');
    if (!tinnitusOscillator) return;
    try {
        tinnitusOscillator.stop();
        tinnitusOscillator.disconnect();
        tinnitusGainNode.disconnect();
    } catch (_) {}
    tinnitusOscillator = null;
    tinnitusGainNode = null;
}
