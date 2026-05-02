export const MESSAGE_TARGETS = {
    offscreen: 'offscreen',
};

export const MESSAGE_TYPES = {
    getState: 'GET_STATE',
    stateChanged: 'STATE_CHANGED',
    startProcessing: 'START_PROCESSING',
    stopProcessing: 'STOP_PROCESSING',
    startOffscreenProcessing: 'START_OFFSCREEN_PROCESSING',
    stopOffscreenProcessing: 'STOP_OFFSCREEN_PROCESSING',
    applyPreset: 'APPLY_PRESET',
    applyCustomGains: 'APPLY_CUSTOM_GAINS',
    updateFilterSettings: 'UPDATE_FILTER_SETTINGS',
};

export const STORAGE_KEYS = {
    activeProcessingTabId: 'activeProcessingTabId',
    activeProcessingTabMutedBefore: 'activeProcessingTabMutedBefore',
    mode: 'mode',
    uiLanguage: 'uiLanguage',
    empathyPreset: 'empathyPreset',
    empathyCustomGains: 'empathyCustomGains',
    haPreset: 'haPreset',
    eqGains: 'eqGains',
};

export const MODES = {
    empathy: 'empathy',
    hearingAid: 'hearing_aid',
    off: 'off',
};

export const CUSTOM_EMPATHY_PRESET_KEY = 'custom_audiogram';
