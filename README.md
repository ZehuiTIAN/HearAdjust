# HearAdjust

[中文](README.zh-CN.md) | English

HearAdjust is a Chrome extension for real-time hearing-loss simulation and hearing-aid style audio adjustment. It lets hearing users briefly experience how different hearing conditions sound, while also giving users a simple 8-band EQ workflow for personal compensation.

## Features

### Empathy Mode

Simulate different hearing conditions in real time with Web Audio processing.

| Preset | Description |
| --- | --- |
| Mild Loss | Mild high-frequency attenuation that makes detail harder to catch in noisy environments |
| Moderate Loss | Stronger rolloff from speech-critical bands, making consonants difficult to follow |
| Severe Loss | Heavy attenuation across the spectrum, leaving only very loud sounds clearly audible |
| Presbycusis | Age-related high-frequency loss with reduced speech clarity in background noise |
| Noise-Induced | A characteristic 4kHz notch caused by long-term loud-noise exposure |
| Tinnitus | A persistent 6kHz tone layered onto otherwise normal hearing |
| Low-Frequency Loss | Reduced perception of low sounds while highs remain comparatively clear |
| Custom Audiogram | Enter your own loss curve so other people can hear your everyday listening reality |

### Hearing Aid Mode

Adjust an 8-band EQ manually, or start from quick presets:

- Flat Reset
- Speech Focus
- Treble Boost
- Bass Boost

Settings are saved locally and restored the next time the popup opens.

## Installation

This project is currently meant to be loaded as an unpacked extension.

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable Developer Mode.
4. Click Load unpacked.
5. Select the project root folder.

Chrome 116 or later is required because the extension uses Manifest V3 and the offscreen API.

## Usage

### Basic Flow

1. Open a tab that is playing audio or video.
2. Click the HearAdjust extension icon.
3. Move the three-state switch left for Empathy Mode or right for Hearing Aid Mode.
4. Choose a preset or adjust the sliders.
5. Move the switch back to the center position to turn processing off.

### Off State

When the switch is in the center position, the popup shows an overview of both modes instead of leaving the previous control panel visible.

### Empathy Mode

- Click any hearing-condition card to apply it immediately.
- Choose Custom Audiogram to enter your own loss curve across 8 frequency bands.
- Tinnitus adds an extra continuous sine tone to simulate subjective ringing.

### Hearing Aid Mode

- Quick presets apply common compensation curves instantly.
- The 8 sliders range from `-40dB` to `+40dB`.
- Manual slider changes clear the active quick-preset highlight.

## Notes

- Only one tab can be processed at a time.
- Some DRM-protected websites cannot be captured through `tabCapture`.
- Severe presets can reduce loudness substantially, so test carefully.

## Architecture

```text
popup.html / popup.js
  -> background.js (service worker)
  -> offscreen.js (offscreen document)
  -> audioProcessor.js (EQ filters + tinnitus oscillator)
```

## Tech Stack

- Manifest V3 Chrome Extension
- Web Audio API
- `chrome.tabCapture`
- `chrome.offscreen`
- Vanilla JavaScript with ES modules

## Roadmap

- Add audiogram import templates and quick-fill helpers for custom hearing profiles
- Replace the custom audiogram sliders with a more clinical chart-style editor
- Add export and share actions for custom hearing profiles

## Background

HearAdjust is not a medical device. It is a small empathy and accessibility project intended to help people better understand hearing loss and explore sound adaptation in a direct, interactive way.