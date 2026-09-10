//! regel-audio: Low-latency PipeWire & FFT frequency analysis kernel.

use rustfft::{num_complex::Complex, FftPlanner};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Represents normalized audio frequency bands (0.0 to 1.0) and metrics.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
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
    /// Transient attack burst indicator (percussive claps, snare hits, key strikes).
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

/// Real-time FFT spectrum analyzer with ambient baseline floor enforcement.
pub struct SpectrumAnalyzer {
    sample_rate: f32,
    window_size: usize,
    hann_window: Vec<f32>,
    planner: Arc<dyn rustfft::Fft<f32>>,
    previous_rms: f32,
    ambient_floor: f32,
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
        }
    }

    /// Analyzes a slice of raw mono PCM float samples and extracts normalized spectrum bands.
    pub fn analyze(&mut self, samples: &[f32]) -> AudioSpectrum {
        if samples.len() < self.window_size {
            return AudioSpectrum::default();
        }

        // 1. Calculate RMS volume
        let sum_squares: f32 = samples[..self.window_size].iter().map(|&s| s * s).sum();
        let current_rms = (sum_squares / self.window_size as f32).sqrt().min(1.0);

        // 2. Detect percussive transient (sudden rise in energy)
        let transient = (current_rms - self.previous_rms) > 0.15;
        self.previous_rms = current_rms;

        // 3. Apply Hann window & prepare complex buffer
        let mut buffer: Vec<Complex<f32>> = samples[..self.window_size]
            .iter()
            .zip(&self.hann_window)
            .map(|(&sample, &window)| Complex {
                re: sample * window,
                im: 0.0,
            })
            .collect();

        // 4. Execute forward FFT
        self.planner.process(&mut buffer);

        // 5. Calculate magnitude spectrum for the positive frequencies
        let half_size = self.window_size / 2;
        let bin_hz = self.sample_rate / self.window_size as f32;

        let mut sub_bass_max = 0.0f32;
        let mut bass_max = 0.0f32;
        let mut mids_max = 0.0f32;
        let mut treble_max = 0.0f32;

        for bin in 1..half_size {
            let freq = bin as f32 * bin_hz;
            // Normalizing FFT magnitude by 2 / window_size (standard single-sided amplitude)
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

        // Enforce ambient baseline energy floor so visuals remain softly active during silence
        let floor = self.ambient_floor;
        let norm = |v: f32| (v * 2.0).clamp(0.0, 1.0).max(floor);

        AudioSpectrum {
            sub_bass: norm(sub_bass_max),
            bass: norm(bass_max),
            mids: norm(mids_max),
            treble: norm(treble_max),
            rms: current_rms.max(floor),
            transient,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generate_sine(sample_rate: f32, freq: f32, count: usize) -> Vec<f32> {
        (0..count)
            .map(|i| (2.0 * std::f32::consts::PI * freq * i as f32 / sample_rate).sin())
            .collect()
    }

    #[test]
    fn test_silence_floor_enforcement() {
        let mut analyzer = SpectrumAnalyzer::new(48000.0, 1024, 0.05);
        let silence = vec![0.0f32; 1024];
        let spectrum = analyzer.analyze(&silence);

        assert!(spectrum.sub_bass >= 0.05);
        assert!(spectrum.bass >= 0.05);
        assert!(spectrum.mids >= 0.05);
        assert!(spectrum.treble >= 0.05);
        assert!(spectrum.rms >= 0.05);
        assert!(!spectrum.transient);
    }

    #[test]
    fn test_bass_frequency_detection() {
        let sample_rate = 48000.0;
        let mut analyzer = SpectrumAnalyzer::new(sample_rate, 1024, 0.05);
        
        // 100 Hz is in the Bass range (60 - 250 Hz)
        let bass_wave = generate_sine(sample_rate, 100.0, 1024);
        let spectrum = analyzer.analyze(&bass_wave);

        assert!(spectrum.bass > spectrum.treble);
        assert!(spectrum.bass > spectrum.mids);
    }

    #[test]
    fn test_treble_frequency_detection() {
        let sample_rate = 48000.0;
        let mut analyzer = SpectrumAnalyzer::new(sample_rate, 1024, 0.05);
        
        // 8000 Hz is in the Treble range (4000 - 20000 Hz)
        let treble_wave = generate_sine(sample_rate, 8000.0, 1024);
        let spectrum = analyzer.analyze(&treble_wave);

        assert!(spectrum.treble > spectrum.bass);
        assert!(spectrum.treble > spectrum.sub_bass);
    }
}
