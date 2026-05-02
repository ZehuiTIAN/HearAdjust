// src/js/audioProcessor.js

export const FREQUENCY_BANDS = [250, 500, 750, 1000, 2000, 4000, 6000, 8000];

// 共情模式：模拟不同听力障碍类型的 EQ 曲线
export const EMPATHY_PRESETS = {
    mild: {
        name: '轻度听力损失',
        nameEn: 'Mild Loss',
        severity: 1,
        description: '在嘈杂环境中难以辨别高音细节。日常安静的对话通常仍清晰，但需要更专注地倾听。这是最常见的听力障碍形式。',
        // dB gains for [250, 500, 750, 1000, 2000, 4000, 6000, 8000] Hz
        gains: [0, 0, 0, -5, -10, -15, -20, -20],
        tinnitus: false,
    },
    moderate: {
        name: '中度听力损失',
        nameEn: 'Moderate Loss',
        severity: 2,
        description: '即使在安静环境中也难以理解言语，通常需要助听器。许多辅音（如 s、f、th）几乎消失，对话需要反复确认。',
        gains: [0, -5, -10, -15, -20, -30, -35, -35],
        tinnitus: false,
    },
    severe: {
        name: '重度听力损失',
        nameEn: 'Severe Loss',
        severity: 3,
        description: '仅能感知非常响亮的声音。言语理解极为困难，日常交流主要依赖视觉线索和唇读，音乐世界几乎完全关闭。',
        gains: [-5, -10, -20, -30, -40, -40, -40, -40],
        tinnitus: false,
    },
    presbycusis: {
        name: '年龄相关性听力损失',
        nameEn: 'Presbycusis',
        severity: 2,
        description: '随年龄增长逐渐失去对高频声音的感知，是 65 岁以上人群最常见的听力障碍。背景噪声变得难以过滤，理解对话愈发吃力。',
        gains: [0, 0, -2, -5, -12, -22, -30, -35],
        tinnitus: false,
    },
    nihl: {
        name: '噪声性听力损失',
        nameEn: 'Noise-Induced',
        severity: 2,
        description: '长期暴露于高强度噪声（工厂、音乐会、耳机）在 4kHz 附近造成特征性的"凹陷"。一旦形成，这种损伤是永久性的。',
        gains: [0, 0, 0, -2, -5, -30, -15, -10],
        tinnitus: false,
    },
    tinnitus: {
        name: '耳鸣',
        nameEn: 'Tinnitus',
        severity: 1,
        description: '一种持续存在于内耳的嗡嗡声、铃声或哨声，即使在完全寂静的环境中也无法消失。全球约 15% 的人口受此困扰。',
        gains: [0, 0, 0, 0, 0, 0, 0, 0],
        tinnitus: true,
        tinnitusFreq: 6000,
        tinnitusGain: 0.04, // linear amplitude (~-28dB)
    },
    low_frequency: {
        name: '低频听力损失',
        nameEn: 'Low-Frequency Loss',
        severity: 2,
        description: '一种相对罕见的类型，对低沉声音（雷声、男低音、引擎声）的感知大幅减弱，而高频声音仍较为清晰。',
        gains: [-25, -20, -15, -8, 0, 0, 0, 0],
        tinnitus: false,
    },
    author: {
        name: '作者的听力图',
        nameEn: "Author's Audiogram",
        severity: 3,
        description: '这是作者本人的听力曲线。中频区域（750Hz–2000Hz）损失最为严重，几乎所有语音辅音与元音细节都难以感知；低频轻度受损，高频略有回升。这是这款应用真正被创作出来的听觉起点。',
        gains: [-10, -20, -45, -65, -75, -75, -55, -40],
        tinnitus: false,
    },
};

// 助听模式：快速预设方案
export const HEARING_AID_PRESETS = {
    flat: {
        name: '平坦（重置）',
        gains: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    speech: {
        name: '语音清晰',
        gains: [-2, 0, 2, 5, 8, 10, 8, 5],
    },
    boost_highs: {
        name: '高频增强',
        gains: [0, 0, 0, 3, 8, 14, 18, 18],
    },
    boost_lows: {
        name: '低频增强',
        gains: [12, 8, 5, 2, 0, 0, 0, 0],
    },
};

/**
 * Creates the core EQ audio processing graph.
 */
export function createHearAdjustNode(audioContext) {
    const filters = FREQUENCY_BANDS.map(frequency => {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = frequency;
        filter.Q.value = 1.5;
        filter.gain.value = 0;
        return filter;
    });

    for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
    }

    return {
        input: filters[0],
        output: filters[filters.length - 1],
        filters,
    };
}

/**
 * Applies an array of dB gain values to the filter chain.
 */
export function applyGains(filters, gains) {
    gains.forEach((gain, index) => {
        if (filters[index]) {
            filters[index].gain.value = gain;
        }
    });
}
