import QtQuick

Item {
    id: root
    anchors.fill: parent

    // Interactive and reactive simulation properties
    property real simTime: 0.0
    property real keystrokeEnergy: 0.0
    property real shockwaveIntensity: 0.0
    property real vortexSpeed: 1.0
    property real bass: 0.08
    property real mids: 0.05
    property real treble: 0.05
    property point pointerPos: Qt.point(0.5, 0.5)
    property point pointerVel: Qt.point(0.0, 0.0)

    // Interactive Coordinate Mapping
    property point keystrokePos: Qt.point(0.5, 0.5)
    property point keystrokeDir: Qt.point(0.0, 1.0)
    property point beatCenter: Qt.point(0.5, 0.5)
    property point ambientDrift: Qt.point(0.0, 0.0)

    // Embossed Glyph & Material Controls (Expanded 4x scroll speed range)
    property real scrollSpeed: 1.2
    property real embossDepth: 1.0
    property real glitterDensity: 0.85
    property real iridescenceStrength: 1.0
    property real holoStrength: 1.0

    // Configurable Spacing, Zoom, and Patterned Holo Foil Mode
    property real glyphSpacing: 1.2 // Range 0.6..2.5
    property real glyphZoom: 1.0    // Range 0.4..3.0
    property real holoMode: 1.0     // 0.0: global surface diffraction, 1.0: patterned glyph foil stamping

    // Theme auto-cycling controls
    property bool autoCycleThemes: true
    property real cycleInterval: 24.0
    property int paletteIndex: 0
    property int currentPaletteIndex: 0

    // Dynamic Text / Fortune Command Integration
    property int textSourceMode: 0 // 0: Command/Fortune, 1: Classical Quotes, 2: Custom Text
    property string textCommand: "/usr/games/fortune -s"
    property string customText: "The moving finger writes; and, having writ, moves on."
    property string externalFortune: ""
    property string rawFortune: ""
    property string fortuneQuote: "A thing is not necessarily true because a man dies for it."
    property string fortuneAuthor: "— Oscar Wilde"
    property var engineBridge: null
    property bool isStarted: false

    onExternalFortuneChanged: {
        if (!externalFortune || externalFortune.trim().length === 0) return
        if (root.isStarted && root.quoteIsOnScreen) {
            // A quote is currently visible on screen: wait until it goes off screen before changing it!
            root.pendingFortune = externalFortune
            root.hasPendingFortune = true
        } else {
            // Currently off screen (or during startup): apply immediately!
            root.parseFortune(externalFortune)
            root.hasPendingFortune = false
            root.pendingFortune = ""
        }
    }

    // Curated Typographic Profiles spanning diverse fonts and weights
    readonly property var fontProfiles: [
        {
            name: "Classical Antiqua",
            quoteFamily: "Palatino, Garamond, Noto Serif, Georgia, serif",
            quoteWeight: Font.Medium,
            quoteItalic: true,
            quoteLetterSpacing: 0,
            lineHeight: 1.30,
            authorFamily: "Noto Sans, Inter, Helvetica, sans-serif",
            authorWeight: Font.DemiBold
        },
        {
            name: "Editorial Didone",
            quoteFamily: "Didot, Bodoni MT, Playfair Display, Noto Serif, serif",
            quoteWeight: Font.Light,
            quoteItalic: false,
            quoteLetterSpacing: 0.8,
            lineHeight: 1.24,
            authorFamily: "Inter, Helvetica Neue, Noto Sans, sans-serif",
            authorWeight: Font.Bold
        },
        {
            name: "Monumental Grotesque",
            quoteFamily: "Inter, Helvetica Neue, Roboto, Noto Sans, sans-serif",
            quoteWeight: Font.Black,
            quoteItalic: false,
            quoteLetterSpacing: 1.2,
            lineHeight: 1.20,
            authorFamily: "Noto Serif, Georgia, serif",
            authorWeight: Font.Medium
        },
        {
            name: "Humanist Book Serif",
            quoteFamily: "Baskerville, Constantia, Noto Serif, serif",
            quoteWeight: Font.Normal,
            quoteItalic: true,
            quoteLetterSpacing: 0.4,
            lineHeight: 1.34,
            authorFamily: "Noto Sans, Inter, sans-serif",
            authorWeight: Font.Bold
        },
        {
            name: "Lapidary Epigraphic",
            quoteFamily: "Cinzel, Trajan Pro, Noto Serif, serif",
            quoteWeight: Font.Bold,
            quoteItalic: false,
            quoteLetterSpacing: 2.2,
            lineHeight: 1.26,
            authorFamily: "Noto Sans, Inter, sans-serif",
            authorWeight: Font.ExtraBold
        },
        {
            name: "Technical Monospace",
            quoteFamily: "JetBrains Mono, Fira Code, Source Code Pro, monospace",
            quoteWeight: Font.Medium,
            quoteItalic: false,
            quoteLetterSpacing: 0.8,
            lineHeight: 1.28,
            authorFamily: "JetBrains Mono, Fira Code, monospace",
            authorWeight: Font.Bold
        }
    ]

    property int fontProfileIndex: 0
    readonly property var currentFontProfile: fontProfiles[fontProfileIndex % fontProfiles.length]

    readonly property var fallbackFortunes: [
        {
            quote: "A thing is not necessarily true because a man dies for it.",
            author: "— Oscar Wilde"
        },
        {
            quote: "The soul becomes dyed with the color of its thoughts.",
            author: "— Marcus Aurelius"
        },
        {
            quote: "The moving finger writes; and, having writ, moves on.",
            author: "— Omar Khayyam"
        },
        {
            quote: "Nature does not hurry, yet everything is accomplished.",
            author: "— Lao Tzu"
        },
        {
            quote: "Tempt not a desperate man.",
            author: "— William Shakespeare"
        },
        {
            quote: "Reserve your right to think, for even to think wrongly is better than not to think at all.",
            author: "— Hypatia of Alexandria"
        },
        {
            quote: "Simplicity is the ultimate sophistication.",
            author: "— Leonardo da Vinci"
        },
        {
            quote: "No man steps into the same river twice, for it's not the same river and he's not the same man.",
            author: "— Heraclitus"
        },
        {
            quote: "While we wait for life, life passes.",
            author: "— Seneca"
        },
        {
            quote: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
            author: "— Siddhartha Gautama"
        },
        {
            quote: "The wound is the place where the Light enters you.",
            author: "— Rumi"
        },
        {
            quote: "Hope is the thing with feathers that perches in the soul.",
            author: "— Emily Dickinson"
        },
        {
            quote: "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.",
            author: "— Albert Einstein"
        },
        {
            quote: "Somewhere, something incredible is waiting to be known.",
            author: "— Carl Sagan"
        },
        {
            quote: "I would rather have questions that can't be answered than answers that can't be questioned.",
            author: "— Richard Feynman"
        },
        {
            quote: "He who has a why to live can bear almost any how.",
            author: "— Friedrich Nietzsche"
        },
        {
            quote: "Do not go where the path may lead, go instead where there is no path and leave a trail.",
            author: "— Ralph Waldo Emerson"
        },
        {
            quote: "The world is but a canvas to our imagination.",
            author: "— Henry David Thoreau"
        },
        {
            quote: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.",
            author: "— Alan Watts"
        },
        {
            quote: "Two possibilities exist: either we are alone in the Universe or we are not. Both are equally terrifying.",
            author: "— Arthur C. Clarke"
        },
        {
            quote: "To see a World in a Grain of Sand And a Heaven in a Wild Flower, Hold Infinity in the palm of your hand.",
            author: "— William Blake"
        },
        {
            quote: "Keep your face always toward the sunshine—and shadows will fall behind you.",
            author: "— Walt Whitman"
        },
        {
            quote: "Flow with whatever may happen, and let your mind be free: Stay centered by accepting whatever you are doing.",
            author: "— Zhuangzi"
        },
        {
            quote: "It does not matter how slowly you go as long as you do not stop.",
            author: "— Confucius"
        },
        {
            quote: "Knowing yourself is the beginning of all wisdom.",
            author: "— Aristotle"
        },
        {
            quote: "The good life is one inspired by love and guided by knowledge.",
            author: "— Bertrand Russell"
        },
        {
            quote: "That brain of mine is something more than merely mortal; as time will show.",
            author: "— Ada Lovelace"
        },
        {
            quote: "Sometimes it is the people no one imagines anything of who do the things that no one can imagine.",
            author: "— Alan Turing"
        },
        {
            quote: "All things excellent are as difficult as they are rare.",
            author: "— Baruch Spinoza"
        },
        {
            quote: "The most certain sign of wisdom is cheerfulness.",
            author: "— Michel de Montaigne"
        },
        {
            quote: "Even the darkest night will end and the sun will rise.",
            author: "— Victor Hugo"
        },
        {
            quote: "Let everything happen to you: beauty and terror. Just keep going. No feeling is final.",
            author: "— Rainer Maria Rilke"
        },
        {
            quote: "Time is a river which carries me along, but I am the river.",
            author: "— Jorge Luis Borges"
        },
        {
            quote: "What is essential is invisible to the eye.",
            author: "— Antoine de Saint-Exupéry"
        },
        {
            quote: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.",
            author: "— Marcus Aurelius"
        }
    ]

    property int fallbackIndex: 0

    function parseFortune(text) {
        if (!text || text.trim().length === 0) return
        root.rawFortune = text
        var parts = text.split("\n--")
        if (parts.length > 1) {
            root.fortuneQuote = parts[0].replace(/\t+/g, " ").replace(/\n+/g, " ").trim()
            root.fortuneAuthor = "— " + parts[1].replace(/\t+/g, " ").replace(/\n+/g, " ").trim()
        } else {
            var lines = text.trim().split("\n")
            if (lines.length > 1 && lines[lines.length - 1].trim().startsWith("--")) {
                root.fortuneAuthor = lines[lines.length - 1].trim().replace(/^--\s*/, "— ")
                lines.pop()
                root.fortuneQuote = lines.join(" ").replace(/\t+/g, " ").trim()
            } else {
                root.fortuneQuote = text.replace(/\t+/g, " ").replace(/\n+/g, " ").trim()
                root.fortuneAuthor = ""
            }
        }
        root.fontProfileIndex = (root.fontProfileIndex + 1) % root.fontProfiles.length
    }

    function nextFallbackFortune() {
        root.fallbackIndex = (root.fallbackIndex + 1) % root.fallbackFortunes.length
        var item = root.fallbackFortunes[root.fallbackIndex]
        root.fortuneQuote = item.quote
        root.fortuneAuthor = item.author
        root.fontProfileIndex = (root.fontProfileIndex + 1) % root.fontProfiles.length
    }

    Timer {
        id: xhrFallbackTimer
        interval: 100
        repeat: false
        onTriggered: {
            if (!root.isStarted || !root.quoteIsOnScreen) {
                root.nextFallbackFortune()
            }
        }
    }

    function fetchFortune() {
        // 0. External fortune (D-Bus or parent component)
        if (root.externalFortune && root.externalFortune.trim().length > 0) {
            if (root.isStarted && root.quoteIsOnScreen) {
                root.pendingFortune = root.externalFortune
                root.hasPendingFortune = true
            } else {
                root.parseFortune(root.externalFortune)
            }
            return
        }

        // 1. Direct Python bridge execution (harness runner)
        if (root.engineBridge && typeof root.engineBridge.fetchFortuneText === "function") {
            var output = root.engineBridge.fetchFortuneText(root.textCommand)
            if (output && output.trim().length > 0) {
                if (root.isStarted && root.quoteIsOnScreen) {
                    root.pendingFortune = output
                    root.hasPendingFortune = true
                } else {
                    root.parseFortune(output)
                }
                return
            }
        }

        // 2. Query /tmp/regel_fortune.txt with cache busting (written by regel-daemon)
        try {
            var xhr = new XMLHttpRequest()
            xhr.open("GET", "file:///tmp/regel_fortune.txt?t=" + Date.now())
            xhrFallbackTimer.restart()
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    xhrFallbackTimer.stop()
                    if ((xhr.status === 200 || xhr.status === 0) && xhr.responseText && xhr.responseText.trim().length > 0) {
                        var content = xhr.responseText.trim()
                        if (content !== root.rawFortune) {
                            if (root.isStarted && root.quoteIsOnScreen) {
                                root.pendingFortune = content
                                root.hasPendingFortune = true
                            } else {
                                root.parseFortune(content)
                            }
                            return
                        }
                    }
                    if (!root.isStarted || !root.quoteIsOnScreen) {
                        root.nextFallbackFortune()
                    }
                }
            }
            xhr.send()
        } catch (err) {
            xhrFallbackTimer.stop()
            if (!root.isStarted || !root.quoteIsOnScreen) {
                root.nextFallbackFortune()
            }
        }
    }

    function refreshText() {
        if (root.textSourceMode === 2) {
            root.parseFortune(root.customText)
            return
        }
        if (root.textSourceMode === 1) {
            root.nextFallbackFortune()
            return
        }
        root.fetchFortune()
    }

    onTextSourceModeChanged: refreshText()
    onCustomTextChanged: {
        if (root.textSourceMode === 2) refreshText()
    }

    // Dynamic scroll tracking in quote coordinate space (scale 0.055, period 1.0)
    // Synchronized with the material coordinate displacement in glyph.frag
    readonly property real currentScrollTime: simTime * 0.035 * scrollSpeed * (0.8 + vortexSpeed * 0.4)
    readonly property real currentScrollVecY: 0.32 * currentScrollTime + ambientDrift.y
    readonly property real currentCenterPosY: 1.9 * Math.max(0.25, glyphZoom) + currentScrollVecY
    readonly property real currentQuoteCoordY: currentCenterPosY * 0.055 + 0.45
    readonly property int currentQuoteCycle: Math.floor(currentQuoteCoordY)
    readonly property real currentQuotePhase: (currentQuoteCoordY - currentQuoteCycle + 1.0) % 1.0

    // Dynamic half-extent of viewport in quoteCoord space
    readonly property real screenHalfHeightInQuoteSpace: 1.9 * Math.max(0.25, glyphZoom) * 0.055
    // Safety clearance guaranteeing the quote box and its emboss are 100% outside the viewport
    readonly property real quoteOffscreenMargin: screenHalfHeightInQuoteSpace + quoteHalfH + 0.025
    // Phase distance from screen center (0.5)
    readonly property real quoteDistanceFromCenter: Math.abs(currentQuotePhase - 0.5)
    // Exactly one quote tablet exists per period; it is on screen if its distance from screen center is within the visible bound
    readonly property bool quoteIsOnScreen: quoteDistanceFromCenter <= quoteOffscreenMargin
    readonly property bool quoteIsOffscreen: !quoteIsOnScreen

    property string pendingFortune: ""
    property bool hasPendingFortune: false

    function applyNextFortune() {
        if (root.hasPendingFortune && root.pendingFortune.trim().length > 0) {
            root.parseFortune(root.pendingFortune)
            root.hasPendingFortune = false
            root.pendingFortune = ""
        } else {
            root.refreshText()
        }
    }

    onQuoteIsOnScreenChanged: {
        // Triggered exactly when the current quote scrolls completely off the screen!
        if (!quoteIsOnScreen) {
            applyNextFortune()
        }
    }

    // --- Persistent Off-screen Sticker Lifecycle Management ---
    property vector4d stickerSlot0: Qt.vector4d(0.0, 0.0, 0.0, 0.0)
    property vector4d stickerSlot1: Qt.vector4d(0.0, 0.0, 0.0, 0.0)
    property vector4d stickerSlot2: Qt.vector4d(0.0, 0.0, 0.0, 0.0)
    property vector4d stickerSlot3: Qt.vector4d(0.0, 0.0, 0.0, 0.0)
    property vector4d stickerSlot4: Qt.vector4d(0.0, 0.0, 0.0, 0.0)
    property vector4d stickerSlot5: Qt.vector4d(0.0, 0.0, 0.0, 0.0)
    property vector4d stickerSlot6: Qt.vector4d(0.0, 0.0, 0.0, 0.0)
    property vector4d stickerSlot7: Qt.vector4d(0.0, 0.0, 0.0, 0.0)

    property var activeStickerList: []
    property var evaluatedCellKeys: ({})
    property bool stickerLifecycleInitialized: false

    function fract(x) {
        return x - Math.floor(x);
    }

    function hash12(px, py) {
        var x = fract(px * 5.3983);
        var y = fract(py * 5.4427);
        var dotVal = y * (x + 21.5351) + x * (y + 14.3137);
        x += dotVal;
        y += dotVal;
        return fract(x * y * 95.4337);
    }

    function hash22(px, py) {
        var p0 = px * 127.1 + py * 311.7;
        var p1 = px * 269.5 + py * 183.3;
        var f0 = fract(Math.sin(p0) * 43758.5453123);
        var f1 = fract(Math.sin(p1) * 43758.5453123);
        return [-1.0 + 2.0 * f0, -1.0 + 2.0 * f1];
    }

    function getStickerCenter(cx, cy) {
        var sSpacing = 4.2;
        var h = hash22(cx * 53.41 + 8.1, cy * 53.41 + 91.7);
        var jitterX = (h[0] - 0.5) * 0.55;
        var jitterY = (h[1] - 0.5) * 0.55;
        return [
            (cx + 0.5 + jitterX) * sSpacing,
            (cy + 0.5 + jitterY) * sSpacing
        ];
    }

    function updateStickerLifecycle() {
        var aspect = Math.max(1.0, root.width) / Math.max(1.0, root.height);
        var zoom = Math.max(0.25, root.glyphZoom);
        var scaleX = aspect * 3.8 * zoom;
        var scaleY = 3.8 * zoom;

        var scrollTime = root.simTime * 0.035 * root.scrollSpeed * (0.8 + root.vortexSpeed * 0.4);
        var scrollVecX = 0.10 * scrollTime + root.ambientDrift.x;
        var scrollVecY = 0.32 * scrollTime + root.ambientDrift.y;

        // 1. Retain existing active stickers until they completely scroll off-screen (past top/left)
        var keptStickers = [];
        for (var i = 0; i < root.activeStickerList.length; ++i) {
            var stk = root.activeStickerList[i];
            var center = getStickerCenter(stk.cx, stk.cy);
            var uX = (center[0] - scrollVecX) / scaleX;
            var uY = (center[1] - scrollVecY) / scaleY;

            // When uX < -0.25 or uY < -0.25, the sticker has scrolled fully past the screen edge!
            if (uX >= -0.25 && uY >= -0.25) {
                keptStickers.push(stk);
            }
        }

        // 2. Determine cell range currently intersecting or approaching viewport
        var minPosX = scrollVecX - 0.25 * scaleX;
        var maxPosX = scrollVecX + 1.30 * scaleX;
        var minPosY = scrollVecY - 0.25 * scaleY;
        var maxPosY = scrollVecY + 1.30 * scaleY;

        var minCX = Math.floor(minPosX / 4.2) - 1;
        var maxCX = Math.floor(maxPosX / 4.2) + 1;
        var minCY = Math.floor(minPosY / 4.2) - 1;
        var maxCY = Math.floor(maxPosY / 4.2) + 1;

        var curPalette = root.glyphPalettes[root.currentPaletteIndex];
        var curHolo = (curPalette && curPalette.holo !== undefined) ? curPalette.holo : 0.0;
        var themeHasHolo = (curHolo > 0.01);

        if (!root.stickerLifecycleInitialized) {
            root.stickerLifecycleInitialized = true;
            // On initial startup: evaluate current viewport cells
            for (var initCY = minCY; initCY <= maxCY; ++initCY) {
                for (var initCX = minCX; initCX <= maxCX; ++initCX) {
                    var kInit = initCX + "_" + initCY;
                    root.evaluatedCellKeys[kInit] = true;
                    var cInit = getStickerCenter(initCX, initCY);
                    var initUX = (cInit[0] - scrollVecX) / scaleX;
                    var initUY = (cInit[1] - scrollVecY) / scaleY;
                    if (themeHasHolo && initUX >= -0.20 && initUX <= 1.20 && initUY >= -0.20 && initUY <= 1.20) {
                        var hInit = hash12(initCX * 37.19 + 15.3, initCY * 37.19 + 71.9);
                        if (hInit <= 0.44) {
                            keptStickers.push({ cx: initCX, cy: initCY, intensity: curHolo });
                        }
                    }
                }
            }
        } else {
            // Normal scrolling: ONLY spawn when entering from off-screen into the entry boundary (uv in [0.95, 1.25])
            for (var cy = minCY; cy <= maxCY; ++cy) {
                for (var cx = minCX; cx <= maxCX; ++cx) {
                    var key = cx + "_" + cy;
                    if (root.evaluatedCellKeys[key]) continue;

                    var ctr = getStickerCenter(cx, cy);
                    var uvX = (ctr[0] - scrollVecX) / scaleX;
                    var uvY = (ctr[1] - scrollVecY) / scaleY;

                    if (uvX <= 1.25 && uvY <= 1.25) {
                        root.evaluatedCellKeys[key] = true;
                        // Cell is entering from off-screen!
                        if (uvX >= 0.95 || uvY >= 0.95) {
                            var hCandidate = hash12(cx * 37.19 + 15.3, cy * 37.19 + 71.9);
                            if (hCandidate <= 0.44 && themeHasHolo) {
                                keptStickers.push({ cx: cx, cy: cy, intensity: curHolo });
                            }
                        }
                    }
                }
            }
        }

        // 3. Purge evaluated keys far behind the scroll
        var keys = Object.keys(root.evaluatedCellKeys);
        if (keys.length > 50) {
            for (var ki = 0; ki < keys.length; ++ki) {
                var parts = keys[ki].split("_");
                if (parts.length > 1) {
                    var row = parseInt(parts[1], 10);
                    if (row < minCY - 3) {
                        delete root.evaluatedCellKeys[keys[ki]];
                    }
                }
            }
        }

        root.activeStickerList = keptStickers;

        // 4. Update the 8 shader uniform slots
        function getSlot(idx) {
            if (idx < keptStickers.length) {
                var s = keptStickers[idx];
                return Qt.vector4d(s.cx, s.cy, s.intensity, 1.0);
            }
            return Qt.vector4d(0.0, 0.0, 0.0, 0.0);
        }

        root.stickerSlot0 = getSlot(0);
        root.stickerSlot1 = getSlot(1);
        root.stickerSlot2 = getSlot(2);
        root.stickerSlot3 = getSlot(3);
        root.stickerSlot4 = getSlot(4);
        root.stickerSlot5 = getSlot(5);
        root.stickerSlot6 = getSlot(6);
        root.stickerSlot7 = getSlot(7);
    }

    onCurrentScrollTimeChanged: updateStickerLifecycle()
    onCurrentPaletteIndexChanged: updateStickerLifecycle()

    // Fallback safety timer if simulation time is paused
    Timer {
        interval: 30000
        running: root.simTime === 0
        repeat: true
        onTriggered: root.refreshText()
    }

    // Total character volume
    readonly property int quoteLength: (fortuneQuote ? fortuneQuote.length : 0) + (fortuneAuthor ? fortuneAuthor.length : 0)

    // Dynamic golden ratio portrait rectangle scale on the monolith (Height = 1.618034 * Width)
    // Sized to the smallest area that comfortably lets the full quote render with zero dead space
    readonly property real quoteHalfW: {
        if (quoteLength < 35) return 0.085
        if (quoteLength < 70) return 0.098
        if (quoteLength < 130) return 0.110
        if (quoteLength < 210) return 0.122
        return 0.135
    }
    readonly property real quoteHalfH: quoteHalfW * 1.618034

    readonly property int quotePixelSize: {
        if (quoteLength < 35) return 34
        if (quoteLength < 70) return 28
        if (quoteLength < 130) return 24
        if (quoteLength < 210) return 20
        return 17
    }

    // Neural audio rhythm & vocal choreography
    property real beatPhase: 0.0
    property bool beat: false
    property bool downbeat: false
    property real bpm: 120.0
    property bool isVocal: false
    property real vocalEnergy: 0.0
    property bool transientHit: false

    // Dynamic downbeat pulse decay
    property real downbeatPulse: 0.0
    onDownbeatChanged: {
        if (downbeat) {
            downbeatPulse = 1.0
        }
    }

    NumberAnimation on downbeatPulse {
        running: root.downbeatPulse > 0.0
        from: root.downbeatPulse
        to: 0.0
        duration: 260
        easing.type: Easing.OutQuad
    }

    // Central Palette Library reference
    Palettes {
        id: palettes
    }

    readonly property var glyphPalettes: palettes.glyphPalettes

    // Dynamic Palette Colors (Stone, Porcelain, Gold, Sheen, Void)
    property color colorStone: "#081c15"
    property color colorPorcelain: "#edf6f9"
    property color colorGold: "#d4af37"
    property color colorSheen: "#52b788"
    property color colorVoid: "#020907"

    // Smooth transition animations when shifting between themes
    readonly property int animDuration: Math.min(8000, Math.max(1000, Math.round(root.cycleInterval * 400)))

    Behavior on colorStone {
        ColorAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }
    Behavior on colorPorcelain {
        ColorAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }
    Behavior on colorGold {
        ColorAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }
    Behavior on colorSheen {
        ColorAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }
    Behavior on colorVoid {
        ColorAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }
    Behavior on glitterDensity {
        NumberAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }
    Behavior on iridescenceStrength {
        NumberAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }
    Behavior on holoStrength {
        NumberAnimation { duration: root.animDuration; easing.type: Easing.InOutSine }
    }

    function applyPalette(p) {
        if (!p) return
        colorStone = Qt.color(p.stone)
        colorPorcelain = Qt.color(p.porcelain)
        colorGold = Qt.color(p.gold)
        colorSheen = Qt.color(p.sheen)
        colorVoid = Qt.color(p.voidColor)
        if (p.glitter !== undefined) root.glitterDensity = p.glitter
        if (p.iridescence !== undefined) root.iridescenceStrength = p.iridescence
        if (p.holo !== undefined) root.holoStrength = p.holo
        if (p.holoMode !== undefined) root.holoMode = p.holoMode
    }

    function setGlyphPalette(idx) {
        if (idx < 0 || idx >= glyphPalettes.length) return
        currentPaletteIndex = idx
        applyPalette(glyphPalettes[idx])
    }

    onPaletteIndexChanged: {
        if (!autoCycleThemes) {
            setGlyphPalette(paletteIndex % glyphPalettes.length)
        }
    }

    onAutoCycleThemesChanged: {
        if (!autoCycleThemes) {
            setGlyphPalette(paletteIndex % glyphPalettes.length)
        }
    }

    Component.onCompleted: {
        // Pick a random starting quote and typographic profile on launch
        fallbackIndex = Math.floor(Math.random() * fallbackFortunes.length)
        var initItem = fallbackFortunes[fallbackIndex]
        fortuneQuote = initItem.quote
        fortuneAuthor = initItem.author
        fontProfileIndex = Math.floor(Math.random() * fontProfiles.length)

        setGlyphPalette(autoCycleThemes ? 0 : (paletteIndex % glyphPalettes.length))
        updateStickerLifecycle()
        isStarted = true
    }

    // Theme auto-cycling timer with smooth continuous shifting
    Timer {
        id: cycleTimer
        interval: Math.max(3000, Math.round(root.cycleInterval * 1000))
        running: root.autoCycleThemes
        repeat: true
        onTriggered: {
            var nextIdx = (root.currentPaletteIndex + 1) % root.glyphPalettes.length
            root.setGlyphPalette(nextIdx)
        }
    }

    // --- Offscreen Inscription Canvas Rasterizer (512 x 828, Portrait Golden Ratio 1 : 1.618034) ---
    // Pure monumental typography in portrait golden ratio with NO border frame and tight margins
    Item {
        id: textCanvas
        x: -20000
        y: -20000
        width: 512
        height: 828
        visible: true
        layer.enabled: true

        Rectangle {
            anchors.fill: parent
            color: "#000000"
        }

        Item {
            anchors.fill: parent
            anchors.margins: 28

            Column {
                anchors.centerIn: parent
                width: parent.width
                spacing: Math.max(12, Math.min(22, Math.round(root.quotePixelSize * 0.65)))

                Text {
                    width: parent.width
                    text: "“" + root.fortuneQuote + "”"
                    font.family: root.currentFontProfile.quoteFamily
                    font.pixelSize: root.quotePixelSize
                    font.weight: root.currentFontProfile.quoteWeight
                    font.italic: root.currentFontProfile.quoteItalic
                    font.letterSpacing: root.currentFontProfile.quoteLetterSpacing
                    color: "#ffffff"
                    wrapMode: Text.WordWrap
                    horizontalAlignment: Text.AlignHCenter
                    lineHeight: root.currentFontProfile.lineHeight
                    maximumLineCount: 16
                    elide: Text.ElideRight
                }

                Item {
                    width: parent.width
                    height: 1
                    visible: root.fortuneAuthor.length > 0
                    Rectangle {
                        anchors.horizontalCenter: parent.horizontalCenter
                        width: Math.min(200, parent.width * 0.45)
                        height: 1
                        color: "#66ffffff"
                    }
                }

                Text {
                    width: parent.width
                    text: root.fortuneAuthor
                    visible: root.fortuneAuthor.length > 0
                    font.family: root.currentFontProfile.authorFamily
                    font.pixelSize: Math.max(14, Math.round(root.quotePixelSize * 0.72))
                    font.weight: root.currentFontProfile.authorWeight
                    font.letterSpacing: 2
                    color: "#dddddd"
                    horizontalAlignment: Text.AlignHCenter
                }
            }
        }
    }

    ShaderEffectSource {
        id: textSource
        sourceItem: textCanvas
        hideSource: true
        live: true
        smooth: true
    }

    ShaderEffect {
        id: glyphShader
        anchors.fill: parent

        // Audio choreography: Safe, non-flashing, stable illumination
        readonly property real effectiveShockwave: root.shockwaveIntensity
        readonly property real effectiveTreble: root.treble
        readonly property real effectiveMids: root.mids
        readonly property real effectiveBass: root.bass

        // Uniforms matching GLSL std140 uniform block in glyph.frag (416 bytes total)
        property vector2d u_resolution: Qt.vector2d(Math.max(1.0, root.width), Math.max(1.0, root.height))
        property vector2d u_pointer: Qt.vector2d(root.pointerPos.x, root.pointerPos.y)
        property vector2d u_pointer_vel: Qt.vector2d(root.pointerVel.x, root.pointerVel.y)
        property vector2d u_keystroke_pos: Qt.vector2d(root.keystrokePos.x, root.keystrokePos.y)
        property vector2d u_keystroke_dir: Qt.vector2d(root.keystrokeDir.x, root.keystrokeDir.y)
        property vector2d u_beat_center: Qt.vector2d(root.beatCenter.x, root.beatCenter.y)
        property vector2d u_ambient_drift: Qt.vector2d(root.ambientDrift.x, root.ambientDrift.y)

        property color u_color_stone: root.colorStone
        property color u_color_porcelain: root.colorPorcelain
        property color u_color_gold: root.colorGold
        property color u_color_sheen: root.colorSheen
        property color u_color_void: root.colorVoid

        property real u_time: root.simTime
        property real u_keystroke_energy: root.keystrokeEnergy
        property real u_shockwave_intensity: effectiveShockwave
        property real u_vortex_speed: root.vortexSpeed
        property real u_bass: effectiveBass
        property real u_mids: effectiveMids
        property real u_treble: effectiveTreble
        property real u_scroll_speed: root.scrollSpeed
        property real u_emboss_depth: root.embossDepth
        property real u_glitter_density: root.glitterDensity
        property real u_iridescence_strength: root.iridescenceStrength
        property real u_holo_strength: root.holoStrength
        property real u_glyph_spacing: root.glyphSpacing
        property real u_glyph_zoom: root.glyphZoom
        property real u_holo_mode: root.holoMode
        property real u_pad1: 0.0
        property vector2d u_quote_size: Qt.vector2d(root.quoteHalfW, root.quoteHalfH)
        property real u_pad2: 0.0
        property real u_pad3: 0.0

        property vector4d u_sticker0: root.stickerSlot0
        property vector4d u_sticker1: root.stickerSlot1
        property vector4d u_sticker2: root.stickerSlot2
        property vector4d u_sticker3: root.stickerSlot3
        property vector4d u_sticker4: root.stickerSlot4
        property vector4d u_sticker5: root.stickerSlot5
        property vector4d u_sticker6: root.stickerSlot6
        property vector4d u_sticker7: root.stickerSlot7

        property var u_text_texture: textSource

        vertexShader: Qt.resolvedUrl("shaders/glyph.vert.qsb")
        fragmentShader: Qt.resolvedUrl("shaders/glyph.frag.qsb")
    }
}
