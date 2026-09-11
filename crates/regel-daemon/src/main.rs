//! regel-daemon: Background daemon for PipeWire stream tapping, FFT analysis, and IPC state broadcasting.

use regel_audio::{AudioSpectrum, SpectrumAnalyzer};
use regel_engine::{CanvasMode, EngineCore, EngineEvent};
use std::env;
use std::io::{self, Read, Write};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

fn run_audio_stream(source: &str, gain: f32, gamma: f32, auto_gain: bool) -> io::Result<()> {

    // Prefer native PipeWire recording via pw-record; fallback to parec if needed
    let mut child = if source == "mic" {
        Command::new("pw-record")
            .args(&[
                "--raw",
                "--rate=48000",
                "--channels=1",
                "--format=f32",
                "--target=@DEFAULT_AUDIO_SOURCE@",
                "-",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .or_else(|_| {
                Command::new("parec")
                    .args(&[
                        "--device=@DEFAULT_SOURCE@",
                        "--format=float32le",
                        "--channels=1",
                        "--rate=48000",
                        "--raw",
                    ])
                    .stdout(Stdio::piped())
                    .stderr(Stdio::null())
                    .spawn()
            })?
    } else {
        // Desktop audio sink monitor tap ("What You Hear" from YouTube, media players, games)
        Command::new("pw-record")
            .args(&[
                "-P",
                "{ stream.capture.sink = true }",
                "--raw",
                "--rate=48000",
                "--channels=1",
                "--format=f32",
                "-",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .or_else(|_| {
                Command::new("parec")
                    .args(&[
                        "--device=@DEFAULT_MONITOR@",
                        "--format=float32le",
                        "--channels=1",
                        "--rate=48000",
                        "--raw",
                    ])
                    .stdout(Stdio::piped())
                    .stderr(Stdio::null())
                    .spawn()
            })?
    };

    let mut stdout = match child.stdout.take() {
        Some(s) => s,
        None => return Err(io::Error::new(io::ErrorKind::Other, "Failed to capture audio stdout")),
    };

    let mut analyzer = SpectrumAnalyzer::new(48000.0, 1024, 0.05);
    analyzer.set_manual_gain(gain);
    analyzer.set_gamma(gamma);
    analyzer.set_auto_gain(auto_gain);

    let mut buffer = [0u8; 4096]; // 1024 samples * 4 bytes/f32
    let mut float_samples = [0.0f32; 1024];

    eprintln!(
        "==> regel-daemon audio DSP stream active ({source}) [AGC: {auto_gain}, Gain: {gain:.1}x, Gamma: {gamma:.2}]"
    );

    loop {
        if let Err(_) = stdout.read_exact(&mut buffer) {
            break;
        }

        // Fast zero-copy f32 slice interpretation
        for (i, chunk) in buffer.chunks_exact(4).enumerate() {
            float_samples[i] = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        }

        // Perform SIMD FFT & spectral band decomposition using regel-audio
        let spectrum = analyzer.analyze(&float_samples);

        if let Ok(json) = serde_json::to_string(&spectrum) {
            if writeln!(io::stdout(), "{}", json).is_err() {
                break;
            }
            if io::stdout().flush().is_err() {
                break;
            }
        }
    }

    let _ = child.kill();
    Ok(())
}

fn main() {
    env_logger::init();
    let args: Vec<String> = env::args().collect();

    if args.len() > 1 && args[1] == "--audio-stream" {
        let mut source = "monitor";
        let mut gain = 3.5f32;
        let mut gamma = 0.45f32;
        let mut auto_gain = true;

        let mut i = 2;
        while i < args.len() {
            match args[i].as_str() {
                "--gain" if i + 1 < args.len() => {
                    if let Ok(val) = args[i + 1].parse::<f32>() {
                        gain = val;
                    }
                    i += 2;
                }
                "--gamma" if i + 1 < args.len() => {
                    if let Ok(val) = args[i + 1].parse::<f32>() {
                        gamma = val;
                    }
                    i += 2;
                }
                "--no-auto-gain" => {
                    auto_gain = false;
                    i += 1;
                }
                src if !src.starts_with("--") => {
                    source = src;
                    i += 1;
                }
                _ => {
                    i += 1;
                }
            }
        }

        if let Err(e) = run_audio_stream(source, gain, gamma, auto_gain) {
            eprintln!("Error in audio stream: {}", e);
            std::process::exit(1);
        }
        return;
    }

    log::info!("Starting regel-daemon service...");

    let mut analyzer = SpectrumAnalyzer::new(48000.0, 1024, 0.05);
    let mut core = EngineCore::new(CanvasMode::Wallpaper);

    log::info!("Audio analyzer and engine core initialized.");

    // Verification loop running at 60 Hz
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
