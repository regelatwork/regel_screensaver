//! regel-engine: State management, event dispatch, physical decay, and simulation coordinator.

use regel_audio::AudioSpectrum;
use serde::{Deserialize, Serialize};

/// Operating modes of the visual canvas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u32)]
pub enum CanvasMode {
    /// Ambient wallpaper behind desktop windows.
    Wallpaper = 0,
    /// Exclusive screensaver / lockscreen.
    Lockscreen = 1,
}

/// Lifecycle states of the session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u32)]
pub enum SessionState {
    Active = 0,
    Idle = 1,
    Locked = 2,
    Authenticating = 3,
    AuthFailed = 4,
    AuthSucceeded = 5,
}

/// Keystroke coordinate mapping algorithms for Wallpaper canvas mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u32)]
pub enum WallpaperCycleMode {
    /// QWERTY spatial key cluster projection.
    Layout = 0,
    /// Phyllotaxis golden-ratio logarithmic spiral.
    Spiral = 1,
    /// Deterministic ASCII character hash distribution.
    CharacterHash = 2,
}

/// Unified input events across keyboard, pointer, audio, and power.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EngineEvent {
    Lock,
    Unlock,
    Wake,
    IdleTimeout,
    KeyStroke { count: usize, key_code: u32, character: Option<char> },
    Backspace { count: usize },
    AuthFailed,
    AuthSucceeded,
    PointerMove { x: f32, y: f32, dx: f32, dy: f32 },
    PointerClick { x: f32, y: f32, button: u32 },
    SteerCurrent { dx: f32, dy: f32 },
    ResetDrift,
    SetWanderBeat(bool),
    SetCanvasMode(CanvasMode),
    SetWallpaperCycleMode(WallpaperCycleMode),
    AudioUpdate(AudioSpectrum),
    ScreenObscured(bool),
    DpmsPower(bool),
}

/// Real-time engine simulation parameters exposed to shaders, QML, and C ABI.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[repr(C)]
pub struct UniformState {
    pub time: f32,
    pub delta_time: f32,
    pub pointer: [f32; 2],
    pub pointer_velocity: [f32; 2],
    pub pointer_momentum: [f32; 2],
    pub ambient_drift: [f32; 2],
    pub beat_center: [f32; 2],
    pub keystroke_pos: [f32; 2],
    pub keystroke_dir: [f32; 2],
    pub keystroke_energy: f32,
    pub shockwave_intensity: f32,
    pub vortex_speed: f32,
    pub audio: AudioSpectrum,
    pub session_state: SessionState,
    pub is_obscured: bool,
}

impl Default for UniformState {
    fn default() -> Self {
        Self {
            time: 0.0,
            delta_time: 0.016,
            pointer: [0.5, 0.5],
            pointer_velocity: [0.0, 0.0],
            pointer_momentum: [0.0, 0.0],
            ambient_drift: [0.0, 0.0],
            beat_center: [0.5, 0.5],
            keystroke_pos: [0.5, 0.5],
            keystroke_dir: [0.0, 1.0],
            keystroke_energy: 0.0,
            shockwave_intensity: 0.0,
            vortex_speed: 1.0,
            audio: AudioSpectrum::default(),
            session_state: SessionState::Active,
            is_obscured: false,
        }
    }
}

/// Core simulation state coordinator and physical integrator.
pub struct EngineCore {
    pub mode: CanvasMode,
    pub state: UniformState,
    user_drift: [f32; 2],
    wander_beat_enabled: bool,
    keystroke_counter: usize,
    wallpaper_cycle_mode: WallpaperCycleMode,
    prng_state: u64,
}

impl EngineCore {
    pub fn new(mode: CanvasMode) -> Self {
        Self {
            mode,
            state: UniformState::default(),
            user_drift: [0.0, 0.0],
            wander_beat_enabled: true,
            keystroke_counter: 0,
            wallpaper_cycle_mode: WallpaperCycleMode::Layout,
            prng_state: 0x9e3779b97f4a7c15, // Golden ratio constant seed
        }
    }

    /// Fast pseudo-random float generator in [0.0, 1.0) using Xorshift64*.
    /// Completely deterministic and decoupled from physical password characters,
    /// guaranteeing security against shoulder-surfing and side-channel analysis.
    pub fn next_random_f32(&mut self) -> f32 {
        let mut x = self.prng_state;
        if x == 0 {
            x = 0x8a5cd789635d2dff;
        }
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.prng_state = x;
        let multiplied = x.wrapping_mul(0x2545f4914f6cdd1d);
        ((multiplied >> 40) as u32 as f32) / 16777216.0
    }

    pub fn set_mode(&mut self, mode: CanvasMode) {
        self.mode = mode;
        match mode {
            CanvasMode::Lockscreen => {
                self.state.session_state = SessionState::Locked;
                self.state.vortex_speed = 0.5;
            }
            CanvasMode::Wallpaper => {
                self.state.session_state = SessionState::Active;
                self.state.vortex_speed = 1.0;
            }
        }
    }

    pub fn set_wander_beat(&mut self, enabled: bool) {
        self.wander_beat_enabled = enabled;
        if !enabled {
            self.state.beat_center = [0.5, 0.5];
        }
    }

    pub fn set_wallpaper_cycle_mode(&mut self, cycle: WallpaperCycleMode) {
        self.wallpaper_cycle_mode = cycle;
    }

    pub fn wallpaper_cycle_mode(&self) -> WallpaperCycleMode {
        self.wallpaper_cycle_mode
    }

    pub fn steer_current(&mut self, dx: f32, dy: f32) {
        self.user_drift[0] = (self.user_drift[0] + dx).clamp(-0.6, 0.6);
        self.user_drift[1] = (self.user_drift[1] + dy).clamp(-0.6, 0.6);
    }

    pub fn reset_drift(&mut self) {
        self.user_drift = [0.0, 0.0];
    }

    /// Dispatches an event and updates physical / simulation state metrics.
    pub fn handle_event(&mut self, event: EngineEvent) {
        match event {
            EngineEvent::Lock => {
                self.mode = CanvasMode::Lockscreen;
                self.state.session_state = SessionState::Locked;
                self.state.vortex_speed = 0.5;
            }
            EngineEvent::Unlock => {
                self.mode = CanvasMode::Wallpaper;
                self.state.session_state = SessionState::Active;
                self.state.vortex_speed = 1.0;
            }
            EngineEvent::AuthSucceeded => {
                self.state.session_state = SessionState::AuthSucceeded;
                self.state.vortex_speed = 3.0;
            }
            EngineEvent::Wake => {
                if self.state.session_state == SessionState::Idle {
                    self.state.session_state = SessionState::Locked;
                }
            }
            EngineEvent::IdleTimeout => {
                self.state.session_state = SessionState::Idle;
                self.state.vortex_speed = 0.2;
            }
            EngineEvent::KeyStroke { key_code, character, .. } => {
                self.keystroke_counter += 1;
                self.state.keystroke_energy = (self.state.keystroke_energy + 0.45).min(2.0);

                if self.mode == CanvasMode::Lockscreen {
                    self.state.session_state = SessionState::Authenticating;
                    // SECURE LOCKSCREEN: Pure pseudo-random screen coordinates and impulse angle.
                    // Eliminates correlation with typed password characters to protect against shoulder-surfing.
                    let rx = 0.15 + 0.70 * self.next_random_f32();
                    let ry = 0.15 + 0.70 * self.next_random_f32();
                    let angle = self.next_random_f32() * 2.0 * std::f32::consts::PI;
                    self.state.keystroke_pos = [rx, ry];
                    self.state.keystroke_dir = [angle.cos(), angle.sin()];
                } else {
                    // WALLPAPER MODE: Cycles across spatial layout, spiral, and character hash.
                    match self.wallpaper_cycle_mode {
                        WallpaperCycleMode::Layout => {
                            let ch = character
                                .unwrap_or_else(|| (b'A' + (key_code % 26) as u8) as char)
                                .to_ascii_uppercase();
                            let code = (ch as u32).saturating_sub(65);
                            let col = (code % 10) as f32;
                            let row = ((code / 10).min(2)) as f32;
                            let pos_x = 0.1 + (col / 10.0) * 0.8;
                            let pos_y = 0.2 + (row / 3.0) * 0.6;
                            let push_angle = (col / 10.0) * std::f32::consts::PI - (std::f32::consts::PI / 2.0);
                            self.state.keystroke_pos = [pos_x, pos_y];
                            self.state.keystroke_dir = [push_angle.cos(), push_angle.sin()];
                        }
                        WallpaperCycleMode::Spiral => {
                            let theta = (self.keystroke_counter as f32) * 137.5 * (std::f32::consts::PI / 180.0);
                            let r = (0.06 * ((self.keystroke_counter % 50) as f32).sqrt()).min(0.42);
                            self.state.keystroke_pos = [0.5 + r * theta.cos(), 0.5 + r * theta.sin()];
                            self.state.keystroke_dir = [theta.cos(), theta.sin()];
                        }
                        WallpaperCycleMode::CharacterHash => {
                            let code = character.map(|c| c as u32).unwrap_or(key_code);
                            let h_x = ((code * 37) % 100) as f32 / 100.0;
                            let h_y = ((code * 73) % 100) as f32 / 100.0;
                            let angle = (((code * 137) % 360) as f32) * (std::f32::consts::PI / 180.0);
                            self.state.keystroke_pos = [0.1 + h_x * 0.8, 0.1 + h_y * 0.8];
                            self.state.keystroke_dir = [angle.cos(), angle.sin()];
                        }
                    }
                }
            }
            EngineEvent::Backspace { .. } => {
                self.state.keystroke_energy = (self.state.keystroke_energy - 0.2).max(0.0);
                self.state.vortex_speed = -1.5; // Reverse suction
            }
            EngineEvent::AuthFailed => {
                self.state.session_state = SessionState::AuthFailed;
                self.state.shockwave_intensity = 1.0; // Trigger detonation shockwave
                self.state.keystroke_energy = 0.0;
            }
            EngineEvent::PointerMove { x, y, dx, dy } => {
                self.state.pointer = [x, y];
                self.state.pointer_velocity = [dx, dy];
                // Accumulate fluid stirring kinetic momentum
                self.state.pointer_momentum[0] += dx * 2.5;
                self.state.pointer_momentum[1] += dy * 2.5;
            }
            EngineEvent::PointerClick { x, y, .. } => {
                self.state.pointer = [x, y];
                self.state.keystroke_energy = (self.state.keystroke_energy + 0.5).min(2.0);
            }
            EngineEvent::SteerCurrent { dx, dy } => {
                self.steer_current(dx, dy);
            }
            EngineEvent::ResetDrift => {
                self.reset_drift();
            }
            EngineEvent::SetWanderBeat(enabled) => {
                self.set_wander_beat(enabled);
            }
            EngineEvent::SetCanvasMode(mode) => {
                self.set_mode(mode);
            }
            EngineEvent::SetWallpaperCycleMode(cycle) => {
                self.set_wallpaper_cycle_mode(cycle);
            }
            EngineEvent::AudioUpdate(spectrum) => {
                self.state.audio = spectrum;
            }
            EngineEvent::ScreenObscured(obscured) => {
                self.state.is_obscured = obscured;
            }
            EngineEvent::DpmsPower(on) => {
                self.state.is_obscured = !on;
            }
        }
    }

    /// Advances the simulation clock by dt and dampens physical impulses.
    pub fn tick(&mut self, dt: f32) {
        if self.state.is_obscured {
            return; // Zero CPU/GPU work when obscured or screen off
        }

        self.state.time += dt;
        self.state.delta_time = dt;

        // 1. Physical decay of transient impulses
        self.state.keystroke_energy = (self.state.keystroke_energy * (-2.2 * dt).exp()).max(0.0);
        self.state.shockwave_intensity = (self.state.shockwave_intensity * (-3.0 * dt).exp()).max(0.0);

        // 2. Fluid stirring momentum decay (long-lasting inertia)
        let momentum_decay = (-1.4 * dt).exp();
        self.state.pointer_momentum[0] *= momentum_decay;
        self.state.pointer_momentum[1] *= momentum_decay;

        // Pointer velocity decay (smooth return to rest)
        let vel_decay = (-8.0 * dt).exp();
        self.state.pointer_velocity[0] *= vel_decay;
        self.state.pointer_velocity[1] *= vel_decay;
        if self.state.pointer_velocity[0].abs() < 1e-4 {
            self.state.pointer_velocity[0] = 0.0;
        }
        if self.state.pointer_velocity[1].abs() < 1e-4 {
            self.state.pointer_velocity[1] = 0.0;
        }

        // 3. Wandering beat epicenter (Lissajous trajectory)
        if self.wander_beat_enabled {
            self.state.beat_center = [
                0.5 + 0.28 * (self.state.time * 0.30).sin(),
                0.5 + 0.20 * (self.state.time * 0.42).cos(),
            ];
        } else {
            self.state.beat_center = [0.5, 0.5];
        }

        // 4. Slow autonomous oceanic drift + user steering
        let auto_angle = self.state.time * 0.06;
        let auto_drift_x = 0.12 * auto_angle.cos();
        let auto_drift_y = 0.12 * auto_angle.sin();
        self.state.ambient_drift = [
            self.user_drift[0] + auto_drift_x,
            self.user_drift[1] + auto_drift_y,
        ];

        // 5. Restore baseline vortex speed
        let target_vortex = match self.state.session_state {
            SessionState::Idle => 0.2,
            SessionState::AuthSucceeded => 3.0,
            _ => 1.0,
        };
        self.state.vortex_speed += (target_vortex - self.state.vortex_speed) * 3.0 * dt;
    }
}

// ----------------------------------------------------------------------------
// C ABI FFI Layer for QML C++ Plugins, Python ctypes, and IPC Daemons
// ----------------------------------------------------------------------------

#[no_mangle]
pub extern "C" fn regel_engine_create(mode: u32) -> *mut EngineCore {
    let canvas_mode = if mode == 1 {
        CanvasMode::Lockscreen
    } else {
        CanvasMode::Wallpaper
    };
    Box::into_raw(Box::new(EngineCore::new(canvas_mode)))
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_destroy(core: *mut EngineCore) {
    if !core.is_null() {
        drop(Box::from_raw(core));
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_tick(core: *mut EngineCore, dt: f32) {
    if let Some(engine) = core.as_mut() {
        engine.tick(dt);
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_handle_keystroke(core: *mut EngineCore, key_code: u32, ch: u32) {
    if let Some(engine) = core.as_mut() {
        let character = if ch > 0 { char::from_u32(ch) } else { None };
        engine.handle_event(EngineEvent::KeyStroke {
            count: 1,
            key_code,
            character,
        });
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_handle_backspace(core: *mut EngineCore) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::Backspace { count: 1 });
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_handle_auth_failed(core: *mut EngineCore) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::AuthFailed);
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_handle_auth_succeeded(core: *mut EngineCore) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::AuthSucceeded);
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_handle_pointer_move(
    core: *mut EngineCore,
    x: f32,
    y: f32,
    dx: f32,
    dy: f32,
) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::PointerMove { x, y, dx, dy });
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_handle_pointer_click(core: *mut EngineCore, x: f32, y: f32, button: u32) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::PointerClick { x, y, button });
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_steer_current(core: *mut EngineCore, dx: f32, dy: f32) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::SteerCurrent { dx, dy });
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_reset_drift(core: *mut EngineCore) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::ResetDrift);
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_set_wander_beat(core: *mut EngineCore, wander: bool) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::SetWanderBeat(wander));
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_set_mode(core: *mut EngineCore, mode: u32) {
    if let Some(engine) = core.as_mut() {
        let canvas_mode = if mode == 1 {
            CanvasMode::Lockscreen
        } else {
            CanvasMode::Wallpaper
        };
        engine.handle_event(EngineEvent::SetCanvasMode(canvas_mode));
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_set_wallpaper_cycle_mode(core: *mut EngineCore, cycle: u32) {
    if let Some(engine) = core.as_mut() {
        let cycle_mode = match cycle {
            1 => WallpaperCycleMode::Spiral,
            2 => WallpaperCycleMode::CharacterHash,
            _ => WallpaperCycleMode::Layout,
        };
        engine.handle_event(EngineEvent::SetWallpaperCycleMode(cycle_mode));
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_set_audio(
    core: *mut EngineCore,
    sub_bass: f32,
    bass: f32,
    mids: f32,
    treble: f32,
    rms: f32,
    transient: bool,
) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::AudioUpdate(AudioSpectrum {
            sub_bass,
            bass,
            mids,
            treble,
            rms,
            transient,
            ..AudioSpectrum::default()
        }));
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_set_audio_ex(
    core: *mut EngineCore,
    sub_bass: f32,
    bass: f32,
    mids: f32,
    treble: f32,
    rms: f32,
    transient: bool,
    bpm: f32,
    beat: bool,
    downbeat: bool,
    beat_phase: f32,
    is_vocal: bool,
    vocal_energy: f32,
) {
    if let Some(engine) = core.as_mut() {
        engine.handle_event(EngineEvent::AudioUpdate(AudioSpectrum {
            sub_bass,
            bass,
            mids,
            treble,
            rms,
            transient,
            bpm,
            beat,
            downbeat,
            beat_phase,
            is_vocal,
            vocal_energy,
        }));
    }
}

#[no_mangle]
pub unsafe extern "C" fn regel_engine_get_state(core: *const EngineCore, out_state: *mut UniformState) {
    if let (Some(engine), Some(out)) = (core.as_ref(), out_state.as_mut()) {
        *out = engine.state;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keystroke_energy_and_decay() {
        let mut core = EngineCore::new(CanvasMode::Lockscreen);
        assert_eq!(core.state.keystroke_energy, 0.0);

        core.handle_event(EngineEvent::KeyStroke {
            count: 1,
            key_code: 65,
            character: Some('A'),
        });
        assert!(core.state.keystroke_energy > 0.0);

        let prev = core.state.keystroke_energy;
        core.tick(0.1);
        assert!(core.state.keystroke_energy < prev);
    }

    #[test]
    fn test_auth_failed_shockwave() {
        let mut core = EngineCore::new(CanvasMode::Lockscreen);
        core.handle_event(EngineEvent::AuthFailed);

        assert_eq!(core.state.session_state, SessionState::AuthFailed);
        assert_eq!(core.state.shockwave_intensity, 1.0);

        core.tick(0.5);
        assert!(core.state.shockwave_intensity < 1.0);
    }

    #[test]
    fn test_occlusion_pauses_tick() {
        let mut core = EngineCore::new(CanvasMode::Wallpaper);
        core.handle_event(EngineEvent::ScreenObscured(true));
        let t0 = core.state.time;
        core.tick(0.1);
        assert_eq!(core.state.time, t0);
    }

    #[test]
    fn test_pointer_momentum_accumulation_and_decay() {
        let mut core = EngineCore::new(CanvasMode::Wallpaper);
        assert_eq!(core.state.pointer_momentum, [0.0, 0.0]);

        // Simulating rapid pointer movement
        core.handle_event(EngineEvent::PointerMove {
            x: 0.55,
            y: 0.60,
            dx: 0.05,
            dy: 0.10,
        });

        assert_eq!(core.state.pointer_momentum, [0.05 * 2.5, 0.10 * 2.5]);

        let prev_momentum_x = core.state.pointer_momentum[0];
        let prev_momentum_y = core.state.pointer_momentum[1];

        core.tick(0.2);

        // Momentum should decay exponentially after release
        assert!(core.state.pointer_momentum[0] < prev_momentum_x);
        assert!(core.state.pointer_momentum[1] < prev_momentum_y);
        assert!(core.state.pointer_momentum[0] > 0.0);
    }

    #[test]
    fn test_steer_current_and_oceanic_drift() {
        let mut core = EngineCore::new(CanvasMode::Wallpaper);

        // Advance time to verify autonomous circular drift
        core.tick(1.0);
        let drift_t1 = core.state.ambient_drift;
        assert_ne!(drift_t1, [0.0, 0.0]);

        // Steer current using arrow keys
        core.handle_event(EngineEvent::SteerCurrent { dx: 0.2, dy: -0.1 });
        core.tick(0.016);
        let drift_steered = core.state.ambient_drift;
        assert!(drift_steered[0] > drift_t1[0]);

        // Reset drift
        core.handle_event(EngineEvent::ResetDrift);
        core.tick(0.016);
        let drift_reset = core.state.ambient_drift;
        assert!(drift_reset[0] < drift_steered[0]);
    }

    #[test]
    fn test_wander_beat_center() {
        let mut core = EngineCore::new(CanvasMode::Wallpaper);
        assert_eq!(core.state.beat_center, [0.5, 0.5]);

        // When wander is enabled, center should follow Lissajous curve
        core.tick(2.0);
        assert_ne!(core.state.beat_center, [0.5, 0.5]);
        assert!(core.state.beat_center[0] >= 0.22 && core.state.beat_center[0] <= 0.78);
        assert!(core.state.beat_center[1] >= 0.30 && core.state.beat_center[1] <= 0.70);

        // When wander is disabled, center should snap to [0.5, 0.5]
        core.handle_event(EngineEvent::SetWanderBeat(false));
        core.tick(0.1);
        assert_eq!(core.state.beat_center, [0.5, 0.5]);
    }

    #[test]
    fn test_lockscreen_keystroke_security_randomness() {
        let mut core = EngineCore::new(CanvasMode::Lockscreen);

        // Stroke 1: 'P'
        core.handle_event(EngineEvent::KeyStroke {
            count: 1,
            key_code: 80,
            character: Some('P'),
        });
        let pos1 = core.state.keystroke_pos;
        let dir1 = core.state.keystroke_dir;

        // Verify bounds within [0.15, 0.85]
        assert!(pos1[0] >= 0.15 && pos1[0] <= 0.85);
        assert!(pos1[1] >= 0.15 && pos1[1] <= 0.85);

        // Stroke 2: 'A'
        core.handle_event(EngineEvent::KeyStroke {
            count: 2,
            key_code: 65,
            character: Some('A'),
        });
        let pos2 = core.state.keystroke_pos;
        let dir2 = core.state.keystroke_dir;

        // Security check: consecutive keystrokes must have non-identical positions and directions
        assert_ne!(pos1, pos2);
        assert_ne!(dir1, dir2);
    }

    #[test]
    fn test_wallpaper_keystroke_cycling_modes() {
        let mut core = EngineCore::new(CanvasMode::Wallpaper);

        // 1. Layout mode
        core.set_wallpaper_cycle_mode(WallpaperCycleMode::Layout);
        core.handle_event(EngineEvent::KeyStroke {
            count: 1,
            key_code: 65,
            character: Some('A'),
        });
        let pos_layout = core.state.keystroke_pos;

        // 2. Spiral mode
        core.set_wallpaper_cycle_mode(WallpaperCycleMode::Spiral);
        core.handle_event(EngineEvent::KeyStroke {
            count: 2,
            key_code: 65,
            character: Some('A'),
        });
        let pos_spiral = core.state.keystroke_pos;
        assert_ne!(pos_layout, pos_spiral);

        // 3. CharacterHash mode
        core.set_wallpaper_cycle_mode(WallpaperCycleMode::CharacterHash);
        core.handle_event(EngineEvent::KeyStroke {
            count: 3,
            key_code: 65,
            character: Some('A'),
        });
        let pos_hash = core.state.keystroke_pos;
        assert_ne!(pos_spiral, pos_hash);
    }

    #[test]
    fn test_c_ffi_lifecycle_and_state() {
        unsafe {
            let core = regel_engine_create(0); // Wallpaper
            assert!(!core.is_null());

            regel_engine_handle_pointer_move(core, 0.6, 0.7, 0.05, -0.05);
            regel_engine_steer_current(core, 0.1, 0.1);
            regel_engine_handle_keystroke(core, 65, 'A' as u32);
            regel_engine_tick(core, 0.016);

            let mut state = UniformState::default();
            regel_engine_get_state(core, &mut state);

            assert!(state.time > 0.0);
            assert_eq!(state.pointer, [0.6, 0.7]);
            assert!(state.pointer_momentum[0] > 0.0);
            assert!(state.keystroke_energy > 0.0);

            regel_engine_destroy(core);
        }
    }

    #[test]
    fn test_struct_layout() {
        assert_eq!(std::mem::size_of::<AudioSpectrum>(), 44);
        assert_eq!(std::mem::size_of::<UniformState>(), 128);
        assert_eq!(std::mem::offset_of!(UniformState, audio), 76);
        assert_eq!(std::mem::offset_of!(UniformState, session_state), 120);
        assert_eq!(std::mem::offset_of!(UniformState, is_obscured), 124);
    }
}
