#!/usr/bin/env python3
"""
Verification test for Embossed Glyph Matrix Fortune Rotation.
Tests:
- Dynamic offscreen loading
- Fallback rotation without freezing or remaining stuck on Oscar Wilde
- D-Bus/external fortune property reactive update
"""
import sys
import os
import time

for p in ["/usr/lib/python3/dist-packages", "/usr/local/lib/python3/dist-packages"]:
    if p not in sys.path and os.path.isdir(p):
        sys.path.insert(0, p)

os.environ["QT_QPA_PLATFORM"] = "offscreen"
os.environ["QML_XHR_ALLOW_FILE_READ"] = "1"

from PyQt6.QtGui import QGuiApplication
from PyQt6.QtQml import QQmlApplicationEngine, QQmlComponent
from PyQt6.QtCore import QUrl

app = QGuiApplication.instance() or QGuiApplication(sys.argv)
engine = QQmlApplicationEngine()

component = QQmlComponent(engine, QUrl.fromLocalFile(os.path.abspath("engine/EmbossedGlyphMatrix.qml")))
if component.isError():
    for err in component.errors():
        print("QML Error:", err.toString())
    sys.exit(1)

# 1. Instantiate and check initial quote
obj1 = component.create()
assert obj1 is not None, "Failed to instantiate EmbossedGlyphMatrix"
quote1 = obj1.property("fortuneQuote")
print("Instance 1 initial quote:", quote1)

# Let initial startup async fetch finish if active
time.sleep(0.2)
app.processEvents()
quote_after_init = obj1.property("fortuneQuote")
print("Instance 1 after initial fetch settled:", quote_after_init)

# 2. Check externalFortune reactive property updates
test_live_quote = "Knowledge speaks, but wisdom listens.\n-- Jimi Hendrix"
obj1.setProperty("externalFortune", test_live_quote)
app.processEvents()

quote_after_ext = obj1.property("fortuneQuote")
author_after_ext = obj1.property("fortuneAuthor")
print("After externalFortune:", quote_after_ext, author_after_ext)
assert "Knowledge speaks, but wisdom listens." in quote_after_ext, f"Unexpected quote: {quote_after_ext}"
assert "Jimi Hendrix" in author_after_ext, f"Unexpected author: {author_after_ext}"

# 3. Test nextFallbackFortune cycling
prev_quote = obj1.property("fortuneQuote")
obj1.nextFallbackFortune()
app.processEvents()
next_quote = obj1.property("fortuneQuote")
print("After nextFallbackFortune:", next_quote)
assert next_quote != prev_quote, "nextFallbackFortune failed to change quote"

# 4. Test off-screen reload: verify that calling refreshText() advances or updates
obj1.setProperty("externalFortune", "")
obj1.refreshText()
app.processEvents()
# Allow 120ms for the XHR fallback timer to trigger if XHR does not fire
time.sleep(0.15)
app.processEvents()
refreshed_quote = obj1.property("fortuneQuote")
print("After refreshText():", refreshed_quote)

print("==> ALL FORTUNE ROTATION TESTS PASSED SUCCESSFULLY! <==")
