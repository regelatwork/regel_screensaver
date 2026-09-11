#!/usr/bin/env python3
"""
Regel Interactive Developer Harness Runner
Uses PyQt6 (already installed on modern KDE Plasma) to launch the QML harness without qtchooser issues.
"""
import sys
import os

# If running inside a virtualenv, pyenv, or conda, include Debian system dist-packages for PyQt6
for dist_path in ["/usr/lib/python3/dist-packages", "/usr/local/lib/python3/dist-packages"]:
    if dist_path not in sys.path and os.path.isdir(dist_path):
        sys.path.insert(0, dist_path)

try:
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtQml import QQmlApplicationEngine
    from PyQt6.QtCore import QUrl, QObject, pyqtSignal, pyqtProperty, pyqtSlot, QTimer
except ImportError as err:
    print(f"Error: Could not import PyQt6: {err}")
    print("Please install native Qt 6 runner via: sudo apt install qml-qt6")
    sys.exit(1)

from audio_capture import LiveAudioCapture

class LiveAudioBridge(QObject):
    spectrumChanged = pyqtSignal()

    def __init__(self):
        super().__init__()
        self.capture = None
        self._sub_bass = 0.05
        self._bass = 0.05
        self._mids = 0.05
        self._treble = 0.05

        self.timer = QTimer(self)
        self.timer.setInterval(30)
        self.timer.timeout.connect(self._poll_audio)
        self.timer.start()

    @pyqtSlot(str)
    def setSource(self, source_name):
        if self.capture:
            self.capture.stop()
            self.capture = None

        if source_name in ["monitor", "mic"]:
            self.capture = LiveAudioCapture(mode=source_name)
            self.capture.start()

    @pyqtSlot()
    def stop(self):
        if self.capture:
            self.capture.stop()
            self.capture = None

    def _poll_audio(self):
        if self.capture and self.capture.running:
            self._sub_bass = self.capture.sub_bass
            self._bass = self.capture.bass
            self._mids = self.capture.mids
            self._treble = self.capture.treble
            self.spectrumChanged.emit()

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

def main():
    app = QApplication(sys.argv)
    engine = QQmlApplicationEngine()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    qml_file = os.path.join(script_dir, "harness.qml")

    audio_bridge = LiveAudioBridge()
    engine.rootContext().setContextProperty("liveAudio", audio_bridge)

    print(f"==> Loading QML Harness from: {qml_file}")
    engine.load(QUrl.fromLocalFile(qml_file))

    if not engine.rootObjects():
        print("Error: Failed to load QML root object.")
        sys.exit(1)

    sys.exit(app.exec())

if __name__ == "__main__":
    main()
