#!/usr/bin/env python3
"""
Regel Interactive Developer Harness Runner
Binds the native Rust simulation engine (crates/regel-engine) and PipeWire DSP daemon (crates/regel-daemon)
to the Qt 6 QML frontend via high-performance C ABI and JSON-stream IPC.
"""
import sys
import os
import ctypes
import subprocess
import threading
import json

# Ensure Debian system PyQt6 is discoverable even when running inside venvs/pyenv
for dist_path in ["/usr/lib/python3/dist-packages", "/usr/local/lib/python3/dist-packages"]:
    if dist_path not in sys.path and os.path.isdir(dist_path):
        sys.path.insert(0, dist_path)

try:
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtQml import QQmlApplicationEngine
    from PyQt6.QtCore import QUrl, QObject, pyqtSignal, pyqtProperty, pyqtSlot, QPointF
except ImportError as err:
    print(f"Error: Could not import PyQt6: {err}")
    print("Please install native Qt 6 runner via: sudo apt install python3-pyqt6 qml-qt6")
    sys.exit(1)

# -----------------------------------------------------------------------------
# C ABI Structures matching crates/regel-engine UniformState
# -----------------------------------------------------------------------------

class CAudioSpectrum(ctypes.Structure):
    _fields_ = [
        ("sub_bass", ctypes.c_float),
        ("bass", ctypes.c_float),
        ("mids", ctypes.c_float),
        ("treble", ctypes.c_float),
        ("rms", ctypes.c_float),
        ("transient", ctypes.c_bool),
    ]

class CUniformState(ctypes.Structure):
    _fields_ = [
        ("time", ctypes.c_float),
        ("delta_time", ctypes.c_float),
        ("pointer", ctypes.c_float * 2),
        ("pointer_velocity", ctypes.c_float * 2),
        ("pointer_momentum", ctypes.c_float * 2),
        ("ambient_drift", ctypes.c_float * 2),
        ("beat_center", ctypes.c_float * 2),
        ("keystroke_pos", ctypes.c_float * 2),
        ("keystroke_dir", ctypes.c_float * 2),
        ("keystroke_energy", ctypes.c_float),
        ("shockwave_intensity", ctypes.c_float),
        ("vortex_speed", ctypes.c_float),
        ("audio", CAudioSpectrum),
        ("session_state", ctypes.c_uint32),
        ("is_obscured", ctypes.c_bool),
    ]

SESSION_STATES = {
    0: "Active",
    1: "Idle",
    2: "Locked",
    3: "Authenticating",
    4: "AuthFailed",
    5: "AuthSucceeded",
}

# -----------------------------------------------------------------------------
# EngineBridge: High-Performance In-Process Rust Simulation Coordinator
# -----------------------------------------------------------------------------

class EngineBridge(QObject):
    stateChanged = pyqtSignal()

    def __init__(self, lib_path):
        super().__init__()
        self._lib = ctypes.CDLL(lib_path)
        self._init_ffi()

        self._core = self._lib.regel_engine_create(0) # CanvasMode::Wallpaper
        self._state = CUniformState()
        self._lockscreen_mode = False
        self._wallpaper_cycle_mode = 0
        self._read_state()

    def _init_ffi(self):
        self._lib.regel_engine_create.restype = ctypes.c_void_p
        self._lib.regel_engine_create.argtypes = [ctypes.c_uint32]
        self._lib.regel_engine_destroy.argtypes = [ctypes.c_void_p]
        self._lib.regel_engine_tick.argtypes = [ctypes.c_void_p, ctypes.c_float]
        self._lib.regel_engine_handle_keystroke.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32]
        self._lib.regel_engine_handle_backspace.argtypes = [ctypes.c_void_p]
        self._lib.regel_engine_handle_auth_failed.argtypes = [ctypes.c_void_p]
        self._lib.regel_engine_handle_auth_succeeded.argtypes = [ctypes.c_void_p]
        self._lib.regel_engine_handle_pointer_move.argtypes = [ctypes.c_void_p, ctypes.c_float, ctypes.c_float, ctypes.c_float, ctypes.c_float]
        self._lib.regel_engine_handle_pointer_click.argtypes = [ctypes.c_void_p, ctypes.c_float, ctypes.c_float, ctypes.c_uint32]
        self._lib.regel_engine_steer_current.argtypes = [ctypes.c_void_p, ctypes.c_float, ctypes.c_float]
        self._lib.regel_engine_reset_drift.argtypes = [ctypes.c_void_p]
        self._lib.regel_engine_set_wander_beat.argtypes = [ctypes.c_void_p, ctypes.c_bool]
        self._lib.regel_engine_set_mode.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
        self._lib.regel_engine_set_wallpaper_cycle_mode.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
        self._lib.regel_engine_set_audio.argtypes = [
            ctypes.c_void_p,
            ctypes.c_float,
            ctypes.c_float,
            ctypes.c_float,
            ctypes.c_float,
            ctypes.c_float,
            ctypes.c_bool
        ]
        self._lib.regel_engine_get_state.argtypes = [ctypes.c_void_p, ctypes.POINTER(CUniformState)]

    def _read_state(self):
        self._lib.regel_engine_get_state(self._core, ctypes.byref(self._state))

    @pyqtSlot(float)
    def tick(self, dt):
        self._lib.regel_engine_tick(self._core, dt)
        self._read_state()
        self.stateChanged.emit()

    @pyqtSlot(float, float, float, float)
    def pointerMove(self, x, y, dx, dy):
        self._lib.regel_engine_handle_pointer_move(self._core, x, y, dx, dy)

    @pyqtSlot(float, float, int)
    def pointerClick(self, x, y, button):
        self._lib.regel_engine_handle_pointer_click(self._core, x, y, button)

    @pyqtSlot(str)
    def triggerKeystroke(self, char_str):
        if not char_str:
            return
        ch = ord(char_str[0])
        self._lib.regel_engine_handle_keystroke(self._core, ch, ch)

    @pyqtSlot()
    def triggerBackspace(self):
        self._lib.regel_engine_handle_backspace(self._core)

    @pyqtSlot()
    def triggerAuthFail(self):
        self._lib.regel_engine_handle_auth_failed(self._core)

    @pyqtSlot()
    def triggerAuthSuccess(self):
        self._lib.regel_engine_handle_auth_succeeded(self._core)

    @pyqtSlot(float, float)
    def steerCurrent(self, dx, dy):
        self._lib.regel_engine_steer_current(self._core, dx, dy)

    @pyqtSlot()
    def resetDrift(self):
        self._lib.regel_engine_reset_drift(self._core)

    @pyqtSlot(bool)
    def setLockscreenMode(self, locked):
        self._lockscreen_mode = locked
        self._lib.regel_engine_set_mode(self._core, 1 if locked else 0)

    @pyqtSlot(int)
    def setWallpaperCycleMode(self, cycle_mode):
        self._wallpaper_cycle_mode = cycle_mode
        self._lib.regel_engine_set_wallpaper_cycle_mode(self._core, cycle_mode)

    @pyqtSlot(bool)
    def setWanderBeat(self, wander):
        self._lib.regel_engine_set_wander_beat(self._core, wander)

    @pyqtSlot(float, float, float, float, float, bool)
    def setAudio(self, sub_bass, bass, mids, treble, rms, transient):
        self._lib.regel_engine_set_audio(
            self._core,
            sub_bass,
            bass,
            mids,
            treble,
            rms,
            transient
        )

    # Exposed QML Properties
    @pyqtProperty(float, notify=stateChanged)
    def simTime(self):
        return self._state.time

    @pyqtProperty(QPointF, notify=stateChanged)
    def pointerPos(self):
        return QPointF(self._state.pointer[0], self._state.pointer[1])

    @pyqtProperty(QPointF, notify=stateChanged)
    def pointerVel(self):
        return QPointF(self._state.pointer_velocity[0], self._state.pointer_velocity[1])

    @pyqtProperty(QPointF, notify=stateChanged)
    def pointerMomentum(self):
        return QPointF(self._state.pointer_momentum[0], self._state.pointer_momentum[1])

    @pyqtProperty(QPointF, notify=stateChanged)
    def ambientDrift(self):
        return QPointF(self._state.ambient_drift[0], self._state.ambient_drift[1])

    @pyqtProperty(QPointF, notify=stateChanged)
    def beatCenter(self):
        return QPointF(self._state.beat_center[0], self._state.beat_center[1])

    @pyqtProperty(QPointF, notify=stateChanged)
    def keystrokePos(self):
        return QPointF(self._state.keystroke_pos[0], self._state.keystroke_pos[1])

    @pyqtProperty(QPointF, notify=stateChanged)
    def keystrokeDir(self):
        return QPointF(self._state.keystroke_dir[0], self._state.keystroke_dir[1])

    @pyqtProperty(float, notify=stateChanged)
    def keystrokeEnergy(self):
        return self._state.keystroke_energy

    @pyqtProperty(float, notify=stateChanged)
    def shockwaveIntensity(self):
        return self._state.shockwave_intensity

    @pyqtProperty(float, notify=stateChanged)
    def vortexSpeed(self):
        return self._state.vortex_speed

    @pyqtProperty(str, notify=stateChanged)
    def sessionState(self):
        return SESSION_STATES.get(self._state.session_state, "Active")

    @pyqtProperty(float, notify=stateChanged)
    def subBass(self):
        return self._state.audio.sub_bass

    @pyqtProperty(float, notify=stateChanged)
    def bass(self):
        return self._state.audio.bass

    @pyqtProperty(float, notify=stateChanged)
    def mids(self):
        return self._state.audio.mids

    @pyqtProperty(float, notify=stateChanged)
    def treble(self):
        return self._state.audio.treble

    @pyqtProperty(float, notify=stateChanged)
    def rms(self):
        return self._state.audio.rms

    def __del__(self):
        if hasattr(self, "_core") and self._core:
            self._lib.regel_engine_destroy(self._core)
            self._core = None


# -----------------------------------------------------------------------------
# LiveAudioBridge: Native PipeWire / RustFFT DSP Subprocess Tap
# -----------------------------------------------------------------------------

class LiveAudioBridge(QObject):
    spectrumChanged = pyqtSignal()
    sensitivityChanged = pyqtSignal()

    def __init__(self, daemon_path, engine_bridge):
        super().__init__()
        self.daemon_path = daemon_path
        self.engine_bridge = engine_bridge
        self.process = None
        self.running = False
        self.thread = None
        self.current_source = None

        self._gain = 3.5
        self._gamma = 0.45
        self._auto_gain = True

        self._sub_bass = 0.05
        self._bass = 0.05
        self._mids = 0.05
        self._treble = 0.05
        self._rms = 0.05

    @pyqtSlot(str)
    def setSource(self, source_name):
        self.current_source = source_name
        self._restart_stream()

    @pyqtSlot(float, float, bool)
    def setSensitivity(self, gain, gamma, auto_gain):
        self._gain = max(0.5, min(10.0, gain))
        self._gamma = max(0.20, min(1.0, gamma))
        self._auto_gain = auto_gain
        self.sensitivityChanged.emit()
        if self.current_source in ["monitor", "mic"]:
            self._restart_stream()

    def _restart_stream(self):
        self.stop()
        if self.current_source in ["monitor", "mic"]:
            cmd = [
                self.daemon_path,
                "--audio-stream",
                self.current_source,
                "--gain",
                f"{self._gain:.2f}",
                "--gamma",
                f"{self._gamma:.2f}",
            ]
            if not self._auto_gain:
                cmd.append("--no-auto-gain")

            try:
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True,
                    bufsize=1
                )
                self.running = True
                self.thread = threading.Thread(target=self._stream_reader, daemon=True)
                self.thread.start()
                print(f"==> Rust PipeWire audio stream launched ({self.current_source}) [AGC: {self._auto_gain}, Gain: {self._gain:.1f}x, Gamma: {self._gamma:.2f}]")
            except Exception as e:
                print(f"Warning: Could not launch regel-daemon audio stream: {e}")

    @pyqtSlot()
    def stop(self):
        self.running = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=0.3)
            except Exception:
                pass
            self.process = None

    def _stream_reader(self):
        while self.running and self.process and self.process.poll() is None:
            line = self.process.stdout.readline()
            if not line:
                break
            try:
                data = json.loads(line.strip())
                self._sub_bass = data.get("sub_bass", 0.05)
                self._bass = data.get("bass", 0.05)
                self._mids = data.get("mids", 0.05)
                self._treble = data.get("treble", 0.05)
                self._rms = data.get("rms", 0.05)
                transient = data.get("transient", False)

                self.spectrumChanged.emit()
                # Feed spectrum directly into engine bridge
                self.engine_bridge.setAudio(
                    self._sub_bass,
                    self._bass,
                    self._mids,
                    self._treble,
                    self._rms,
                    transient
                )
            except Exception:
                pass

    @pyqtProperty(float, notify=spectrumChanged)
    def subBass(self):
        return self._sub_bass

    @pyqtProperty(float, notify=spectrumChanged)
    def bass(self):
        return self._bass

    @pyqtProperty(float, notify=spectrumChanged)
    def mids(self):
        return self._mids

    @pyqtProperty(float, notify=spectrumChanged)
    def treble(self):
        return self._treble

    @pyqtProperty(float, notify=spectrumChanged)
    def rms(self):
        return self._rms

    @pyqtProperty(float, notify=sensitivityChanged)
    def gain(self):
        return self._gain

    @pyqtProperty(float, notify=sensitivityChanged)
    def gamma(self):
        return self._gamma

    @pyqtProperty(bool, notify=sensitivityChanged)
    def autoGain(self):
        return self._auto_gain


# -----------------------------------------------------------------------------
# Application Entry Point
# -----------------------------------------------------------------------------

def main():
    app = QApplication(sys.argv)
    engine = QQmlApplicationEngine()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_dir = os.path.abspath(os.path.join(script_dir, "../.."))
    qml_file = os.path.join(script_dir, "harness.qml")

    # Locate libregel_engine.so
    lib_path = os.path.join(workspace_dir, "target/debug/libregel_engine.so")
    if not os.path.isfile(lib_path):
        lib_path = os.path.join(workspace_dir, "target/release/libregel_engine.so")

    if not os.path.isfile(lib_path):
        print(f"Error: {lib_path} not found. Please run: cargo build --workspace")
        sys.exit(1)

    daemon_path = os.path.join(workspace_dir, "target/debug/regel-daemon")
    if not os.path.isfile(daemon_path):
        daemon_path = os.path.join(workspace_dir, "target/release/regel-daemon")

    # Instantiate Bridges
    engine_bridge = EngineBridge(lib_path)
    audio_bridge = LiveAudioBridge(daemon_path, engine_bridge)

    # Expose to QML Context
    engine.rootContext().setContextProperty("engineCore", engine_bridge)
    engine.rootContext().setContextProperty("liveAudio", audio_bridge)

    print(f"==> Loading QML Harness with Rust Engine & Audio Tap from: {qml_file}")
    engine.load(QUrl.fromLocalFile(qml_file))

    if not engine.rootObjects():
        print("Error: Failed to load QML root object.")
        sys.exit(1)

    exit_code = app.exec()
    audio_bridge.stop()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
