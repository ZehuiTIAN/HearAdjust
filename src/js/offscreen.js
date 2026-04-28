// src/js/offscreen.js

import { createHearAdjustNode, applyGains, EMPATHY_PRESETS } from './audioProcessor.js';

let audioContext = null;
let audioStream = null;
let sourceNode = null;
let processorGraph = null;
let tinnitusOscillator = null;
let tinnitusGainNode = null;

chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'offscreen') return;

    switch (message.type) {
        case 'START_OFFSCREEN_PROCESSING':
            startProcessing(message.streamId);
            break;
        case 'STOP_OFFSCREEN_PROCESSING':
            stopProcessing();
            break;
        case 'APPLY_PRESET':
            applyPreset(message.preset);
            break;
        case 'UPDATE_FILTER_SETTINGS':
            updateSingleBand(message.bandIndex, message.gainValue);
            break;
        default:
            console.warn('Unknown offscreen message:', message.type);
    }
});

async function startProcessing(streamId) {
    if (audioContext) return;

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

        console.log('HearAdjust: audio processing started.');
    } catch (error) {
        console.error('Error starting audio processing:', error);
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }
}

function stopProcessing() {
    if (!audioContext) return;

    stopTinnitus();

    try {
        audioStream.getTracks().forEach(track => track.stop());
        sourceNode.disconnect();
        processorGraph.output.disconnect();
        audioContext.close();
    } catch (error) {
        console.error('Error during stop:', error);
    } finally {
        audioContext = null;
        audioStream = null;
        sourceNode = null;
        processorGraph = null;
        window.close();
    }
}

function applyPreset(presetKey) {
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

function updateSingleBand(bandIndex, gainValue) {
    if (!processorGraph?.filters) return;
    if (bandIndex < 0 || bandIndex >= processorGraph.filters.length) return;
    processorGraph.filters[bandIndex].gain.value = gainValue;
}

function startTinnitus(frequency, linearGain) {
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
    if (!tinnitusOscillator) return;
    try {
        tinnitusOscillator.stop();
        tinnitusOscillator.disconnect();
        tinnitusGainNode.disconnect();
    } catch (_) {}
    tinnitusOscillator = null;
    tinnitusGainNode = null;
}
