"""
regel_screensaver - Live Audio Capture for PipeWire & PulseAudio
Captures raw PCM audio from default output monitor (What You Hear) or default microphone.
"""
import sys
import os
import subprocess
import threading
import time
import math

class LiveAudioCapture:
    def __init__(self, mode="monitor", sample_rate=48000, chunk_size=1024):
        self.mode = mode  # "monitor" (system sound) or "mic" (microphone)
        self.sample_rate = sample_rate
        self.chunk_size = chunk_size
        self.running = False
        self.process = None
        self.thread = None

        # Precompute Hann window
        self.window = [
            0.5 * (1.0 - math.cos(2.0 * math.pi * i / (chunk_size - 1)))
            for i in range(chunk_size)
        ]

        # Current spectrum values (sub_bass, bass, mids, treble, rms)
        self.sub_bass = 0.05
        self.bass = 0.05
        self.mids = 0.05
        self.treble = 0.05
        self.rms = 0.05

    def start(self):
        if self.running:
            return
        self.running = True

        # Target source
        # @DEFAULT_MONITOR@ captures desktop audio output (Spotify, browser, etc.)
        # @DEFAULT_SOURCE@ captures microphone
        device = "@DEFAULT_MONITOR@" if self.mode == "monitor" else "@DEFAULT_SOURCE@"
        cmd = [
            "parec",
            f"--device={device}",
            "--format=float32le",
            "--channels=1",
            f"--rate={self.sample_rate}",
            "--latency=40"
        ]

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=self.chunk_size * 4 * 2
            )
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()
            print(f"==> Live audio capture started ({self.mode})")
        except Exception as e:
            print(f"Warning: Could not start live audio capture ({self.mode}): {e}")
            self.running = False

    def stop(self):
        self.running = False
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=0.5)
            except Exception:
                pass
            self.process = None

    def _capture_loop(self):
        bytes_to_read = self.chunk_size * 4  # 4 bytes per float32
        import struct

        while self.running and self.process and self.process.poll() is None:
            raw = self.process.stdout.read(bytes_to_read)
            if len(raw) < bytes_to_read:
                time.sleep(0.01)
                continue

            # Unpack float32 mono samples
            samples = struct.unpack(f"{self.chunk_size}f", raw)

            # RMS calculation
            sum_sq = sum(s * s for s in samples)
            rms = math.sqrt(sum_sq / self.chunk_size)
            self.rms = max(0.05, min(1.0, rms * 3.0))

            # Fast band energy analysis
            # Windowed bands
            sub_acc = 0.0
            bass_acc = 0.0
            mids_acc = 0.0
            treble_acc = 0.0

            bin_hz = self.sample_rate / self.chunk_size
            half = self.chunk_size // 2

            # Estimate spectrum with discrete correlation for key frequency ranges
            # To stay lightweight in pure python, sample representative frequency bins
            for bin_idx in [1, 2, 3]: # 46 Hz - 140 Hz (Sub & Bass)
                freq = bin_idx * bin_hz
                re = sum(samples[i] * self.window[i] * math.cos(2 * math.pi * bin_idx * i / self.chunk_size) for i in range(0, self.chunk_size, 2))
                im = sum(samples[i] * self.window[i] * math.sin(2 * math.pi * bin_idx * i / self.chunk_size) for i in range(0, self.chunk_size, 2))
                mag = math.sqrt(re * re + im * im) / (self.chunk_size / 4)
                if freq < 60.0:
                    sub_acc = max(sub_acc, mag)
                else:
                    bass_acc = max(bass_acc, mag)

            for bin_idx in [8, 16, 32]: # 375 Hz - 1500 Hz (Mids)
                re = sum(samples[i] * self.window[i] * math.cos(2 * math.pi * bin_idx * i / self.chunk_size) for i in range(0, self.chunk_size, 4))
                im = sum(samples[i] * self.window[i] * math.sin(2 * math.pi * bin_idx * i / self.chunk_size) for i in range(0, self.chunk_size, 4))
                mag = math.sqrt(re * re + im * im) / (self.chunk_size / 8)
                mids_acc = max(mids_acc, mag)

            for bin_idx in [90, 150]: # 4200 Hz - 7000 Hz (Treble)
                re = sum(samples[i] * self.window[i] * math.cos(2 * math.pi * bin_idx * i / self.chunk_size) for i in range(0, self.chunk_size, 4))
                im = sum(samples[i] * self.window[i] * math.sin(2 * math.pi * bin_idx * i / self.chunk_size) for i in range(0, self.chunk_size, 4))
                mag = math.sqrt(re * re + im * im) / (self.chunk_size / 8)
                treble_acc = max(treble_acc, mag)

            # Smooth interpolation
            self.sub_bass = max(0.05, min(1.0, sub_acc * 2.5))
            self.bass = max(0.05, min(1.0, bass_acc * 2.5))
            self.mids = max(0.05, min(1.0, mids_acc * 3.0))
            self.treble = max(0.05, min(1.0, treble_acc * 3.5))
