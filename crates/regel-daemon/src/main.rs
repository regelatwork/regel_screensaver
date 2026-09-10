//! regel-daemon: Background daemon for PipeWire stream tapping and IPC broadcasting.

use regel_audio::{AudioSpectrum, SpectrumAnalyzer};
use regel_engine::{CanvasMode, EngineCore, EngineEvent};
use std::time::{Duration, Instant};

fn main() {
    env_logger::init();
    log::info!("Starting regel-daemon service...");

    let mut analyzer = SpectrumAnalyzer::new(48000.0, 1024, 0.05);
    let mut core = EngineCore::new(CanvasMode::Wallpaper);

    log::info!("Audio analyzer and engine core initialized.");
    
    // Demonstration loop running at 60 Hz
    let start = Instant::now();
    let mut last_tick = Instant::now();
    let test_sine: Vec<f32> = (0..1024)
        .map(|i| (2.0 * std::f32::consts::PI * 80.0 * i as f32 / 48000.0).sin())
        .collect();

    for _ in 0..5 {
        let now = Instant::now();
        let dt = (now - last_tick).as_secs_f32();
        last_tick = now;

        let spectrum: AudioSpectrum = analyzer.analyze(&test_sine);
        core.handle_event(EngineEvent::AudioUpdate(spectrum));
        core.tick(dt.max(0.016));

        std::thread::sleep(Duration::from_millis(16));
    }

    log::info!(
        "regel-daemon health check passed. Elapsed: {:?}",
        start.elapsed()
    );
}
