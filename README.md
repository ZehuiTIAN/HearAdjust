# HearAdjust

HearAdjust is a Chrome extension designed to provide real-time audio enhancement and simulation. It captures audio from any browser tab and processes it using the Web Audio API to either compensate for hearing loss (like a hearing aid) or simulate a specific hearing condition.

## Core Features

*   **Hearing Aid Mode**: Adjusts audio frequencies based on a user's audiogram to make sound clearer and more accessible.
*   **Empathy Mode**: Simulates various types of hearing loss, allowing developers, designers, and content creators to experience how others might perceive their audio content.
*   **Real-time Processing**: Leverages the Web Audio API for low-latency audio processing directly in the browser.

## Technology Stack

*   **Manifest V3**: Built on the latest Chrome Extension platform for enhanced security and performance.
*   **Vanilla JavaScript (ES6+)**: Modern, dependency-free JavaScript.
*   **Web Audio API**: For all audio capture and processing tasks.
*   **HTML5 / CSS3**: For the user interface.

## Current Status

The foundational structure of the extension is complete. This includes:

*   A valid `manifest.json` configured for Manifest V3.
*   The necessary background script (`background.js`) for service worker tasks.
*   A basic popup interface (`popup.html`, `popup.js`).
*   An offscreen document (`offscreen.html`, `offscreen.js`) set up to handle persistent audio streams, as required by MV3.
*   The project can be successfully loaded and activated in Google Chrome.

The next phase of development will focus on implementing the core audio processing logic within `audioProcessor.js` and `offscreen.js`.

---

# HearAdjust (中文说明)

HearAdjust 是一个 Chrome 浏览器扩展，旨在提供实时的音频增强与模拟功能。它能捕获任意浏览器标签页的音频，并通过 Web Audio API 进行处理，以实现听力补偿（助听）或模拟特定的听力障碍（共情）。

##核心功能

*   **助听模式**: 根据用户的听力图（Audiogram）调整音频频率，使声音更清晰、更易于辨识。
*   **共情模式**: 模拟不同类型的听力损失，让开发者、设计师和内容创作者能够体验听障人士如何感知他们的音频内容。
*   **实时处理**: 利用 Web Audio API 在浏览器中直接进行低延迟的音频处理。

## 技术栈

*   **Manifest V3**: 基于最新的 Chrome 扩展平台构建，以获得更高的安全性与性能。
*   **原生 JavaScript (ES6+)**: 无任何外部依赖的现代 JavaScript。
*   **Web Audio API**: 用于所有音频捕获与处理任务。
*   **HTML5 / CSS3**: 用于构建用户交互界面。

## 目前状态

本项目的扩展基础框架已搭建完成。这包括：

*   一个为 Manifest V3 配置好的、有效的 `manifest.json` 文件。
*   用于处理后台任务的背景脚本 (`background.js`)。
*   一个基础的弹出窗口界面 (`popup.html`, `popup.js`)。
*   根据 MV3 规范设置的离屏文档 (`offscreen.html`, `offscreen.js`)，用于处理持久化的音频流。
*   项目当前已可以成功加载到 Google Chrome 浏览器中并激活。

下一阶段的开发将专注于在 `audioProcessor.js` 和 `offscreen.js` 中实现核心的音频处理逻辑。
