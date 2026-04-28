// src/js/popup.js
import { FREQUENCY_BANDS, EMPATHY_PRESETS, HEARING_AID_PRESETS } from './audioProcessor.js';

// ── DOM 引用 ──
const powerCheckbox = document.getElementById('powerCheckbox');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const presetList = document.getElementById('presetList');
const presetDescription = document.getElementById('presetDescription');
const presetDescText = document.getElementById('presetDescText');
const haQuickPresets = document.getElementById('haQuickPresets');
const equalizerControls = document.getElementById('equalizerControls');
const panelEmpathy = document.getElementById('panel-empathy');
const panelHearingAid = document.getElementById('panel-hearing-aid');

// ── 状态 ──
let isActive = false;
let currentMode = 'empathy';       // 'empathy' | 'hearing_aid'
let selectedEmpathyPreset = null;  // key from EMPATHY_PRESETS
let selectedHaPreset = 'flat';
let eqGains = new Array(FREQUENCY_BANDS.length).fill(0);

// 每个共情预设对应的图标
const PRESET_ICONS = {
    mild:          '🔉',
    moderate:      '🔈',
    severe:        '🔇',
    presbycusis:   '🧓',
    nihl:          '🎧',
    tinnitus:      '🔔',
    low_frequency: '🎶',
};

// ── 初始化 ──
async function init() {
    await loadSavedState();
    buildEmpathyPresets();
    buildHaQuickPresets();
    buildEqualizer();
    applyModeTab(currentMode);

    // 恢复 UI 状态（从 storage 恢复选中的预设高亮）
    if (selectedEmpathyPreset) {
        setSelectedPreset(selectedEmpathyPreset);
    }
    restoreHaPreset(selectedHaPreset);
    restoreEqSliders();

    // 查询后台当前是否激活
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
        if (chrome.runtime.lastError) return;
        setActiveState(resp?.isActive ?? false, false);
    });
}

// ── 从 chrome.storage 加载已保存的偏好 ──
async function loadSavedState() {
    return new Promise(resolve => {
        chrome.storage.local.get(
            ['mode', 'empathyPreset', 'haPreset', 'eqGains'],
            (data) => {
                if (data.mode)          currentMode           = data.mode;
                if (data.empathyPreset) selectedEmpathyPreset = data.empathyPreset;
                if (data.haPreset)      selectedHaPreset      = data.haPreset;
                if (data.eqGains)       eqGains               = data.eqGains;
                resolve();
            }
        );
    });
}

function saveState() {
    chrome.storage.local.set({
        mode:          currentMode,
        empathyPreset: selectedEmpathyPreset,
        haPreset:      selectedHaPreset,
        eqGains,
    });
}

// ── 激活状态 UI ──
function setActiveState(active, sendToOffscreen = true) {
    isActive = active;
    powerCheckbox.checked = active;
    statusDot.classList.toggle('active', active);

    if (active) {
        statusText.textContent = currentMode === 'empathy'
            ? (selectedEmpathyPreset ? `模拟中：${EMPATHY_PRESETS[selectedEmpathyPreset]?.name}` : '共情体验模式已激活')
            : '助听调节模式已激活';
        if (sendToOffscreen) applyCurrentSettings();
    } else {
        statusText.textContent = '未激活 — 点击开关开始';
    }
}

// ── 电源开关 ──
powerCheckbox.addEventListener('change', () => {
    const wantActive = powerCheckbox.checked;
    powerCheckbox.disabled = true;

    chrome.runtime.sendMessage(
        { type: wantActive ? 'START_PROCESSING' : 'STOP_PROCESSING' },
        (resp) => {
            powerCheckbox.disabled = false;
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                powerCheckbox.checked = !wantActive; // 回滚
                return;
            }
            setActiveState(resp?.isActive ?? false);
        }
    );
});

// ── 将当前设置推送给 offscreen ──
function applyCurrentSettings() {
    if (!isActive) return;
    if (currentMode === 'empathy') {
        chrome.runtime.sendMessage({
            type: 'APPLY_PRESET',
            target: 'offscreen',
            preset: selectedEmpathyPreset,
        });
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

// ── 模式标签切换 ──
document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === currentMode) return;
        currentMode = mode;
        applyModeTab(mode);
        saveState();
        applyCurrentSettings();
        updateStatusText();
    });
});

function applyModeTab(mode) {
    document.querySelectorAll('.mode-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === mode);
    });
    panelEmpathy.classList.toggle('hidden', mode !== 'empathy');
    panelHearingAid.classList.toggle('hidden', mode !== 'hearing_aid');
}

function updateStatusText() {
    if (!isActive) return;
    if (currentMode === 'empathy' && selectedEmpathyPreset) {
        statusText.textContent = `模拟中：${EMPATHY_PRESETS[selectedEmpathyPreset]?.name}`;
    } else if (currentMode === 'empathy') {
        statusText.textContent = '共情体验模式已激活';
    } else {
        statusText.textContent = '助听调节模式已激活';
    }
}

// ── 共情预设列表 ──
function buildEmpathyPresets() {
    presetList.innerHTML = '';
    Object.entries(EMPATHY_PRESETS).forEach(([key, preset]) => {
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
        name.textContent = preset.name;

        const nameEn = document.createElement('div');
        nameEn.className = 'preset-item-name-en';
        nameEn.textContent = preset.nameEn;

        body.appendChild(name);
        body.appendChild(nameEn);

        const severity = buildSeverityDots(preset.severity);

        item.appendChild(icon);
        item.appendChild(body);
        item.appendChild(severity);

        item.addEventListener('click', () => onPresetSelected(key));
        presetList.appendChild(item);
    });
}

function buildSeverityDots(level) {
    const container = document.createElement('div');
    container.className = 'preset-severity';
    for (let i = 1; i <= 3; i++) {
        const dot = document.createElement('span');
        dot.className = `severity-dot${i <= level ? ' filled' : ''}`;
        container.appendChild(dot);
    }
    return container;
}

function onPresetSelected(key) {
    selectedEmpathyPreset = key;
    setSelectedPreset(key);
    saveState();

    // 显示描述
    const preset = EMPATHY_PRESETS[key];
    presetDescText.textContent = preset.description;
    presetDescription.classList.remove('hidden');

    applyCurrentSettings();
    updateStatusText();
}

function setSelectedPreset(key) {
    presetList.querySelectorAll('.preset-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.key === key);
    });
    if (key) {
        const preset = EMPATHY_PRESETS[key];
        if (preset) {
            presetDescText.textContent = preset.description;
            presetDescription.classList.remove('hidden');
        }
    }
}

// ── 助听模式：快速预设按钮 ──
function buildHaQuickPresets() {
    haQuickPresets.innerHTML = '';
    Object.entries(HEARING_AID_PRESETS).forEach(([key, preset]) => {
        const btn = document.createElement('button');
        btn.className = 'ha-preset-btn';
        btn.dataset.key = key;
        btn.textContent = preset.name;
        btn.addEventListener('click', () => onHaPresetSelected(key));
        haQuickPresets.appendChild(btn);
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
    haQuickPresets.querySelectorAll('.ha-preset-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.key === key);
    });
}

// ── 均衡器 ──
function buildEqualizer() {
    equalizerControls.innerHTML = '';
    FREQUENCY_BANDS.forEach((freq, index) => {
        const band = document.createElement('div');
        band.className = 'eq-band';

        const freqLabel = document.createElement('span');
        freqLabel.className = 'eq-freq-label';
        freqLabel.textContent = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;

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

        slider.addEventListener('input', (e) => {
            const gain = parseFloat(e.target.value);
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

function formatGain(val) {
    const n = parseFloat(val);
    return (n >= 0 ? '+' : '') + n.toFixed(0) + 'dB';
}

// ── 来自 background 的状态变更广播 ──
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATE_CHANGED') {
        setActiveState(message.isActive, false);
    }
});

// 启动
init();
