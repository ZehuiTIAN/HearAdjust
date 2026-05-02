import { EMPATHY_PRESETS, HEARING_AID_PRESETS } from '../audioProcessor.js';
import { CUSTOM_EMPATHY_PRESET_KEY } from '../shared/constants.js';
import { UI_STRINGS } from './i18n.js';

export const PRESET_ICONS = {
    mild: '🔉',
    moderate: '🔈',
    severe: '🔇',
    presbycusis: '👵🏼',
    nihl: '🎧',
    tinnitus: '🔔',
    low_frequency: '🎶',
    author: '👩🏻‍💻',
    [CUSTOM_EMPATHY_PRESET_KEY]: '🫱',
};

export function getEmpathyPresetMeta(key) {
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

export function getLocalizedEmpathyName(key, language) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    return language === 'en' ? (preset.nameEn || preset.name) : preset.name;
}

export function getSecondaryEmpathyName(key, language) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    return language === 'en' ? preset.name : (preset.nameEn || preset.name);
}

export function getLocalizedEmpathyDescription(key, language) {
    const preset = getEmpathyPresetMeta(key);
    if (!preset) return '';
    return language === 'en' ? (preset.descriptionEn || preset.description) : preset.description;
}

export function getHearingAidPresetName(key, language) {
    const preset = HEARING_AID_PRESETS[key];
    if (!preset) return key;
    return language === 'en' ? (preset.nameEn || preset.name) : preset.name;
}