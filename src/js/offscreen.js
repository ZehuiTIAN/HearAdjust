// src/js/offscreen.js

import { createHearAdjustNode } from './audioProcessor.js';

// Global variables to hold the audio context and stream
let audioContext;
let audioStream;
let sourceNode;
let processorNode;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'offscreen') {
        return;
    }

    switch (message.type) {
        case 'START_OFFSCREEN_PROCESSING':
            startProcessing(message.streamId);
            break;
        case 'STOP_OFFSCREEN_PROCESSING':
            stopProcessing();
            break;
        default:
            console.warn('Unknown message type received in offscreen document:', message.type);
    }
});

/**
 * Starts the Web Audio API processing.
 * @param {string} streamId The ID of the media stream to capture.
 */
async function startProcessing(streamId) {
    if (audioContext) {
        console.warn('Audio processing is already active.');
        return;
    }

    try {
        // 1. Get the media stream from the tab
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId,
                },
            },
        });

        // 2. Set up the Web Audio API context and nodes
        audioContext = new AudioContext({ latencyHint: 'interactive' });
        sourceNode = audioContext.createMediaStreamSource(audioStream);

        // 3. Create the custom processing node
        // For now, this is a placeholder. It will be expanded with actual logic.
        processorNode = createHearAdjustNode(audioContext);

        // 4. Connect the nodes: source -> processor -> destination (speakers)
        sourceNode.connect(processorNode.input);
        processorNode.output.connect(audioContext.destination);

        console.log('Offscreen audio processing started.');

    } catch (error) {
        console.error('Error starting offscreen audio processing:', error);
        // Clean up on error
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
    }
}

/**
 * Stops the audio processing and cleans up resources.
 */
function stopProcessing() {
    if (!audioContext) {
        console.warn('Audio processing is not active, nothing to stop.');
        return;
    }

    try {
        // 1. Stop all tracks in the stream to release the capture indicator
        audioStream.getTracks().forEach(track => track.stop());

        // 2. Disconnect audio nodes
        sourceNode.disconnect();
        processorNode.output.disconnect();

        // 3. Close the AudioContext
        audioContext.close().then(() => {
            console.log('AudioContext closed successfully.');
        });

    } catch (error) {
        console.error('Error during stopProcessing:', error);
    } finally {
        // 4. Clear global variables and close the offscreen document
        audioStream = null;
        audioContext = null;
        sourceNode = null;
        processorNode = null;
        console.log('Offscreen audio processing stopped and resources released.');
        window.close(); // Important: This closes the offscreen document.
    }
}