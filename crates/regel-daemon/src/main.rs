//! regel-daemon: Background daemon for PipeWire stream tapping, FFT analysis, and D-Bus state broadcasting.

use regel_audio::{AudioSpectrum, SpectrumAnalyzer};
use std::env;
use std::ffi::CStr;
use std::io::{self, Read, Write};
use std::os::raw::{c_char, c_int};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

extern "C" {
    fn regel_dbus_init() -> c_int;
    fn regel_dbus_emit_spectrum(
        sub_bass: f64,
        bass: f64,
        mids: f64,
        treble: f64,
        rms: f64,
        transient: c_int,
    );
    fn regel_dbus_process_messages();
    fn regel_dbus_check_source_change(out_source: *mut c_char, max_len: usize) -> c_int;
    fn regel_dbus_check_gain_change(out_gain: *mut f64) -> c_int;
    #[allow(dead_code)]
    fn regel_dbus_get_gain() -> f64;
}

fn spawn_pipewire_record(source: &str) -> io::Result<Child> {
    if source == "mic" {
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
            })
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
            })
    }
}

fn run_audio_daemon(
    mut source: String,
    mut gain: f32,
    gamma: f32,
    auto_gain: bool,
    write_stdout: bool,
) -> io::Result<()> {
    // 1. Initialize D-Bus session service
    let dbus_ok = unsafe { regel_dbus_init() == 0 };
    if dbus_ok {
        eprintln!("==> regel-daemon: Registered 'org.regel.Audio' on D-Bus session bus");
    } else {
        eprintln!("==> regel-daemon: Warning: Could not register D-Bus service (running headless/fallback)");
    }

    let mut analyzer = SpectrumAnalyzer::new(48000.0, 1024, 0.05);
    analyzer.set_manual_gain(gain);
    analyzer.set_gamma(gamma);
    analyzer.set_auto_gain(auto_gain);

    let mut child = spawn_pipewire_record(&source)?;
    let mut stdout = match child.stdout.take() {
        Some(s) => s,
        None => return Err(io::Error::new(io::ErrorKind::Other, "Failed to capture audio stdout")),
    };

    let mut buffer = [0u8; 4096]; // 1024 samples * 4 bytes/f32
    let mut float_samples = [0.0f32; 1024];
    let mut source_buf = [0 as c_char; 32];
    let mut new_gain = 0.0f64;

    eprintln!(
        "==> regel-daemon audio DSP active (source: '{source}') [AGC: {auto_gain}, Gain: {gain:.1}x, Gamma: {gamma:.2}]"
    );

    loop {
        // Read raw PCM samples from PipeWire stream
        if let Err(_) = stdout.read_exact(&mut buffer) {
            // If child terminated, attempt clean restart after brief pause
            let _ = child.kill();
            std::thread::sleep(Duration::from_millis(200));
            child = spawn_pipewire_record(&source)?;
            stdout = match child.stdout.take() {
                Some(s) => s,
                None => break,
            };
            continue;
        }

        // Fast zero-copy f32 slice conversion
        for (i, chunk) in buffer.chunks_exact(4).enumerate() {
            float_samples[i] = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
        }

        // Compute FFT spectral band decomposition
        let spectrum: AudioSpectrum = analyzer.analyze(&float_samples);

        // Process D-Bus incoming requests (GetAll, Get, SetSource, SetGain)
        if dbus_ok {
            unsafe {
                regel_dbus_process_messages();

                // Check if client requested source change via D-Bus
                if regel_dbus_check_source_change(source_buf.as_mut_ptr(), source_buf.len()) != 0 {
                    let req_source = CStr::from_ptr(source_buf.as_ptr()).to_string_lossy().into_owned();
                    if req_source != source {
                        eprintln!("==> regel-daemon: Switching audio source: '{source}' -> '{req_source}'");
                        source = req_source;
                        let _ = child.kill();
                        if let Ok(mut new_child) = spawn_pipewire_record(&source) {
                            if let Some(new_stdout) = new_child.stdout.take() {
                                child = new_child;
                                stdout = new_stdout;
                            }
                        }
                    }
                }

                // Check if client requested gain change via D-Bus
                if regel_dbus_check_gain_change(&mut new_gain as *mut f64) != 0 {
                    gain = new_gain as f32;
                    analyzer.set_manual_gain(gain);
                }

                // Broadcast spectrum over D-Bus PropertiesChanged signal
                regel_dbus_emit_spectrum(
                    spectrum.sub_bass as f64,
                    spectrum.bass as f64,
                    spectrum.mids as f64,
                    spectrum.treble as f64,
                    spectrum.rms as f64,
                    if spectrum.transient { 1 } else { 0 },
                );
            }
        }

        // Stream JSON to stdout when explicitly requested (e.g. by regel-harness)
        if write_stdout {
            if let Ok(json) = serde_json::to_string(&spectrum) {
                if writeln!(io::stdout(), "{}", json).is_err() {
                    break;
                }
                if io::stdout().flush().is_err() {
                    break;
                }
            }
        }
    }

    let _ = child.kill();
    Ok(())
}

fn run_health_check() {
    use regel_engine::{CanvasMode, EngineCore, EngineEvent};

    let mut analyzer = SpectrumAnalyzer::new(48000.0, 1024, 0.05);
    let mut core = EngineCore::new(CanvasMode::Wallpaper);

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

    println!(
        "regel-daemon health check passed. Elapsed: {:?}",
        start.elapsed()
    );
}

fn main() {
    env_logger::init();
    let args: Vec<String> = env::args().collect();

    let mut source = "monitor".to_string();
    let mut gain = 3.5f32;
    let mut gamma = 0.45f32;
    let mut auto_gain = true;
    let mut write_stdout = false;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--audio-stream" => {
                write_stdout = true;
                i += 1;
            }
            "--health-check" => {
                run_health_check();
                return;
            }
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
            "--auto-gain" => {
                auto_gain = true;
                i += 1;
            }
            "--source" if i + 1 < args.len() => {
                source = args[i + 1].clone();
                i += 2;
            }
            src if !src.starts_with("--") => {
                source = src.to_string();
                i += 1;
            }
            _ => {
                i += 1;
            }
        }
    }

    if let Err(e) = run_audio_daemon(source, gain, gamma, auto_gain, write_stdout) {
        eprintln!("Error in regel-daemon: {}", e);
        std::process::exit(1);
    }
}
