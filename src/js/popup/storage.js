import { STORAGE_KEYS } from '../shared/constants.js';

const POPUP_STATE_KEYS = [
    STORAGE_KEYS.mode,
    STORAGE_KEYS.uiLanguage,
    STORAGE_KEYS.empathyPreset,
    STORAGE_KEYS.empathyCustomGains,
    STORAGE_KEYS.haPreset,
    STORAGE_KEYS.eqGains,
];

export function loadPopupState() {
    return new Promise((resolve) => {
        chrome.storage.local.get(POPUP_STATE_KEYS, (data) => {
            resolve({
                mode: data[STORAGE_KEYS.mode],
                uiLanguage: data[STORAGE_KEYS.uiLanguage],
                empathyPreset: data[STORAGE_KEYS.empathyPreset],
                empathyCustomGains: data[STORAGE_KEYS.empathyCustomGains],
                haPreset: data[STORAGE_KEYS.haPreset],
                eqGains: data[STORAGE_KEYS.eqGains],
            });
        });
    });
}

export function savePopupState(state) {
    chrome.storage.local.set({
        [STORAGE_KEYS.mode]: state.mode,
        [STORAGE_KEYS.uiLanguage]: state.uiLanguage,
        [STORAGE_KEYS.empathyPreset]: state.empathyPreset,
        [STORAGE_KEYS.empathyCustomGains]: state.empathyCustomGains,
        [STORAGE_KEYS.haPreset]: state.haPreset,
        [STORAGE_KEYS.eqGains]: state.eqGains,
    });
}