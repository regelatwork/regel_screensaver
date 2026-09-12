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

    function getNames(paletteList) {
        let list = [];
        for (let i = 0; i < paletteList.length; ++i) {
            list.push(paletteList[i].name);
        }
        return list;
    }
}
