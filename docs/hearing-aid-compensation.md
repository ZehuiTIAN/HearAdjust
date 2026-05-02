# Hearing Aid Compensation: Algorithms, Terms, and Implementation

This document is written for readers who have basic signal-processing background but have not worked deeply on hearing-aid DSP.

It has three goals:

1. Explain why HearAdjust currently caps manual gain at `+40 dB`, and why that is an implementation constraint rather than a medical threshold.
2. Explain the common hearing-aid algorithms and technical terms in a coherent DSP framework.
3. Explain how those algorithms are typically implemented, and how that differs from the current project.

## 1. Separate the concepts that are easiest to confuse

### 1.1 `dB HL` is not the same thing as `dB gain`

- `dB HL` is an audiometric hearing-threshold scale.
- `dB gain` is signal gain applied inside an audio processing chain.

They are not related by a direct one-to-one mapping.

Reasons include:

- target compensation depends on frequency
- target compensation depends on input level
- a hearing aid must balance audibility, comfort, and maximum output

So a `40 dB HL` loss at one frequency does not imply that `+40 dB` fixed playback gain is the correct engineering choice.

### 1.2 EQ is not the whole hearing aid, only one module

`EQ`, short for equalization, is a system that imposes a frequency response $H(e^{j\omega})$ so that different spectral components experience different gains.

In simple terms:

- low frequencies may be amplified
- mids may remain flat
- highs may be attenuated

That is EQ.

But real hearing-aid DSP typically includes more than static equalization:

- dynamic compression
- output limiting
- feedback cancellation
- noise reduction
- directionality
- frequency lowering

So EQ should be thought of as one foundational block in a hearing-aid chain, not as the complete device logic.

### 1.3 Static compensation versus dynamic compensation

Static compensation:

- a given band receives the same gain regardless of input level

Dynamic compensation:

- soft input receives more gain
- loud input receives less gain

Modern hearing-aid processing is usually built around the latter.

## 2. What HearAdjust currently implements

The current Hearing Aid Mode in this project is fundamentally an 8-band cascaded peaking EQ.

Current characteristics:

- each band is a `BiquadFilterNode`
- filter type is `peaking`
- center frequencies are fixed at 250, 500, 750, 1000, 2000, 4000, 6000, and 8000 Hz
- `Q = 1.5` is fixed
- only the band gain changes
- the overall graph is approximately `source -> 8-band EQ -> destination`

So the current system is:

- a parametric equalizer
- with fixed center frequencies and fixed Q
- with variable per-band gain
- whose overall response is approximately the product of the cascaded band responses

It does not currently include:

- per-band envelope detection
- wide dynamic range compression
- a dedicated output limiter
- adaptive feedback cancellation
- high-frequency lowering

For that reason, the current implementation is closer to a personal compensation EQ than to a full hearing-aid processing chain.

## 3. What a peaking EQ actually is

`Peaking EQ`, also called a peaking filter or bell EQ, has a bell-shaped magnitude response.

- with positive gain, it creates a peak around a center frequency
- with negative gain, it creates a dip around that center frequency

Its main parameters are:

### 3.1 Center frequency `f0`

Determines where the peak or dip is centered.

### 3.2 Gain

Determines whether that band is boosted or cut.

- `+6 dB` increases magnitude around the band
- `-6 dB` decreases magnitude around the band

### 3.3 Quality factor `Q`

Determines how wide the affected band is.

- larger `Q` means narrower bandwidth
- smaller `Q` means wider bandwidth

For the current project:

- `Q = 1.5` is moderately broad
- each control point affects a neighborhood of frequencies rather than an infinitesimal single tone

## 4. Why the current `+40 dB` ceiling is an implementation ceiling, not a theoretical one

The current implementation is static EQ without dedicated output protection. Under that design, high positive gain quickly causes practical problems.

### 4.1 Multiple boosts reduce headroom

If several bands are boosted simultaneously, time-domain peaks can increase significantly.

Even when each band looks acceptable in isolation, the recombined output can still create:

- clipping
- inter-sample peak risk
- harsh distortion

### 4.2 Noise and artifacts are amplified as well

Compensation gain boosts not only useful speech content but also:

- background noise
- codec artifacts
- reverberant tails
- sibilance and hiss

### 4.3 Static EQ does not handle loudness recruitment

Sensorineural hearing loss often behaves less like a rigid shift and more like:

- soft sounds are inaudible
- loud sounds quickly become uncomfortable

That is one reason why real hearing aids rely on WDRC rather than just large fixed gains.

### 4.4 Without limiting, both stability and comfort are weaker

If the UI ceiling is pushed to `+50 dB` or `+60 dB` without limiter or MPO control, the system becomes easier to overload and harder to use comfortably.

## 5. Common hearing-aid algorithms and terms, explained as a signal chain

It is easiest to understand them in the order they appear in a more typical processing chain.

```text
input
  -> preprocessing / conditioning / calibration
  -> crossover or filter bank
  -> per-band envelope detection
  -> per-band WDRC
  -> optional noise reduction / speech enhancement / directionality control
  -> optional frequency lowering
  -> recombination
  -> output limiter / MPO
  -> receiver
```

### 5.1 Prescriptive fitting formulas

Common examples include:

- `NAL-NL2`
- `DSL v5`

These are not the audio processors themselves. They are target-generation methods.

Their inputs often include:

- the audiogram
- user category or age
- binaural context
- audibility and intelligibility goals

Their outputs are typically:

- target gain by frequency and input level

So they serve more as parameter generators for dynamic hearing-aid processing than as direct filter implementations.

### 5.2 Filter bank or crossover

This is the front end of a multichannel hearing aid.

Purpose:

- split broadband input into subbands
- allow each subband to be processed independently

Common implementation choices:

- IIR crossovers
- FIR analysis filter banks
- FFT or STFT subband processing
- gammatone or auditory-inspired filter banks

Tradeoffs:

- IIR: cheap and low-latency, but phase and crossover interaction require care
- FIR: easier phase control, but higher order and latency
- STFT: convenient for noise reduction and speech enhancement, but block latency and windowing become important

### 5.3 Envelope detector

WDRC usually does not react to the raw waveform directly. It first estimates subband level or envelope.

Common methods:

- full-wave rectification followed by low-pass filtering
- RMS detector
- Hilbert envelope
- peak detector

Key design questions:

- time constants
- peak sensing versus RMS sensing
- attack and release smoothing

Peak detectors:

- respond more strongly to transients
- are often useful for protection

RMS detectors:

- track average energy more closely
- usually yield smoother subjective behavior

### 5.4 WDRC, Wide Dynamic Range Compression

This is one of the central dynamic processing blocks in hearing aids.

Goal:

- make soft sounds audible
- keep medium sounds natural
- keep loud sounds tolerable

From an input-output curve perspective:

- below a kneepoint, gain is relatively high
- above it, output grows more slowly than input

Common parameters:

- `TK`, compression threshold or kneepoint
- `CR`, compression ratio
- `attack`
- `release`
- `make-up gain` or insertion gain

In a piecewise-linear view, a common interpretation is:

- when input level `L_in` is below `TK`, apply a higher effective gain
- when `L_in` exceeds `TK`, reduce gain according to the compression ratio

The compressed segment slope is often written as:

`1 - 1/CR`

When `CR > 1`, each additional `1 dB` at the input produces less than `1 dB` increase at the output.

### 5.5 AGC, Automatic Gain Control

In the broad literature, AGC can refer to many kinds of dynamic gain adjustment.

In hearing-aid discussions it is useful to distinguish:

- slow AGC for overall loudness adaptation
- faster WDRC for audibility and comfort shaping
- output AGC or limiting for overload protection

So AGC is better viewed as a broad family, with WDRC as one important subtype.

### 5.6 MPO, Maximum Power Output

MPO is about keeping the output from becoming too intense.

It is generally implemented near the end of the chain.

Purpose:

- limit strong peaks
- prevent output overload
- preserve subjective comfort

It is primarily a protection and comfort mechanism, not a speech-enhancement algorithm.

### 5.7 Limiter versus compressor

Both are dynamic range processors.

The practical difference is in degree and purpose:

- a compressor changes dynamic range more gradually
- a limiter uses high ratio and fast response to stop peaks

A common architecture is:

- per-band WDRC first
- then a fast broadband limiter at the output

### 5.8 Noise reduction

Hearing-aid noise reduction is usually not trying to remove noise completely. It aims to:

- improve comfort
- reduce sustained background load
- preserve speech while suppressing less useful energy

Common methods include:

- spectral subtraction
- Wiener filtering
- MMSE-style estimators
- modulation-domain filtering
- DNN-based speech enhancement

Engineering constraints are usually:

- low latency
- stable behavior
- minimal musical noise

That is why commercial systems are often conservative.

### 5.9 Directionality and beamforming

With multiple microphones, a device can exploit spatial information to improve SNR.

Common approaches:

- fixed beamformers
- adaptive beamformers
- binaural beamforming

This matters because improving input SNR often helps more than adding another `+6 dB` of gain later.

But a browser extension that captures tab audio does not generally have access to a real microphone array or acoustic scene, so this part does not map directly to the current project.

### 5.10 Feedback cancellation

At high gain, an important problem is acoustic feedback:

- the receiver emits sound
- the microphone picks it back up
- a loop is formed
- whistling appears

Common solutions:

- adaptive estimation of the feedback path
- LMS, NLMS, or related adaptive filters
- subtraction of the estimated feedback component from the microphone signal

Engineering difficulty:

- the real feedback path changes with fit and positioning
- correlation between feedback and desired input can cause misadjustment

### 5.11 Frequency lowering

When high-frequency hearing loss is severe, more treble gain may no longer be useful and may instead increase:

- noise
- feedback risk
- harshness

That is when frequency lowering becomes attractive.

Common families:

- frequency compression
- frequency transposition
- frequency translation

Typical steps:

- detect high-frequency content or features
- shift or compress it into a lower target region
- blend it with the original or adjacent bands

Main difficulties:

- metallic artifacts
- altered speech spectral cues
- high parameter sensitivity

## 6. How a typical multiband WDRC implementation is built

Here is the same idea from a more engineering-oriented view.

### 6.1 Band splitting

Split input into subbands:

```text
x[n] -> x1[n], x2[n], ..., xM[n]
```

### 6.2 Per-band level estimation

For example:

- rectification followed by low-pass filtering
- or short-window RMS

This yields a level estimate `L_i[n]` for each band.

### 6.3 Map level to target gain

For band `i`, define a level-to-gain mapping:

```text
G_target_i = f_i(L_i)
```

The function `f_i` usually comes from:

- the audiogram
- the fitting rule
- fitted target points across different input levels

### 6.4 Smooth the gain with attack and release

Direct instantaneous gain jumps would create:

- pumping
- zipper noise
- modulation distortion

So a first-order smoother or separate attack and release constants are typically used.

### 6.5 Apply gain and reconstruct

```text
y_i[n] = g_i[n] * x_i[n]
y[n] = sum_i y_i[n]
```

### 6.6 Add output protection

Common final stages are:

- broadband limiter
- output AGC
- MPO control

## 7. Common implementation choices and tradeoffs

### 7.1 IIR versus FIR

IIR advantages:

- low computation
- low latency
- good fit for real-time devices

IIR disadvantages:

- nonlinear phase
- crossover interaction must be designed carefully

FIR advantages:

- linear phase is possible
- magnitude shaping is intuitive

FIR disadvantages:

- longer filters can mean larger latency
- hearing-aid pipelines are very latency-sensitive

### 7.2 Time-domain filter banks versus STFT

Time-domain filter banks:

- easier latency control
- historically common in low-latency hearing-aid systems

STFT:

- more flexible frequency-domain processing
- convenient for denoising and speech enhancement
- but block processing usually increases delay

### 7.3 Low-latency constraints

Hearing-aid systems are extremely sensitive to delay.

Excess delay can create:

- echo-like sensation
- unnatural self-voice perception
- poor wear comfort

That is why long windows, deep buffers, and heavy iterative processing are often avoided in real-time assistive pipelines.

## 8. How HearAdjust differs from a typical hearing aid today

The current Hearing Aid Mode does provide:

- fixed-frequency EQ control
- manual per-band gain
- basic audibility compensation

But it is missing several core hearing-aid capabilities.

### 8.1 No level-dependent gain

Band gain does not depend on the input level.

That means:

- soft and loud sounds are amplified similarly
- loudness recruitment is not handled well

### 8.2 No dedicated output protection

There is no independent MPO or final limiter.

So under high gain the most immediate engineering risks are:

- clipping
- reduced comfort

### 8.3 No ear-specific, scene-specific, or level-specific fitting

Real hearing aids often vary by:

- left versus right ear
- quiet versus speech versus noise environments
- soft versus medium versus loud inputs

The current project does not yet include those axes of adaptation.

## 9. A sensible evolution path for this repository

### Stage 1. Add output protection after the current EQ

Recommended additions:

- pre-gain headroom control
- post-EQ limiter or compressor
- peak monitoring

Meaning:

- first solve the engineering problem of overload under high gain

### Stage 2. Introduce multiband WDRC

Recommended additions:

- stop treating gain as fixed per band
- add envelope detection and dynamic gain per band
- derive target curves from audiograms and fitting rules

Meaning:

- move from graphic compensation EQ toward a dynamic hearing compensation processor

### Stage 3. Add advanced modules

For example:

- frequency lowering
- adaptive noise reduction
- separate left/right fitting
- context-aware presets

## 10. Most important conclusions for the current project

### Conclusion 1

The current `+40 dB` ceiling is primarily an implementation safety limit, not a medical boundary.

### Conclusion 2

Without limiter, MPO control, and WDRC, simply extending the slider range tends to make the system noisier, more distortion-prone, and less stable.

### Conclusion 3

If stronger compensation is needed, the next step should not be “more static EQ”. It should be “level-dependent multiband processing”.

## 11. Quick glossary

- `EQ`: a system that changes gain as a function of frequency
- `peaking EQ`: a bell-shaped boost or cut around a center frequency
- `Q`: quality factor controlling bandwidth
- `filter bank`: a set of filters that splits the signal into subbands
- `WDRC`: wide dynamic range compression; more gain for soft sounds, less for loud sounds
- `AGC`: automatic gain control; a broad family of level-dependent gain control
- `MPO`: maximum power output control
- `limiter`: a high-ratio, fast-acting peak restrainer
- `beamforming`: spatial filtering using multiple microphones
- `feedback cancellation`: estimation and subtraction of the feedback path
- `frequency lowering`: moving high-frequency information into a lower audible region

## 12. Sources consulted

- MDN Web Docs: `DynamicsCompressorNode`
- Wikipedia: `Hearing aid`
- Wikipedia: `Dynamic range compression`

These notes are intended as technical guidance for engineering understanding and implementation, not as medical fitting advice.