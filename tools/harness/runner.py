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
    from PyQt6.QtCore import QUrl
except ImportError as err:
    print(f"Error: Could not import PyQt6: {err}")
    print("Please install native Qt 6 runner via: sudo apt install qml-qt6")
    sys.exit(1)

def main():
    app = QApplication(sys.argv)
    engine = QQmlApplicationEngine()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    qml_file = os.path.join(script_dir, "harness.qml")

    print(f"==> Loading QML Harness from: {qml_file}")
    engine.load(QUrl.fromLocalFile(qml_file))

    if not engine.rootObjects():
        print("Error: Failed to load QML root object.")
        sys.exit(1)

    sys.exit(app.exec())

if __name__ == "__main__":
    main()
