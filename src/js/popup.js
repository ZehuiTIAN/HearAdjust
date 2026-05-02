import { FREQUENCY_BANDS, EMPATHY_PRESETS, HEARING_AID_PRESETS } from './audioProcessor.js';
import {
    CUSTOM_EMPATHY_PRESET_KEY,
    MESSAGE_TYPES,
    MODES,
} from './shared/constants.js';
import {
    applyCustomEmpathyGains,
    applyEmpathyPreset,
    getProcessingState,
    requestProcessingState,
    updateFilterBand,
} from './popup/runtimeClient.js';
import { loadPopupState, savePopupState } from './popup/storage.js';

function log(...args) {
    console.log('[HearAdjust popup]', ...args);
}

function logError(...args) {
    console.error('[HearAdjust popup]', ...args);
}

const UI_STRINGS = {
    zh: {
        htmlLang: 'zh',
        subtitle: 'Listen Through Another Threshold',
        intro: '左侧进入共情体验，中间关闭，右侧切到助听调节。',
        modeSwitchAria: '模式开关',
        langSwitchAria: '语言切换',
        switchEmpathy: '共情',
        switchOff: '关闭',
        switchHearingAid: '助听',
        legendLeft: '左',
        legendCenter: '中',
        legendRight: '右',
        inactiveHint: '未激活 — 将拨杆停在左右任一侧开始',
        statusQueryFailed: '状态查询失败，请查看扩展日志',
        switchFailed: '切换失败，请查看扩展日志',
        startFailed: '启动失败：{error}',
        empathyActive: '共情体验模式已激活',
        hearingAidActive: '助听调节模式已激活',
        empathySimulating: '模拟中：{name}',
        empathyIntro: '选择一种听力状况，感受他们所感知的声音世界。',
        offIntro: 'HearAdjust 在关闭状态下不会改变任何声音。你可以先了解两个模式，再把拨杆切到左或右开始体验。',
        offEmpathyTitle: '共情体验',
        offEmpathyText: '模拟不同类型的听力损失，让身边的人短暂听见你或他人实际听到的世界。',
        offHearingTitle: '助听调节',
        offHearingText: '按频段提升或削减声音，用于根据听力图做个性化补偿，帮助听清语音细节。',
        empathyCustomTitle: '我的听力图',
        empathyCustomCaption: '把你的听力损失填进来，让别人听到你听到的世界',
        empathyPresetCaption: '调整任一频段后，将自动切换为自定义听力图。',
        hearingIntro: '根据您的听力图调整各频段增益，提升语音清晰度。',
        footer: '一个关于倾听与关怀的项目',
        customPresetName: '自定义听力图',
        customPresetDescription: '根据你自己的听力图填写各频段损失，让身边的人直接听到你日常听到的声音。建议使用负值来模拟不同频段的衰减。',
        ha_flat: '平坦（重置）',
        ha_speech: '语音清晰',
        ha_boost_highs: '高频增强',
        ha_boost_lows: '低频增强',
    },
    en: {
        htmlLang: 'en',
        subtitle: 'Listen Through Another Threshold',
        intro: 'Left for empathy, center for off, right for hearing aid.',
        modeSwitchAria: 'Mode switch',
        langSwitchAria: 'Language switch',
        switchEmpathy: 'Empathy',
        switchOff: 'Off',
        switchHearingAid: 'Hearing Aid',
        legendLeft: 'Left',
        legendCenter: 'Center',
        legendRight: 'Right',
        inactiveHint: 'Inactive — move the switch left or right to begin',
        statusQueryFailed: 'State lookup failed. Check extension logs.',
        switchFailed: 'Switch failed. Check extension logs.',
        startFailed: 'Start failed: {error}',
        empathyActive: 'Empathy mode active',
        hearingAidActive: 'Hearing aid mode active',
        empathySimulating: 'Simulating: {name}',
        empathyIntro: 'Choose a hearing condition and hear the world through that profile.',
        offIntro: 'HearAdjust does not alter any sound while it is off. Read the two modes first, then move the switch left or right when you are ready.',
        offEmpathyTitle: 'Empathy Mode',
        offEmpathyText: 'Simulate different kinds of hearing loss so people around you can briefly hear the world the way you or someone else actually hears it.',
        offHearingTitle: 'Hearing Aid Mode',
        offHearingText: 'Boost or reduce each band to match an audiogram and compensate for loss, making speech details easier to catch.',
        empathyCustomTitle: 'My Audiogram',
        empathyCustomCaption: 'Enter your own hearing loss curve so other people can hear what you hear.',
        empathyPresetCaption: 'Adjust any band to switch this preset into a custom audiogram.',
        hearingIntro: 'Adjust each band to match your audiogram and improve speech clarity.',
        footer: 'A small project about listening and care',
        customPresetName: 'Custom Audiogram',
        customPresetDescription: 'Enter your own hearing-loss curve by band so people around you can hear your everyday listening reality. Use negative values to model loss at each frequency.',
        ha_flat: 'Flat Reset',
        ha_speech: 'Speech Focus',
        ha_boost_highs: 'Treble Boost',
        ha_boost_lows: 'Bass Boost',
    },
};

const modeSwitch = document.getElementById('modeSwitch');
const langSwitch = document.getElementById('langSwitch');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const appSubtitle = document.getElementById('appSubtitle');
const appIntro = document.getElementById('appIntro');
const switchLegendLeft = document.getElementById('switchLegendLeft');
const switchLegendCenter = document.getElementById('switchLegendCenter');
const switchLegendRight = document.getElementById('switchLegendRight');
const offIntro = document.getElementById('offIntro');
const offEmpathyTitle = document.getElementById('offEmpathyTitle');
const offEmpathyText = document.getElementById('offEmpathyText');
const offHearingTitle = document.getElementById('offHearingTitle');
const offHearingText = document.getElementById('offHearingText');
const empathyIntro = document.getElementById('empathyIntro');
const hearingIntro = document.getElementById('hearingIntro');
const empathyCustomTitle = document.getElementById('empathyCustomTitle');
const empathyCustomCaption = document.getElementById('empathyCustomCaption');
const appFooter = document.getElementById('appFooter');
const presetList = document.getElementById('presetList');
const presetDescription = document.getElementById('presetDescription');
const presetDescText = document.getElementById('presetDescText');
const empathyCustomEditor = document.getElementById('empathyCustomEditor');
const empathyEqualizerControls = document.getElementById('empathyEqualizerControls');
const haQuickPresets = document.getElementById('haQuickPresets');
const equalizerControls = document.getElementById('equalizerControls');
const panelOff = document.getElementById('panel-off');
const panelEmpathy = document.getElementById('panel-empathy');
const panelHearingAid = document.getElementById('panel-hearing-aid');
const switchOptions = Array.from(document.querySelectorAll('.switch-option'));
const langOptions = Array.from(document.querySelectorAll('.lang-option'));

const state = {
    isActive: false,
    currentMode: MODES.empathy,
    currentLanguage: 'zh',
    selectedEmpathyPreset: null,
    selectedHaPreset: 'flat',
    eqGains: new Array(FREQUENCY_BANDS.length).fill(0),
    empathyCustomGains: new Array(FREQUENCY_BANDS.length).fill(0),
};
const EMPATHY_LOSS_MIN_DB = -110;

const PRESET_ICONS = {
    mild: '🔉',
    moderate: '🔈',
    severe: '🔇',
    presbycusis: '🧓',
    nihl: '🎧',
    tinnitus: '🔔',
    low_frequency: '🎶',
    author: '🧑‍💻',
    [CUSTOM_EMPATHY_PRESET_KEY]: '🫱',
};

async function init() {
    log('Initializing popup');
    await loadSavedState();
    buildEmpathyPresets();
    buildEmpathyCustomEqualizer();
    buildHaQuickPresets();
    buildEqualizer();
    applyModeTab(state.currentMode);
    applyLanguage();

    if (state.selectedEmpathyPreset) {
        setSelectedPreset(state.selectedEmpathyPreset);
    }

    restoreEmpathyCustomSliders();
    restoreHaPreset(state.selectedHaPreset);
    restoreEqSliders();
    syncModeSwitchUi();
    syncLanguageSwitchUi();

    try {
        const response = await getProcessingState();
        log('GET_STATE response:', response);
        setActiveState(response?.isActive ?? false, false);
    } catch (error) {
        logError('GET_STATE failed:', error.message);
        statusText.textContent = t('statusQueryFailed');
    }
}

async function loadSavedState() {
    const savedState = await loadPopupState();
    if (savedState.mode) state.currentMode = savedState.mode;
    if (savedState.uiLanguage) state.currentLanguage = savedState.uiLanguage;
    if (savedState.empathyPreset) state.selectedEmpathyPreset = savedState.empathyPreset;
    if (savedState.empathyCustomGains) state.empathyCustomGains = savedState.empathyCustomGains;
    if (savedState.haPreset) state.selectedHaPreset = savedState.haPreset;
    if (savedState.eqGains) state.eqGains = savedState.eqGains;
}

function saveState() {
    log('Saving popup state:', {
        currentMode: state.currentMode,
        currentLanguage: state.currentLanguage,
        selectedEmpathyPreset: state.selectedEmpathyPreset,
        empathyCustomGains: state.empathyCustomGains,
        selectedHaPreset: state.selectedHaPreset,
        eqGains: state.eqGains,
    });

    savePopupState({
        mode: state.currentMode,
        uiLanguage: state.currentLanguage,
        empathyPreset: state.selectedEmpathyPreset,
        empathyCustomGains: state.empathyCustomGains,
        haPreset: state.selectedHaPreset,
        eqGains: state.eqGains,
    });
}

function t(key, vars = {}) {
    const template = UI_STRINGS[state.currentLanguage]?.[key] ?? UI_STRINGS.zh[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

function getEmpathyPresetMeta(key) {
    if (key === CUSTOM_EMPATHY_PRESET_KEY) {
        return {
            name: UI_STRINGS.zh.customPresetName,
            nameEn: UI_STRINGS.en.customPresetName,
            description: UI_STRINGS.zh.customPresetDescription,
            descriptionEn: UI_STRINGS.en.customPresetDescription,
        };
    }

    return EMPATHY_PRESETS[key] ?? null;
}

function getLocalizedEmpathyName(key) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    return state.currentLanguage === 'en' ? (preset.nameEn || preset.name) : preset.name;
}

function getSecondaryEmpathyName(key) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    return state.currentLanguage === 'en' ? preset.name : (preset.nameEn || preset.name);
}

function getLocalizedEmpathyDescription(key) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    if (key === CUSTOM_EMPATHY_PRESET_KEY) {
        return state.currentLanguage === 'en' ? preset.descriptionEn : preset.description;
    }
    return state.currentLanguage === 'en' ? (preset.descriptionEn || preset.description) : preset.description;
}

function getHearingAidPresetName(key) {
    const preset = HEARING_AID_PRESETS[key];
    if (!preset) return key;
    return state.currentLanguage === 'en' ? (preset.nameEn || preset.name) : preset.name;
}

function applyLanguage() {
    document.documentElement.lang = UI_STRINGS[state.currentLanguage].htmlLang;
    modeSwitch.setAttribute('aria-label', t('modeSwitchAria'));
    langSwitch.setAttribute('aria-label', t('langSwitchAria'));
    appSubtitle.textContent = t('subtitle');
    appIntro.textContent = t('intro');
    switchOptions.find((option) => option.dataset.switchState === MODES.empathy).textContent = t('switchEmpathy');
    switchOptions.find((option) => option.dataset.switchState === MODES.off).textContent = t('switchOff');
    switchOptions.find((option) => option.dataset.switchState === MODES.hearingAid).textContent = t('switchHearingAid');
    switchLegendLeft.textContent = t('legendLeft');
    switchLegendCenter.textContent = t('legendCenter');
    switchLegendRight.textContent = t('legendRight');
    offIntro.textContent = t('offIntro');
    offEmpathyTitle.textContent = t('offEmpathyTitle');
    offEmpathyText.textContent = t('offEmpathyText');
    offHearingTitle.textContent = t('offHearingTitle');
    offHearingText.textContent = t('offHearingText');
    empathyIntro.textContent = t('empathyIntro');
    hearingIntro.textContent = t('hearingIntro');
    empathyCustomTitle.textContent = t('empathyCustomTitle');
    empathyCustomCaption.textContent = t('empathyCustomCaption');
    appFooter.textContent = t('footer');

    buildEmpathyPresets();
    buildHaQuickPresets();
    if (state.selectedEmpathyPreset) {
        setSelectedPreset(state.selectedEmpathyPreset);
    }
    restoreHaPreset(state.selectedHaPreset);
    syncLanguageSwitchUi();
    setActiveState(state.isActive, false);
}

function syncLanguageSwitchUi() {
    langOptions.forEach((option) => {
        const selected = option.dataset.lang === state.currentLanguage;
        option.classList.toggle('active', selected);
        option.setAttribute('aria-pressed', String(selected));
    });
}

langOptions.forEach((option) => {
    option.addEventListener('click', () => {
        const lang = option.dataset.lang;
        if (lang === state.currentLanguage) return;
        state.currentLanguage = lang;
        saveState();
        applyLanguage();
    });
});

function setActiveState(active, sendToOffscreen = true) {
    log('Updating active state:', {
        active,
        sendToOffscreen,
        currentMode: state.currentMode,
        currentLanguage: state.currentLanguage,
        selectedEmpathyPreset: state.selectedEmpathyPreset,
    });
    state.isActive = active;
    syncModeSwitchUi();
    updatePanelVisibility();
    statusDot.classList.toggle('active', active);

    if (active) {
        updateStatusText();
        if (sendToOffscreen) {
            applyCurrentSettings();
        }
    } else {
        statusText.textContent = t('inactiveHint');
    }
}

function getSwitchState() {
    return state.isActive ? state.currentMode : MODES.off;
}

function syncModeSwitchUi() {
    const state = getSwitchState();
    modeSwitch.dataset.state = state;
    switchOptions.forEach((option) => {
        const isSelected = option.dataset.switchState === state;
        option.classList.toggle('active', isSelected);
        option.setAttribute('aria-pressed', String(isSelected));
    });
}

function setSwitchDisabled(disabled) {
    switchOptions.forEach((option) => {
        option.disabled = disabled;
    });
}

async function requestProcessing(wantActive) {
    setSwitchDisabled(true);
    log('Request processing state:', { wantActive, currentMode: state.currentMode });

    try {
        const response = await requestProcessingState(wantActive);
        log('Mode switch response:', response);
        if (response?.error) {
            statusText.textContent = t('startFailed', { error: response.error });
        }

        setActiveState(response?.isActive ?? false);
    } catch (error) {
        logError('Mode switch request failed:', error.message);
        statusText.textContent = t('switchFailed');
        syncModeSwitchUi();
    } finally {
        setSwitchDisabled(false);
    }
}

function selectMode(mode) {
    if (mode !== MODES.empathy && mode !== MODES.hearingAid) return;

    const modeChanged = state.currentMode !== mode;
    state.currentMode = mode;
    applyModeTab(mode);
    saveState();

    if (state.isActive) {
        if (modeChanged) {
            applyCurrentSettings();
        }
        updateStatusText();
    }

    syncModeSwitchUi();
}

switchOptions.forEach((option) => {
    option.addEventListener('click', () => {
        const targetState = option.dataset.switchState;
        log('Tri-state switch clicked:', {
            targetState,
            isActive: state.isActive,
            currentMode: state.currentMode,
        });

        if (targetState === MODES.off) {
            if (!state.isActive) {
                syncModeSwitchUi();
                return;
            }

            requestProcessing(false);
            return;
        }

        selectMode(targetState);
        if (!state.isActive) {
            requestProcessing(true);
        }
    });
});

function applyCurrentSettings() {
    if (!state.isActive) return;

    log('Applying current settings:', {
        currentMode: state.currentMode,
        selectedEmpathyPreset: state.selectedEmpathyPreset,
        empathyCustomGains: state.empathyCustomGains,
        selectedHaPreset: state.selectedHaPreset,
        eqGains: state.eqGains,
    });

    if (state.currentMode === MODES.empathy) {
        if (state.selectedEmpathyPreset === CUSTOM_EMPATHY_PRESET_KEY) {
            applyCustomEmpathyGains(state.empathyCustomGains);
        } else {
            applyEmpathyPreset(state.selectedEmpathyPreset);
        }
    } else {
        state.eqGains.forEach((gain, index) => {
            updateFilterBand(index, gain);
        });
    }
}

function applyModeTab(mode) {
    state.currentMode = mode;
    updatePanelVisibility();
}

function updatePanelVisibility() {
    const showOff = !state.isActive;
    panelOff.classList.toggle('hidden', !showOff);
    panelEmpathy.classList.toggle('hidden', showOff || state.currentMode !== MODES.empathy);
    panelHearingAid.classList.toggle('hidden', showOff || state.currentMode !== MODES.hearingAid);
}

function updateStatusText() {
    if (!state.isActive) return;

    if (state.currentMode === MODES.empathy && state.selectedEmpathyPreset) {
        statusText.textContent = t('empathySimulating', { name: getLocalizedEmpathyName(state.selectedEmpathyPreset) });
    } else if (state.currentMode === MODES.empathy) {
        statusText.textContent = t('empathyActive');
    } else {
        statusText.textContent = t('hearingAidActive');
    }
}

function buildEmpathyPresets() {
    presetList.innerHTML = '';
    const presetKeys = [...Object.keys(EMPATHY_PRESETS), CUSTOM_EMPATHY_PRESET_KEY];

    presetKeys.forEach((key) => {
        const preset = getEmpathyPresetMeta(key);
        const item = document.createElement('button');
        item.className = 'preset-item';
        item.dataset.key = key;

        const icon = document.createElement('span');
        icon.className = 'preset-item-icon';
        icon.textContent = PRESET_ICONS[key] || '👂';

        const body = document.createElement('div');
        body.className = 'preset-item-body';

        const name = document.createElement('div');
        name.className = 'preset-item-name';
        name.textContent = getLocalizedEmpathyName(key);

        const secondary = document.createElement('div');
        secondary.className = 'preset-item-name-en';
        secondary.textContent = getSecondaryEmpathyName(key);

        body.appendChild(name);
        body.appendChild(secondary);
        item.appendChild(icon);
        item.appendChild(body);

        if (preset?.severity) {
            item.appendChild(buildSeverityDots(preset.severity));
        }

        item.addEventListener('click', () => onPresetSelected(key));
        presetList.appendChild(item);
    });
}

function getEmpathyGainsForKey(key) {
    if (key === CUSTOM_EMPATHY_PRESET_KEY) {
        return state.empathyCustomGains;
    }

    return EMPATHY_PRESETS[key]?.gains ?? new Array(FREQUENCY_BANDS.length).fill(0);
}

function getDisplayedEmpathyGains() {
    return getEmpathyGainsForKey(state.selectedEmpathyPreset);
}

function buildSeverityDots(level) {
    const container = document.createElement('div');
    container.className = 'preset-severity';
    for (let index = 1; index <= 3; index += 1) {
        const dot = document.createElement('span');
        dot.className = `severity-dot${index <= level ? ' filled' : ''}`;
        container.appendChild(dot);
    }
    return container;
}

function onPresetSelected(key) {
    state.selectedEmpathyPreset = key;
    setSelectedPreset(key);
    saveState();
    applyCurrentSettings();
    updateStatusText();
}

function setSelectedPreset(key) {
    presetList.querySelectorAll('.preset-item').forEach((item) => {
        item.classList.toggle('selected', item.dataset.key === key);
    });

    if (key) {
        presetDescText.textContent = getLocalizedEmpathyDescription(key);
        presetDescription.classList.remove('hidden');
    }

    syncEmpathyEditor(key);
}

function syncEmpathyEditor(key) {
    empathyCustomEditor.classList.toggle('hidden', !key);
    if (!key) return;

    empathyCustomTitle.textContent = getLocalizedEmpathyName(key);
    empathyCustomCaption.textContent = key === CUSTOM_EMPATHY_PRESET_KEY ? t('empathyCustomCaption') : t('empathyPresetCaption');
    restoreEmpathyCustomSliders();
}

function buildEmpathyCustomEqualizer() {
    empathyEqualizerControls.innerHTML = '';
    FREQUENCY_BANDS.forEach((freq, index) => {
        const band = document.createElement('div');
        band.className = 'eq-band';

        const freqLabel = document.createElement('span');
        freqLabel.className = 'eq-freq-label';
        freqLabel.textContent = formatFrequencyLabel(freq);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'eq-slider empathy-slider';
        slider.min = EMPATHY_LOSS_MIN_DB;
        slider.max = 0;
        slider.step = 1;
        slider.value = state.empathyCustomGains[index] ?? 0;
        slider.dataset.index = index;

        const gainLabel = document.createElement('span');
        gainLabel.className = 'eq-gain-label';
        gainLabel.textContent = formatGain(slider.value);

        slider.addEventListener('input', (event) => {
            const gain = parseFloat(event.target.value);
            if (state.selectedEmpathyPreset !== CUSTOM_EMPATHY_PRESET_KEY) {
                state.empathyCustomGains = [...getDisplayedEmpathyGains()];
                state.selectedEmpathyPreset = CUSTOM_EMPATHY_PRESET_KEY;
            }
            state.empathyCustomGains[index] = gain;
            gainLabel.textContent = formatGain(gain);
            setSelectedPreset(CUSTOM_EMPATHY_PRESET_KEY);
            saveState();

            if (state.currentMode === MODES.empathy && state.isActive) {
                applyCurrentSettings();
                updateStatusText();
            }
        });

        band.appendChild(freqLabel);
        band.appendChild(slider);
        band.appendChild(gainLabel);
        empathyEqualizerControls.appendChild(band);
    });
}

function restoreEmpathyCustomSliders() {
    const gains = getDisplayedEmpathyGains();
    empathyEqualizerControls.querySelectorAll('.eq-slider').forEach((slider, index) => {
        slider.value = gains[index] ?? 0;
        slider.nextElementSibling.textContent = formatGain(gains[index] ?? 0);
    });
}

function buildHaQuickPresets() {
    haQuickPresets.innerHTML = '';
    Object.keys(HEARING_AID_PRESETS).forEach((key) => {
        const button = document.createElement('button');
        button.className = 'ha-preset-btn';
        button.dataset.key = key;
        button.textContent = getHearingAidPresetName(key);
        button.addEventListener('click', () => onHaPresetSelected(key));
        haQuickPresets.appendChild(button);
    });
}

function onHaPresetSelected(key) {
    state.selectedHaPreset = key;
    state.eqGains = [...HEARING_AID_PRESETS[key].gains];
    restoreHaPreset(key);
    restoreEqSliders();
    saveState();
    applyCurrentSettings();
}

function restoreHaPreset(key) {
    haQuickPresets.querySelectorAll('.ha-preset-btn').forEach((button) => {
        button.classList.toggle('selected', button.dataset.key === key);
    });
}

function buildEqualizer() {
    equalizerControls.innerHTML = '';
    FREQUENCY_BANDS.forEach((freq, index) => {
        const band = document.createElement('div');
        band.className = 'eq-band';

        const freqLabel = document.createElement('span');
        freqLabel.className = 'eq-freq-label';
        freqLabel.textContent = formatFrequencyLabel(freq);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'eq-slider';
        slider.min = -40;
        slider.max = 40;
        slider.step = 1;
        slider.value = state.eqGains[index] ?? 0;
        slider.dataset.index = index;

        const gainLabel = document.createElement('span');
        gainLabel.className = 'eq-gain-label';
        gainLabel.textContent = formatGain(slider.value);

        slider.addEventListener('input', (event) => {
            const gain = parseFloat(event.target.value);
            state.eqGains[index] = gain;
            gainLabel.textContent = formatGain(gain);
            state.selectedHaPreset = null;
            restoreHaPreset(null);
            saveState();

            if (state.isActive) {
                updateFilterBand(index, gain);
            }
        });

        band.appendChild(freqLabel);
        band.appendChild(slider);
        band.appendChild(gainLabel);
        equalizerControls.appendChild(band);
    });
}

function restoreEqSliders() {
    equalizerControls.querySelectorAll('.eq-slider').forEach((slider, index) => {
        slider.value = state.eqGains[index] ?? 0;
        slider.nextElementSibling.textContent = formatGain(state.eqGains[index] ?? 0);
    });
}

function formatFrequencyLabel(freq) {
    return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
}

function formatGain(value) {
    const numeric = parseFloat(value);
    return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(0)}dB`;
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.stateChanged) {
        log('Received STATE_CHANGED:', message);
        if (message.error && !message.isActive) {
            statusText.textContent = t('startFailed', { error: message.error });
        }
        setActiveState(message.isActive, false);
    }
});

init();