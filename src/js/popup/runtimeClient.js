import { MESSAGE_TARGETS, MESSAGE_TYPES } from '../shared/constants.js';

export function getProcessingState() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.getState }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(response);
        });
    });
}

export function requestProcessingState(wantActive) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { type: wantActive ? MESSAGE_TYPES.startProcessing : MESSAGE_TYPES.stopProcessing },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                resolve(response);
            }
        );
    });
}

export function applyEmpathyPreset(preset) {
    chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.applyPreset,
        target: MESSAGE_TARGETS.offscreen,
        preset,
    });
}

export function applyCustomEmpathyGains(gains) {
    chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.applyCustomGains,
        target: MESSAGE_TARGETS.offscreen,
        gains,
    });
}

export function updateFilterBand(bandIndex, gainValue) {
    chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.updateFilterSettings,
        target: MESSAGE_TARGETS.offscreen,
        bandIndex,
        gainValue,
    });
}