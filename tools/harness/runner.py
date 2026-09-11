#!/usr/bin/env python3
"""
Regel Interactive Developer Harness Runner
Uses PyQt6 (already installed on modern KDE Plasma) to launch the QML harness without qtchooser issues.
"""
import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtQml import QQmlApplicationEngine
from PyQt6.QtCore import QUrl

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
