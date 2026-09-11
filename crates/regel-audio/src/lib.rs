//! regel-audio: Low-latency PipeWire & FFT frequency analysis kernel with Automatic Gain Control (AGC) and Gamma curve.

use rustfft::{num_complex::Complex, FftPlanner};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Represents normalized audio frequency bands (0.0 to 1.0) and metrics.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[repr(C)]
pub struct AudioSpectrum {
    /// Sub-bass frequencies (20 Hz - 60 Hz): Drives shockwaves, gravity wells, heavy impacts.
    pub sub_bass: f32,
    /// Bass frequencies (60 Hz - 250 Hz): Drives rhythm pulses, dye jets, and building height EQ.
    pub bass: f32,
    /// Mid-range frequencies (250 Hz - 4 kHz): Drives vocal turbulence and organism activity.
    pub mids: f32,
    /// Treble frequencies (4 kHz - 20 kHz): Drives sparkles, rain mist, dew drops, laser flickers.
    pub treble: f32,
    /// Root Mean Square (RMS) overall amplitude volume (0.0 to 1.0).
    pub rms: f32,
    /// Transient attack burst indicator (percussive claps, snare hits, key strikes, mic taps).
    pub transient: bool,
}

impl Default for AudioSpectrum {
    fn default() -> Self {
        Self {
            sub_bass: 0.05,
            bass: 0.05,
            mids: 0.05,
            treble: 0.05,
            rms: 0.05,
            transient: false,
        }
    }
}

/// Real-time FFT spectrum analyzer with Automatic Gain Control (AGC), Gamma response, and ambient floor.
pub struct SpectrumAnalyzer {
    sample_rate: f32,
    window_size: usize,
    hann_window: Vec<f32>,
    planner: Arc<dyn rustfft::Fft<f32>>,
    previous_rms: f32,
    ambient_floor: f32,
    auto_gain: bool,
    manual_gain: f32,
    gamma: f32,
    running_peak: f32,
}

impl SpectrumAnalyzer {
    /// Creates a new spectrum analyzer for a given sample rate (e.g., 48000 Hz) and FFT size (e.g., 1024).
    pub fn new(sample_rate: f32, window_size: usize, ambient_floor: f32) -> Self {
        assert!(window_size.is_power_of_two(), "FFT window size must be power of two");

        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(window_size);

        // Precompute Hann window to reduce spectral leakage
        let hann_window: Vec<f32> = (0..window_size)
            .map(|i| {
                0.5 * (1.0 - ((2.0 * std::f32::consts::PI * i as f32) / (window_size as f32 - 1.0)).cos())
            })
            .collect();

        Self {
            sample_rate,
            window_size,
            hann_window,
            planner: fft,
            previous_rms: 0.0,
            ambient_floor: ambient_floor.max(0.01),
            auto_gain: true,
            manual_gain: 3.0,
            gamma: 0.45,
            running_peak: 0.06,
        }
    }

    pub fn set_auto_gain(&mut self, enabled: bool) {
        self.auto_gain = enabled;
    }

    pub fn set_manual_gain(&mut self, gain: f32) {
        self.manual_gain = gain.clamp(0.1, 20.0);
    }

    pub fn set_gamma(&mut self, gamma: f32) {
        self.gamma = gamma.clamp(0.20, 1.0);
    }

    pub fn auto_gain(&self) -> bool {
        self.auto_gain
    }

    pub fn manual_gain(&self) -> f32 {
        self.manual_gain
    }

    pub fn gamma(&self) -> f32 {
        self.gamma
    }

    /// Analyzes a slice of raw mono PCM float samples and extracts normalized spectrum bands.
    pub fn analyze(&mut self, samples: &[f32]) -> AudioSpectrum {
        if samples.len() < self.window_size {
            return AudioSpectrum::default();
        }

        // 1. Calculate raw RMS volume
        let sum_squares: f32 = samples[..self.window_size].iter().map(|&s| s * s).sum();
        let raw_rms = (sum_squares / self.window_size as f32).sqrt().min(1.0);

        // 2. Apply Hann window & prepare complex buffer
        let mut buffer: Vec<Complex<f32>> = samples[..self.window_size]
            .iter()
            .zip(&self.hann_window)
            .map(|(&sample, &window)| Complex {
                re: sample * window,
                im: 0.0,
            })
            .collect();

        // 3. Execute forward FFT
        self.planner.process(&mut buffer);

        // 4. Calculate magnitude spectrum for positive frequencies
        let half_size = self.window_size / 2;
        let bin_hz = self.sample_rate / self.window_size as f32;

        let mut sub_bass_max = 0.0f32;
        let mut bass_max = 0.0f32;
        let mut mids_max = 0.0f32;
        let mut treble_max = 0.0f32;

        for bin in 1..half_size {
            let freq = bin as f32 * bin_hz;
            let magnitude = (buffer[bin].re.hypot(buffer[bin].im)) * 2.0 / (self.window_size as f32);

            if freq >= 20.0 && freq < 60.0 {
                sub_bass_max = sub_bass_max.max(magnitude);
            } else if freq >= 60.0 && freq < 250.0 {
                bass_max = bass_max.max(magnitude);
            } else if freq >= 250.0 && freq < 4000.0 {
                mids_max = mids_max.max(magnitude);
            } else if freq >= 4000.0 && freq < 20000.0 {
                treble_max = treble_max.max(magnitude);
            }
        }

        // 5. Automatic Gain Control (AGC) & Adaptive Peak Tracking
        let frame_peak = sub_bass_max.max(bass_max).max(mids_max).max(treble_max).max(raw_rms);

        if frame_peak > self.running_peak {
            // Fast attack: immediate responsiveness to mic hits and loud transients
            self.running_peak = self.running_peak * 0.25 + frame_peak * 0.75;
        } else {
            // Slow decay: adapts back toward sensitivity floor over ~2 seconds
            self.running_peak = (self.running_peak * 0.993).max(0.015);
        }

        let effective_multiplier = if self.auto_gain {
            let target_headroom = 0.85;
            let dynamic_factor = (target_headroom / self.running_peak.max(0.01)).clamp(1.0, 35.0);
            dynamic_factor * self.manual_gain
        } else {
            self.manual_gain * 3.0
        };

        // 6. Gamma Perceptual Non-linear Mapping with Soft Noise Gate
        let gamma = self.gamma;
        let floor = self.ambient_floor;

        let process_band = |raw: f32| -> f32 {
            // Soft noise gate knee between 0.001 and 0.006 to suppress line hiss in silence
            let gate = if raw < 0.001 {
                0.0
            } else if raw > 0.006 {
                1.0
            } else {
                (raw - 0.001) / 0.005
            };

            let amplified = (raw * effective_multiplier * gate).clamp(0.0, 1.0);
            let curved = if amplified > 0.0 {
                amplified.powf(gamma)
            } else {
                0.0
            };
            curved.clamp(0.0, 1.0).max(floor)
        };

        let norm_sub_bass = process_band(sub_bass_max);
        let norm_bass = process_band(bass_max);
        let norm_mids = process_band(mids_max);
        let norm_treble = process_band(treble_max);
        let norm_rms = process_band(raw_rms);

        // 7. Detect percussive transient (mic taps, percussive claps, drum kicks)
        let transient = (norm_rms - self.previous_rms) > 0.20
            || (raw_rms > 0.015 && raw_rms > self.previous_rms * 2.5);
        self.previous_rms = norm_rms;

        AudioSpectrum {
            sub_bass: norm_sub_bass,
            bass: norm_bass,
            mids: norm_mids,
            treble: norm_treble,
            rms: norm_rms,
            transient,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generate_sine(sample_rate: f32, freq: f32, amplitude: f32, count: usize) -> Vec<f32> {
        (0..count)
            .map(|i| amplitude * (2.0 * std::f32::consts::PI * freq * i as f32 / sample_rate).sin())
            .collect()
    }

    #[test]
    fn test_silence_floor_enforcement() {
        let mut analyzer = SpectrumAnalyzer::new(48000.0, 1024, 0.05);
        let silence = vec![0.0f32; 1024];
        let spectrum = analyzer.analyze(&silence);

        assert_eq!(spectrum.sub_bass, 0.05);
        assert_eq!(spectrum.bass, 0.05);
        assert_eq!(spectrum.mids, 0.05);
        assert_eq!(spectrum.treble, 0.05);
        assert_eq!(spectrum.rms, 0.05);
        assert!(!spectrum.transient);
    }

    #[test]
    fn test_soft_mic_tap_amplification() {
        let sample_rate = 48000.0;
        let mut analyzer = SpectrumAnalyzer::new(sample_rate, 1024, 0.05);

        // A quiet microphone input of amplitude 0.02 at 100 Hz (a soft tap or voice)
        let tap = generate_sine(sample_rate, 100.0, 0.02, 1024);
        let spectrum = analyzer.analyze(&tap);

        // With AGC and Gamma curve, amplitude 0.02 must be visibly amplified (> 0.40)
        assert!(
            spectrum.bass > 0.40,
            "Expected bass > 0.40 for soft mic tap, got {}",
            spectrum.bass
        );
        assert!(spectrum.bass > spectrum.treble);
    }

    #[test]
    fn test_bass_frequency_detection() {
        let sample_rate = 48000.0;
        let mut analyzer = SpectrumAnalyzer::new(sample_rate, 1024, 0.05);

        // 100 Hz is in the Bass range (60 - 250 Hz)
        let bass_wave = generate_sine(sample_rate, 100.0, 0.5, 1024);
        let spectrum = analyzer.analyze(&bass_wave);

        assert!(spectrum.bass > spectrum.treble);
        assert!(spectrum.bass > spectrum.mids);
    }

    #[test]
    fn test_treble_frequency_detection() {
        let sample_rate = 48000.0;
        let mut analyzer = SpectrumAnalyzer::new(sample_rate, 1024, 0.05);

        // 8000 Hz is in the Treble range (4000 - 20000 Hz)
        let treble_wave = generate_sine(sample_rate, 8000.0, 0.5, 1024);
        let spectrum = analyzer.analyze(&treble_wave);

        assert!(spectrum.treble > spectrum.bass);
        assert!(spectrum.treble > spectrum.sub_bass);
    }

    #[test]
    fn test_transient_detection_on_sudden_hit() {
        let sample_rate = 48000.0;
        let mut analyzer = SpectrumAnalyzer::new(sample_rate, 1024, 0.05);

        // Frame 1: quiet silence
        let silence = vec![0.0f32; 1024];
        let _ = analyzer.analyze(&silence);

        // Frame 2: sudden mic strike / clap
        let hit = generate_sine(sample_rate, 150.0, 0.08, 1024);
        let spectrum = analyzer.analyze(&hit);

        assert!(spectrum.transient, "Expected transient hit to be true");
    }
}
