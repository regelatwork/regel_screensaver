//! regel-engine: State management, event dispatch, and simulation coordinator.

use regel_audio::AudioSpectrum;
use serde::{Deserialize, Serialize};

/// Operating modes of the visual canvas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CanvasMode {
    /// Ambient wallpaper behind desktop windows.
    Wallpaper,
    /// Exclusive screensaver / lockscreen.
    Lockscreen,
}

/// Lifecycle states of the session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionState {
    Active,
    Idle,
    Locked,
    Authenticating,
    AuthFailed,
    AuthSucceeded,
}

/// Unified input events across keyboard, pointer, audio, and power.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EngineEvent {
    Lock,
    Unlock,
    Wake,
    IdleTimeout,
    KeyStroke { count: usize, key_code: u32 },
    Backspace { count: usize },
    AuthFailed,
    AuthSucceeded,
    PointerMove { x: f32, y: f32, dx: f32, dy: f32 },
    PointerClick { x: f32, y: f32, button: u32 },
    AudioUpdate(AudioSpectrum),
    ScreenObscured(bool),
    DpmsPower(bool),
}

/// Real-time engine simulation parameters exposed to shaders/QML.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UniformState {
    pub time: f32,
    pub delta_time: f32,
    pub pointer: [f32; 2],
    pub pointer_velocity: [f32; 2],
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
            keystroke_energy: 0.0,
            shockwave_intensity: 0.0,
            vortex_speed: 1.0,
            audio: AudioSpectrum::default(),
            session_state: SessionState::Active,
            is_obscured: false,
        }
    }
}

/// Core simulation state coordinator.
pub struct EngineCore {
    pub mode: CanvasMode,
    pub state: UniformState,
}

impl EngineCore {
    pub fn new(mode: CanvasMode) -> Self {
        Self {
            mode,
            state: UniformState::default(),
        }
    }

    /// Dispatches an event and updates physical / optical state metrics.
    pub fn handle_event(&mut self, event: EngineEvent) {
        match event {
            EngineEvent::Lock => {
                self.state.session_state = SessionState::Locked;
                self.state.vortex_speed = 0.5;
            }
            EngineEvent::Unlock | EngineEvent::AuthSucceeded => {
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
            EngineEvent::KeyStroke { .. } => {
                self.state.session_state = SessionState::Authenticating;
                self.state.keystroke_energy = (self.state.keystroke_energy + 0.35).min(2.0);
            }
            EngineEvent::Backspace { .. } => {
                self.state.keystroke_energy = (self.state.keystroke_energy - 0.2).max(0.0);
                self.state.vortex_speed = -1.5; // Reverse suction
            }
            EngineEvent::AuthFailed => {
                self.state.session_state = SessionState::AuthFailed;
                self.state.shockwave_intensity = 1.0; // Trigger detonation
                self.state.keystroke_energy = 0.0;
            }
            EngineEvent::PointerMove { x, y, dx, dy } => {
                self.state.pointer = [x, y];
                self.state.pointer_velocity = [dx, dy];
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
            _ => {}
        }
    }

    /// Advances the simulation clock by dt and dampens transient impulses.
    pub fn tick(&mut self, dt: f32) {
        if self.state.is_obscured {
            return; // Zero CPU/GPU work when obscured or screen off
        }

        self.state.time += dt;
        self.state.delta_time = dt;

        // Exponential decay of physical impulses
        self.state.keystroke_energy *= (-2.5 * dt).exp();
        self.state.shockwave_intensity *= (-3.0 * dt).exp();

        // Restore baseline vortex speed
        let target_vortex = match self.state.session_state {
            SessionState::Idle => 0.2,
            SessionState::AuthSucceeded => 3.0,
            _ => 1.0,
        };
        self.state.vortex_speed += (target_vortex - self.state.vortex_speed) * 3.0 * dt;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keystroke_energy_and_decay() {
        let mut core = EngineCore::new(CanvasMode::Lockscreen);
        assert_eq!(core.state.keystroke_energy, 0.0);

        core.handle_event(EngineEvent::KeyStroke { count: 1, key_code: 65 });
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
}
