import { FREQUENCY_BANDS, EMPATHY_PRESETS, HEARING_AID_PRESETS } from './audioProcessor.js';

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

const EMPATHY_DESCRIPTION_EN = {
    mild: 'High-frequency details become harder to distinguish in noisy spaces. Quiet everyday conversation is still mostly clear, but it takes more focus. This is one of the most common forms of hearing loss.',
    moderate: 'Speech becomes difficult to understand even in quiet rooms, and hearing aids are often needed. Many consonants such as s, f, and th nearly disappear, so conversation requires frequent repetition.',
    severe: 'Only very loud sounds remain perceptible. Speech understanding becomes extremely difficult, daily communication leans heavily on visual cues and lip reading, and much of music feels closed off.',
    presbycusis: 'A gradual age-related loss of high frequencies, common in adults over 65. Background noise becomes harder to filter out and conversation takes increasing effort.',
    nihl: 'Long-term exposure to loud noise, from factories, concerts, or headphones, often creates a characteristic notch around 4 kHz. Once present, this damage is usually permanent.',
    tinnitus: 'A continuous internal ringing, buzzing, or whistling that stays present even in complete silence. Roughly fifteen percent of people worldwide experience some form of it.',
    low_frequency: 'A rarer pattern where low sounds such as thunder, deep voices, and engines are strongly reduced while higher frequencies remain relatively clear.',
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

let isActive = false;
let currentMode = 'empathy';
let currentLanguage = 'zh';
let selectedEmpathyPreset = null;
let selectedHaPreset = 'flat';
let eqGains = new Array(FREQUENCY_BANDS.length).fill(0);
let empathyCustomGains = new Array(FREQUENCY_BANDS.length).fill(0);

const CUSTOM_EMPATHY_PRESET_KEY = 'custom_audiogram';
const EMPATHY_LOSS_MIN_DB = -110;

const PRESET_ICONS = {
    mild: '🔉',
    moderate: '🔈',
    severe: '🔇',
    presbycusis: '🧓',
    nihl: '🎧',
    tinnitus: '🔔',
    low_frequency: '🎶',
    [CUSTOM_EMPATHY_PRESET_KEY]: '🫱',
};

async function init() {
    log('Initializing popup');
    await loadSavedState();
    buildEmpathyPresets();
    buildEmpathyCustomEqualizer();
    buildHaQuickPresets();
    buildEqualizer();
    applyModeTab(currentMode);
    applyLanguage();

    if (selectedEmpathyPreset) {
        setSelectedPreset(selectedEmpathyPreset);
    }

    restoreEmpathyCustomSliders();
    restoreHaPreset(selectedHaPreset);
    restoreEqSliders();
    syncModeSwitchUi();
    syncLanguageSwitchUi();

    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
        if (chrome.runtime.lastError) {
            logError('GET_STATE failed:', chrome.runtime.lastError.message);
            statusText.textContent = t('statusQueryFailed');
            return;
        }

        log('GET_STATE response:', resp);
        setActiveState(resp?.isActive ?? false, false);
    });
}

async function loadSavedState() {
    return new Promise((resolve) => {
        chrome.storage.local.get(
            ['mode', 'uiLanguage', 'empathyPreset', 'empathyCustomGains', 'haPreset', 'eqGains'],
            (data) => {
                if (data.mode) currentMode = data.mode;
                if (data.uiLanguage) currentLanguage = data.uiLanguage;
                if (data.empathyPreset) selectedEmpathyPreset = data.empathyPreset;
                if (data.empathyCustomGains) empathyCustomGains = data.empathyCustomGains;
                if (data.haPreset) selectedHaPreset = data.haPreset;
                if (data.eqGains) eqGains = data.eqGains;
                resolve();
            }
        );
    });
}

function saveState() {
    log('Saving popup state:', {
        currentMode,
        currentLanguage,
        selectedEmpathyPreset,
        empathyCustomGains,
        selectedHaPreset,
        eqGains,
    });

    chrome.storage.local.set({
        mode: currentMode,
        uiLanguage: currentLanguage,
        empathyPreset: selectedEmpathyPreset,
        empathyCustomGains,
        haPreset: selectedHaPreset,
        eqGains,
    });
}

function t(key, vars = {}) {
    const template = UI_STRINGS[currentLanguage]?.[key] ?? UI_STRINGS.zh[key] ?? key;
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
    return currentLanguage === 'en' ? (preset.nameEn || preset.name) : preset.name;
}

function getSecondaryEmpathyName(key) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    return currentLanguage === 'en' ? preset.name : (preset.nameEn || preset.name);
}

function getLocalizedEmpathyDescription(key) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    if (key === CUSTOM_EMPATHY_PRESET_KEY) {
        return currentLanguage === 'en' ? preset.descriptionEn : preset.description;
    }
    return currentLanguage === 'en' ? (EMPATHY_DESCRIPTION_EN[key] || preset.description) : preset.description;
}

function getHearingAidPresetName(key) {
    return t(`ha_${key}`);
}

function applyLanguage() {
    document.documentElement.lang = UI_STRINGS[currentLanguage].htmlLang;
    modeSwitch.setAttribute('aria-label', t('modeSwitchAria'));
    langSwitch.setAttribute('aria-label', t('langSwitchAria'));
    appSubtitle.textContent = t('subtitle');
    appIntro.textContent = t('intro');
    switchOptions.find((option) => option.dataset.switchState === 'empathy').textContent = t('switchEmpathy');
    switchOptions.find((option) => option.dataset.switchState === 'off').textContent = t('switchOff');
    switchOptions.find((option) => option.dataset.switchState === 'hearing_aid').textContent = t('switchHearingAid');
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
    if (selectedEmpathyPreset) {
        setSelectedPreset(selectedEmpathyPreset);
    }
    restoreHaPreset(selectedHaPreset);
    syncLanguageSwitchUi();
    setActiveState(isActive, false);
}

function syncLanguageSwitchUi() {
    langOptions.forEach((option) => {
        const selected = option.dataset.lang === currentLanguage;
        option.classList.toggle('active', selected);
        option.setAttribute('aria-pressed', String(selected));
    });
}

langOptions.forEach((option) => {
    option.addEventListener('click', () => {
        const lang = option.dataset.lang;
        if (lang === currentLanguage) return;
        currentLanguage = lang;
        saveState();
        applyLanguage();
    });
});

function setActiveState(active, sendToOffscreen = true) {
    log('Updating active state:', { active, sendToOffscreen, currentMode, currentLanguage, selectedEmpathyPreset });
    isActive = active;
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
    return isActive ? currentMode : 'off';
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

function requestProcessing(wantActive) {
    setSwitchDisabled(true);
    log('Request processing state:', { wantActive, currentMode });

    chrome.runtime.sendMessage(
        { type: wantActive ? 'START_PROCESSING' : 'STOP_PROCESSING' },
        (resp) => {
            setSwitchDisabled(false);
            if (chrome.runtime.lastError) {
                logError('Mode switch request failed:', chrome.runtime.lastError.message);
                statusText.textContent = t('switchFailed');
                syncModeSwitchUi();
                return;
            }

            log('Mode switch response:', resp);
            if (resp?.error) {
                statusText.textContent = t('startFailed', { error: resp.error });
            }

            setActiveState(resp?.isActive ?? false);
        }
    );
}

function selectMode(mode) {
    if (mode !== 'empathy' && mode !== 'hearing_aid') return;

    const modeChanged = currentMode !== mode;
    currentMode = mode;
    applyModeTab(mode);
    saveState();

    if (isActive) {
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
        log('Tri-state switch clicked:', { targetState, isActive, currentMode });

        if (targetState === 'off') {
            if (!isActive) {
                syncModeSwitchUi();
                return;
            }

            requestProcessing(false);
            return;
        }

        selectMode(targetState);
        if (!isActive) {
            requestProcessing(true);
        }
    });
});

function applyCurrentSettings() {
    if (!isActive) return;

    log('Applying current settings:', {
        currentMode,
        selectedEmpathyPreset,
        empathyCustomGains,
        selectedHaPreset,
        eqGains,
    });

    if (currentMode === 'empathy') {
        if (selectedEmpathyPreset === CUSTOM_EMPATHY_PRESET_KEY) {
            chrome.runtime.sendMessage({
                type: 'APPLY_CUSTOM_GAINS',
                target: 'offscreen',
                gains: empathyCustomGains,
            });
        } else {
            chrome.runtime.sendMessage({
                type: 'APPLY_PRESET',
                target: 'offscreen',
                preset: selectedEmpathyPreset,
            });
        }
    } else {
        eqGains.forEach((gain, index) => {
            chrome.runtime.sendMessage({
                type: 'UPDATE_FILTER_SETTINGS',
                target: 'offscreen',
                bandIndex: index,
                gainValue: gain,
            });
        });
    }
}

function applyModeTab(mode) {
    currentMode = mode;
    updatePanelVisibility();
}

function updatePanelVisibility() {
    const showOff = !isActive;
    panelOff.classList.toggle('hidden', !showOff);
    panelEmpathy.classList.toggle('hidden', showOff || currentMode !== 'empathy');
    panelHearingAid.classList.toggle('hidden', showOff || currentMode !== 'hearing_aid');
}

function updateStatusText() {
    if (!isActive) return;

    if (currentMode === 'empathy' && selectedEmpathyPreset) {
        statusText.textContent = t('empathySimulating', { name: getLocalizedEmpathyName(selectedEmpathyPreset) });
    } else if (currentMode === 'empathy') {
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
    selectedEmpathyPreset = key;
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

    empathyCustomEditor.classList.toggle('hidden', key !== CUSTOM_EMPATHY_PRESET_KEY);
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
        slider.value = empathyCustomGains[index] ?? 0;
        slider.dataset.index = index;

        const gainLabel = document.createElement('span');
        gainLabel.className = 'eq-gain-label';
        gainLabel.textContent = formatGain(slider.value);

        slider.addEventListener('input', (event) => {
            const gain = parseFloat(event.target.value);
            empathyCustomGains[index] = gain;
            gainLabel.textContent = formatGain(gain);
            selectedEmpathyPreset = CUSTOM_EMPATHY_PRESET_KEY;
            setSelectedPreset(CUSTOM_EMPATHY_PRESET_KEY);
            saveState();

            if (currentMode === 'empathy' && isActive) {
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
    empathyEqualizerControls.querySelectorAll('.eq-slider').forEach((slider, index) => {
        slider.value = empathyCustomGains[index] ?? 0;
        slider.nextElementSibling.textContent = formatGain(empathyCustomGains[index] ?? 0);
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
    selectedHaPreset = key;
    eqGains = [...HEARING_AID_PRESETS[key].gains];
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
        slider.value = eqGains[index] ?? 0;
        slider.dataset.index = index;

        const gainLabel = document.createElement('span');
        gainLabel.className = 'eq-gain-label';
        gainLabel.textContent = formatGain(slider.value);

        slider.addEventListener('input', (event) => {
            const gain = parseFloat(event.target.value);
            eqGains[index] = gain;
            gainLabel.textContent = formatGain(gain);
            selectedHaPreset = null;
            restoreHaPreset(null);
            saveState();

            if (isActive) {
                chrome.runtime.sendMessage({
                    type: 'UPDATE_FILTER_SETTINGS',
                    target: 'offscreen',
                    bandIndex: index,
                    gainValue: gain,
                });
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
        slider.value = eqGains[index] ?? 0;
        slider.nextElementSibling.textContent = formatGain(eqGains[index] ?? 0);
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
    if (message.type === 'STATE_CHANGED') {
        log('Received STATE_CHANGED:', message);
        if (message.error && !message.isActive) {
            statusText.textContent = t('startFailed', { error: message.error });
        }
        setActiveState(message.isActive, false);
    }
});

init();