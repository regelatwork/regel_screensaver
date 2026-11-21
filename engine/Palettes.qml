import QtQuick

QtObject {
    id: root

    readonly property var fluidPalettes: [
        { name: "Cyber Neon (Default)",        bg: "#02040a", dye1: "#00d4ff", dye2: "#ff007f", dye3: "#ffaa00" },
        { name: "Bioluminescent Abyssal",      bg: "#01080e", dye1: "#00ffa3", dye2: "#00c8ff", dye3: "#a855f7" },
        { name: "Solar Flare / Magma",         bg: "#0d0402", dye1: "#ff9900", dye2: "#ff2200", dye3: "#ffffff" },
        { name: "Quicksilver Metal",           bg: "#08080a", dye1: "#e2e8f0", dye2: "#94a3b8", dye3: "#38bdf8" },
        { name: "Nordic Aurora",               bg: "#020712", dye1: "#10b981", dye2: "#06b6d4", dye3: "#ec4899" }
    ]

    readonly property var petriPalettes: [
        { name: "Deep Sea Abyssal (Cyan/Emerald)",   bg: "#01080e", membrane: "#00ffa3", organelle: "#00c8ff", glow: "#a855f7" },
        { name: "Bioluminescent Phytoplankton",      bg: "#020d10", membrane: "#00ffa3", organelle: "#ffcc00", glow: "#00e5ff" },
        { name: "Solar Extremophile (Thermal Vent)", bg: "#0d0402", membrane: "#ff5500", organelle: "#ffcc00", glow: "#ff0044" },
        { name: "Ethereal Ghost Amoeba",             bg: "#080a0f", membrane: "#e2e8f0", organelle: "#38bdf8", glow: "#818cf8" },
        { name: "Coral Reef UV Excitation",          bg: "#0a0212", membrane: "#ec4899", organelle: "#a3e635", glow: "#06b6d4" }
    ]

    readonly property var koiPalettes: [
        { name: "Spring Sakura (Aqua & Cherry)",     water: "#083344", pebbles: "#64748b", caustics: "#e0f2fe", accent: "#f472b6" },
        { name: "Kyoto Moss Garden (Jade & Amber)",   water: "#052e16", pebbles: "#475569", caustics: "#bbf7d0", accent: "#f59e0b" },
        { name: "Twilight Fireflies (Midnight Gold)", water: "#0f172a", pebbles: "#334155", caustics: "#93c5fd", accent: "#fbbf24" },
        { name: "Autumn Maple (Tea & Crimson)",       water: "#1c1917", pebbles: "#57534e", caustics: "#fed7aa", accent: "#ef4444" },
        { name: "Sumi-e Monochrome (Zen Charcoal)",   water: "#09090b", pebbles: "#27272a", caustics: "#f4f4f5", accent: "#e4e4e7" }
    ]

    readonly property var cosmicPalettes: [
        { name: "Sagittarius A* (Supermassive Singularity)", core: "#38bdf8", disk: "#f97316", jets: "#a855f7", nebula: "#0f172a" },
        { name: "M87* (Supergiant Elliptical Shadow)",       core: "#fef08a", disk: "#ea580c", jets: "#6366f1", nebula: "#18181b" },
        { name: "Cygnus X-1 (Stellar Microquasar)",          core: "#67e8f9", disk: "#2563eb", jets: "#ec4899", nebula: "#030712" },
        { name: "Magnetar SGR 1806-20 (Ultra-Magnetic)",     core: "#a7f3d0", disk: "#059669", jets: "#f43f5e", nebula: "#042f2e" },
        { name: "Gargantua (Kerr Extreme Horizon)",          core: "#ffffff", disk: "#eab308", jets: "#8b5cf6", nebula: "#09090b" },
        { name: "Blazar 3C 273 (Relativistic Jet Alignment)", core: "#f472b6", disk: "#fb923c", jets: "#38bdf8", nebula: "#1e1b4b" }
    ]

    readonly property var cityPalettes: [
        { name: "Neo-Tokyo Outrun (Cyan & Magenta)",        sky: "#180c2e", neon1: "#06b6d4", neon2: "#ec4899", grid: "#8b5cf6" },
        { name: "Blade Runner 2049 (Amber Smog & Deep Cyan)", sky: "#1c1917", neon1: "#38bdf8", neon2: "#f59e0b", grid: "#ea580c" },
        { name: "Matrix Phosphor (Terminal Emerald & Mint)",   sky: "#022c22", neon1: "#34d399", neon2: "#10b981", grid: "#059669" },
        { name: "Syndicate Blood (Crimson Hazard & Gold)",    sky: "#1a050b", neon1: "#ef4444", neon2: "#facc15", grid: "#dc2626" },
        { name: "Retrowave Sunset (Electric Purple & Coral)", sky: "#2e1065", neon1: "#a855f7", neon2: "#fb923c", grid: "#f43f5e" }
    ]

    readonly property var biomePalettes: [
        { name: "Yakushima Ancient Forest (Ghibli Emerald)", sky: "#0f172a", foliage: "#15803d", sunMoon: "#fde047", wisp: "#facc15" },
        { name: "Sakura Spring Dawn (Cherry & Lavender)",    sky: "#1e1b4b", foliage: "#f472b6", sunMoon: "#fda4af", wisp: "#f43f5e" },
        { name: "Autumn Koyo Harvest (Crimson & Amber)",     sky: "#1c1917", foliage: "#dc2626", sunMoon: "#f97316", wisp: "#fbbf24" },
        { name: "Alpine Winter Twilight (Frost & Snow)",     sky: "#020617", foliage: "#38bdf8", sunMoon: "#e0f2fe", wisp: "#67e8f9" },
        { name: "Midnight Bioluminescence (Obsidian & Jade)", sky: "#030712", foliage: "#10b981", sunMoon: "#a7f3d0", wisp: "#34d399" }
    ]

    readonly property var harpPalettes: [
        { name: "Moonlit Gossamer (Silver & Diamond Dew)",  silk: "#e2e8f0", dew: "#67e8f9", resonance: "#38bdf8", voidColor: "#050814" },
        { name: "Golden Laser Harp (Amber & Topaz Dew)",    silk: "#fef08a", dew: "#facc15", resonance: "#f59e0b", voidColor: "#0c0a00" },
        { name: "Bioluminescent Abyssal (Emerald & Jade)",  silk: "#a7f3d0", dew: "#34d399", resonance: "#10b981", voidColor: "#022c22" },
        { name: "Electric Synapse (Magenta & Violet)",      silk: "#f472b6", dew: "#ec4899", resonance: "#a855f7", voidColor: "#18021a" },
        { name: "Frost Crystal Web (Ice Blue & Rime)",      silk: "#f0f9ff", dew: "#bae6fd", resonance: "#7dd3fc", voidColor: "#021220" }
    ]

    readonly property var consolePalettes: [
        { name: "Tektronix 1974 (Classic Brushed Dark Aluminum & P1 Green)", chassis: "#18191e", dial: "#f5f0e6", bezel: "#252730", scope: "#0f2814", needle: "#d9381e", accent: "#38bdf8" },
        { name: "Apollo Mission Control (Battleship Gray & Amber Nixie)",      chassis: "#272a30", dial: "#eae5d8", bezel: "#3a3e47", scope: "#1c221a", needle: "#e11d48", accent: "#f59e0b" },
        { name: "Military Field Spec (Olive Drab & Night Phosphor)",          chassis: "#1a1f18", dial: "#0d1810", bezel: "#283025", scope: "#071c0d", needle: "#eab308", accent: "#22c55e" },
        { name: "Vacuum Tube Audio Desk (Smoked Walnut & Warm Tungsten)",     chassis: "#1e1614", dial: "#fef3c7", bezel: "#382924", scope: "#241912", needle: "#ef4444", accent: "#ea580c" },
        { name: "Cyber-Laboratory 2088 (Dark Titanium & Cyan Oscilloscope)",   chassis: "#0d1117", dial: "#161b22", bezel: "#21262d", scope: "#051e28", needle: "#06b6d4", accent: "#ec4899" }
    ]

    readonly property var glyphPalettes: [
        { name: "Song Celadon & Kintsugi Porcelain (Default)",   stone: "#0a241c", porcelain: "#e6f2ec", gold: "#d4af37", sheen: "#52b788", voidColor: "#020a07", glitter: 0.75, iridescence: 0.90, holo: 1.00, holoMode: 0.35, filmRegime: 0.45, substrateId: 0,  sealStyle: 1 },
        { name: "Tenmoku Oil-Spot Ceramic",                      stone: "#0e0a0d", porcelain: "#2c2220", gold: "#d6944b", sheen: "#4ea8de", voidColor: "#040203", glitter: 1.15, iridescence: 1.55, holo: 1.10, holoMode: 0.60, filmRegime: 0.18, substrateId: 1,  sealStyle: 2 },
        { name: "Carrara Marble & Rose Gold",                    stone: "#2a2124", porcelain: "#fdf2e9", gold: "#e07a5f", sheen: "#f4a261", voidColor: "#140d10", glitter: 0.65, iridescence: 0.70, holo: 1.05, holoMode: 0.45, filmRegime: 0.55, substrateId: 2,  sealStyle: 2 },
        { name: "Lapislazuli & Pyrite Seals",                    stone: "#0d1b2a", porcelain: "#e0e1dd", gold: "#e5b05c", sheen: "#415a77", voidColor: "#050a12", glitter: 1.05, iridescence: 0.90, holo: 1.35, holoMode: 1.00, filmRegime: 0.40, substrateId: 2,  sealStyle: 0 },
        { name: "Volcanic Obsidian & Prismatic Foil",            stone: "#090a0e", porcelain: "#1c2430", gold: "#66fcf1", sheen: "#c77dff", voidColor: "#000000", glitter: 1.10, iridescence: 1.85, holo: 1.55, holoMode: 1.00, filmRegime: 0.12, substrateId: 3,  sealStyle: 0 },
        { name: "Cybernetic Bismuth Monolith",                   stone: "#14181c", porcelain: "#f0f3f5", gold: "#ffb703", sheen: "#00b4d8", voidColor: "#090a0c", glitter: 1.25, iridescence: 1.75, holo: 1.65, holoMode: 1.00, filmRegime: 0.05, substrateId: 4,  sealStyle: 0 },
        { name: "Hammered Platinum & Starlight Diamond",         stone: "#11141b", porcelain: "#f5f8fc", gold: "#e2e8f0", sheen: "#67e8f9", voidColor: "#04060a", glitter: 1.95, iridescence: 1.15, holo: 1.80, holoMode: 1.00, filmRegime: 0.30, substrateId: 5,  sealStyle: 0 },
        { name: "Abalone Shell & Fire Opal Nacre",               stone: "#041c1e", porcelain: "#1a6b78", gold: "#2dd4bf", sheen: "#a78bfa", voidColor: "#020d0e", glitter: 1.40, iridescence: 2.00, holo: 1.45, holoMode: 1.00, filmRegime: 1.00, substrateId: 6,  sealStyle: 0 },
        { name: "Tiger-Flame Maple Lutherie",                    stone: "#3b1f0e", porcelain: "#f5dca4", gold: "#d98a36", sheen: "#f6c270", voidColor: "#140903", glitter: 0.45, iridescence: 0.85, holo: 1.15, holoMode: 0.25, filmRegime: 0.35, substrateId: 7,  sealStyle: 3 },
        { name: "Burl Walnut & French Polish",                   stone: "#1d100a", porcelain: "#6b3822", gold: "#e2b15b", sheen: "#b87a4b", voidColor: "#0a0503", glitter: 0.55, iridescence: 0.65, holo: 1.10, holoMode: 0.40, filmRegime: 0.25, substrateId: 8,  sealStyle: 2 },
        { name: "Shou Sugi Ban Charred Cedar",                   stone: "#0f0c0b", porcelain: "#7a4424", gold: "#e8b04b", sheen: "#c96d3b", voidColor: "#040303", glitter: 0.85, iridescence: 0.95, holo: 1.35, holoMode: 0.85, filmRegime: 0.15, substrateId: 9,  sealStyle: 0 },
        { name: "Workshop Pine & Holo Stickers",                 stone: "#5e472f", porcelain: "#c9ad86", gold: "#d9a05b", sheen: "#8a6d4b", voidColor: "#1f150c", glitter: 0.35, iridescence: 0.45, holo: 1.75, holoMode: 0.65, filmRegime: 0.60, substrateId: 10, sealStyle: 0 },
        { name: "Weathered Silver Driftwood",                    stone: "#3c3b38", porcelain: "#a6a298", gold: "#9e8c74", sheen: "#7d858c", voidColor: "#161614", glitter: 0.30, iridescence: 0.35, holo: 1.25, holoMode: 0.20, filmRegime: 0.70, substrateId: 11, sealStyle: 4 }
    ]

    function getNames(paletteList) {
        let list = [];
        for (let i = 0; i < paletteList.length; ++i) {
            list.push(paletteList[i].name);
        }
        return list;
    }
}
