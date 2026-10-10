/**
 * ============================================================================
 * TREVA ECOSYSTEM - GLOBAL THEME & CUSTOMIZATION ENGINE
 * Manages active theme preset, custom CSS variables, typography & persistence
 * ============================================================================
 */

(function() {
    const THEME_STORAGE_KEY = 'treva_portal_theme_config';

    // Preset Definitions with complete design tokens
    window.THEME_PRESETS = {
        'default': {
            name: 'Default Sage SaaS',
            category: 'Modern SaaS',
            class: 'theme-default',
            vars: {
                '--bg': '#E1E9E1',
                '--card': '#FFFFFF',
                '--primary': '#1B5E3B',
                '--primary-light': '#217A4B',
                '--primary-dark': '#14532D',
                '--text': '#1A1A2E',
                '--text-secondary': '#555770',
                '--text-muted': '#8E8EA0',
                '--border': '#E5E7EB',
                '--border-light': '#F0F0F0',
                '--surface-subtle': '#F8FAFC',
                '--surface-tint': 'rgba(27, 94, 59, 0.08)',
                '--surface-active': 'rgba(27, 94, 59, 0.06)',
                '--radius': '20px',
                '--shadow': '0 1px 3px rgba(0,0,0,0.03)',
                '--shadow-md': '0 4px 12px rgba(0,0,0,0.05)',
                '--glass-blur': 'none'
            }
        },
        'glassmorphism': {
            name: 'Glassmorphism',
            category: 'Aesthetic',
            class: 'theme-glassmorphism',
            vars: {
                '--bg': '#CAD8D1',
                '--card': 'rgba(255, 255, 255, 0.72)',
                '--primary': '#0D7A55',
                '--primary-light': '#10B981',
                '--primary-dark': '#065F46',
                '--text': '#0F172A',
                '--text-secondary': '#334155',
                '--text-muted': '#64748B',
                '--border': 'rgba(255, 255, 255, 0.6)',
                '--border-light': 'rgba(255, 255, 255, 0.35)',
                '--surface-subtle': 'rgba(255, 255, 255, 0.45)',
                '--surface-tint': 'rgba(13, 122, 85, 0.12)',
                '--surface-active': 'rgba(255, 255, 255, 0.5)',
                '--radius': '22px',
                '--shadow': '0 8px 32px rgba(31, 38, 135, 0.07)',
                '--shadow-md': '0 12px 36px rgba(31, 38, 135, 0.12)',
                '--glass-blur': 'blur(16px)'
            }
        },
        'claymorphism': {
            name: 'Claymorphism',
            category: 'Tactile 3D',
            class: 'theme-claymorphism',
            vars: {
                '--bg': '#E3EBF0',
                '--card': '#EDF4F7',
                '--primary': '#2563EB',
                '--primary-light': '#3B82F6',
                '--primary-dark': '#1D4ED8',
                '--text': '#1E293B',
                '--text-secondary': '#475569',
                '--text-muted': '#64748B',
                '--border': 'transparent',
                '--border-light': 'rgba(166, 180, 200, 0.2)',
                '--surface-subtle': '#E6EEF2',
                '--surface-tint': 'rgba(37, 99, 235, 0.1)',
                '--surface-active': 'rgba(37, 99, 235, 0.08)',
                '--radius': '26px',
                '--shadow': '8px 8px 16px rgba(166, 180, 200, 0.6), inset -6px -6px 12px rgba(255, 255, 255, 0.8), inset 6px 6px 12px rgba(166, 180, 200, 0.2)',
                '--shadow-md': '12px 12px 24px rgba(166, 180, 200, 0.7), inset -8px -8px 16px rgba(255, 255, 255, 0.85), inset 8px 8px 16px rgba(166, 180, 200, 0.25)',
                '--glass-blur': 'none'
            }
        },
        'luxury': {
            name: 'Luxury Obsidian Gold',
            category: 'Premium Dark',
            class: 'theme-luxury',
            vars: {
                '--bg': '#090B0E',
                '--card': '#141720',
                '--primary': '#D4AF37',
                '--primary-light': '#E5C158',
                '--primary-dark': '#997D20',
                '--text': '#F8FAFC',
                '--text-secondary': '#CBD5E1',
                '--text-muted': '#94A3B8',
                '--border': 'rgba(212, 175, 55, 0.22)',
                '--border-light': 'rgba(255, 255, 255, 0.08)',
                '--surface-subtle': '#10121A',
                '--surface-tint': 'rgba(212, 175, 55, 0.14)',
                '--surface-active': 'rgba(212, 175, 55, 0.1)',
                '--radius': '16px',
                '--shadow': '0 6px 24px rgba(0, 0, 0, 0.6), 0 0 1px rgba(212, 175, 55, 0.35)',
                '--shadow-md': '0 12px 36px rgba(0, 0, 0, 0.75), 0 0 2px rgba(212, 175, 55, 0.45)',
                '--glass-blur': 'none'
            }
        },
        'neobrutalism': {
            name: 'Neo-Brutalism',
            category: 'Bold Graphic',
            class: 'theme-neobrutalism',
            vars: {
                '--bg': '#FEF08A',
                '--card': '#FFFFFF',
                '--primary': '#000000',
                '--primary-light': '#27272A',
                '--primary-dark': '#000000',
                '--text': '#000000',
                '--text-secondary': '#18181B',
                '--text-muted': '#52525B',
                '--border': '#000000',
                '--border-light': '#000000',
                '--surface-subtle': '#FFFBEB',
                '--surface-tint': 'rgba(0, 0, 0, 0.08)',
                '--surface-active': '#FEF08A',
                '--radius': '0px',
                '--shadow': '4px 4px 0px #000000',
                '--shadow-md': '7px 7px 0px #000000',
                '--glass-blur': 'none'
            }
        },
        'neomorphism': {
            name: 'Neo-Morphism',
            category: 'Soft Bevel',
            class: 'theme-neomorphism',
            vars: {
                '--bg': '#E0E5EC',
                '--card': '#E0E5EC',
                '--primary': '#4F46E5',
                '--primary-light': '#6366F1',
                '--primary-dark': '#3730A3',
                '--text': '#2D3748',
                '--text-secondary': '#4A5568',
                '--text-muted': '#718096',
                '--border': 'transparent',
                '--border-light': 'transparent',
                '--surface-subtle': '#D8DFE8',
                '--surface-tint': 'rgba(79, 70, 229, 0.1)',
                '--surface-active': 'rgba(79, 70, 229, 0.08)',
                '--radius': '20px',
                '--shadow': '6px 6px 14px #A3B1C6, -6px -6px 14px #FFFFFF',
                '--shadow-md': '10px 10px 20px #A3B1C6, -10px -10px 20px #FFFFFF',
                '--glass-blur': 'none'
            }
        },
        'vintage': {
            name: 'Vintage University',
            category: 'Academic Classic',
            class: 'theme-vintage',
            vars: {
                '--bg': '#EFE4D2',
                '--card': '#FFFBF0',
                '--primary': '#8B4513',
                '--primary-light': '#A0522D',
                '--primary-dark': '#5C2E0B',
                '--text': '#332418',
                '--text-secondary': '#6B5441',
                '--text-muted': '#8A735E',
                '--border': '#D8C3A5',
                '--border-light': '#E8DAC5',
                '--surface-subtle': '#F6EDE0',
                '--surface-tint': 'rgba(139, 69, 19, 0.08)',
                '--surface-active': 'rgba(139, 69, 19, 0.06)',
                '--radius': '8px',
                '--shadow': '0 3px 8px rgba(92, 46, 11, 0.08)',
                '--shadow-md': '0 6px 16px rgba(92, 46, 11, 0.12)',
                '--glass-blur': 'none'
            }
        },
        'vibrant': {
            name: 'Vibrant Neo Pop',
            category: 'Energetic',
            class: 'theme-vibrant',
            vars: {
                '--bg': '#FDF2F8',
                '--card': '#FFFFFF',
                '--primary': '#EC4899',
                '--primary-light': '#F472B6',
                '--primary-dark': '#BE185D',
                '--text': '#1F2937',
                '--text-secondary': '#4B5563',
                '--text-muted': '#9CA3AF',
                '--border': '#FCE7F3',
                '--border-light': '#FDF2F8',
                '--surface-subtle': '#FDF2F8',
                '--surface-tint': 'rgba(236, 72, 153, 0.1)',
                '--surface-active': 'rgba(236, 72, 153, 0.08)',
                '--radius': '22px',
                '--shadow': '0 6px 20px rgba(236, 72, 153, 0.12)',
                '--shadow-md': '0 10px 28px rgba(236, 72, 153, 0.18)',
                '--glass-blur': 'none'
            }
        },
        'organic_soft': {
            name: 'Organic Soft Design',
            category: 'Earthy Nature',
            class: 'theme-organic-soft',
            vars: {
                '--bg': '#F2EBE1',
                '--card': '#FCFAF7',
                '--primary': '#708238',
                '--primary-light': '#8A9E48',
                '--primary-dark': '#55632A',
                '--text': '#2C2A29',
                '--text-secondary': '#5A5652',
                '--text-muted': '#8C857E',
                '--border': '#E4D9CC',
                '--border-light': '#ECE3D7',
                '--surface-subtle': '#EAE2D7',
                '--surface-tint': 'rgba(112, 130, 56, 0.1)',
                '--surface-active': 'rgba(112, 130, 56, 0.08)',
                '--radius': '24px',
                '--shadow': '0 4px 16px rgba(112, 130, 56, 0.07)',
                '--shadow-md': '0 8px 24px rgba(112, 130, 56, 0.1)',
                '--glass-blur': 'none'
            }
        },
        'light': {
            name: 'Clean High-Contrast Light',
            category: 'Minimal Light',
            class: 'theme-light',
            vars: {
                '--bg': '#F8FAFC',
                '--card': '#FFFFFF',
                '--primary': '#0284C7',
                '--primary-light': '#38BDF8',
                '--primary-dark': '#0369A1',
                '--text': '#0F172A',
                '--text-secondary': '#334155',
                '--text-muted': '#64748B',
                '--border': '#E2E8F0',
                '--border-light': '#F1F5F9',
                '--surface-subtle': '#F1F5F9',
                '--surface-tint': 'rgba(2, 132, 199, 0.08)',
                '--surface-active': 'rgba(2, 132, 199, 0.06)',
                '--radius': '16px',
                '--shadow': '0 1px 3px rgba(0,0,0,0.06)',
                '--shadow-md': '0 4px 14px rgba(0,0,0,0.08)',
                '--glass-blur': 'none'
            }
        },
        'dark': {
            name: 'Deep Midnight Dark',
            category: 'Dark Mode',
            class: 'theme-dark',
            vars: {
                '--bg': '#0B0F19',
                '--card': '#131A29',
                '--primary': '#10B981',
                '--primary-light': '#34D399',
                '--primary-dark': '#059669',
                '--text': '#F9FAFB',
                '--text-secondary': '#D1D5DB',
                '--text-muted': '#9CA3AF',
                '--border': 'rgba(255, 255, 255, 0.1)',
                '--border-light': 'rgba(255, 255, 255, 0.06)',
                '--surface-subtle': '#0F1624',
                '--surface-tint': 'rgba(16, 185, 129, 0.12)',
                '--surface-active': 'rgba(255, 255, 255, 0.05)',
                '--radius': '18px',
                '--shadow': '0 4px 20px rgba(0, 0, 0, 0.5)',
                '--shadow-md': '0 10px 30px rgba(0, 0, 0, 0.65)',
                '--glass-blur': 'none'
            }
        },
        'simple_colors': {
            name: 'Simple Monotone Clean',
            category: 'Monochrome',
            class: 'theme-simple-colors',
            vars: {
                '--bg': '#F4F4F6',
                '--card': '#FFFFFF',
                '--primary': '#27272A',
                '--primary-light': '#3F3F46',
                '--primary-dark': '#18181B',
                '--text': '#18181B',
                '--text-secondary': '#52525B',
                '--text-muted': '#71717A',
                '--border': '#E4E4E7',
                '--border-light': '#F4F4F5',
                '--surface-subtle': '#F4F4F6',
                '--surface-tint': 'rgba(39, 39, 42, 0.08)',
                '--surface-active': 'rgba(39, 39, 42, 0.06)',
                '--radius': '14px',
                '--shadow': '0 1px 2px rgba(0,0,0,0.04)',
                '--shadow-md': '0 4px 10px rgba(0,0,0,0.06)',
                '--glass-blur': 'none'
            }
        }
    };

    // Load configuration from localStorage
    function loadConfig() {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem(THEME_STORAGE_KEY);
                if (raw) return JSON.parse(raw);
            }
        } catch(e) {
            console.warn('ThemeEngine storage read error:', e);
        }
        return {
            preset: 'default',
            customColors: {},
            fontFamily: "'Inter', sans-serif",
            fontSizeScale: 1.0
        };
    }

    // Save configuration
    function saveConfig(cfg) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(cfg));
            }
        } catch(e) {
            console.warn('ThemeEngine storage write error:', e);
        }
    }

    // Apply entire configuration to the document root
    function applyConfig(cfg) {
        const root = document.documentElement;
        const preset = window.THEME_PRESETS[cfg.preset] || window.THEME_PRESETS['default'];

        // Remove all old theme classes
        Object.values(window.THEME_PRESETS).forEach(p => {
            if (p.class) root.classList.remove(p.class);
        });
        if (preset.class) root.classList.add(preset.class);

        // Apply preset CSS variables
        if (preset.vars) {
            Object.entries(preset.vars).forEach(([k, v]) => {
                root.style.setProperty(k, v);
            });
        }

        // Apply custom color overrides if any
        if (cfg.customColors && typeof cfg.customColors === 'object') {
            Object.entries(cfg.customColors).forEach(([k, v]) => {
                if (v) root.style.setProperty(k, v);
            });
        }

        // Apply typography
        if (cfg.fontFamily) {
            root.style.setProperty('--font-main', cfg.fontFamily);
            if (document.body) {
                document.body.style.fontFamily = cfg.fontFamily;
            }
            try {
                let fontStyleTag = document.getElementById('treva-font-override');
                if (!fontStyleTag) {
                    fontStyleTag = document.createElement('style');
                    fontStyleTag.id = 'treva-font-override';
                    document.head.appendChild(fontStyleTag);
                }
                fontStyleTag.textContent = `
                    body, button, input, select, textarea, h1, h2, h3, h4, h5, h6, p, span, a, td, th {
                        font-family: ${cfg.fontFamily} !important;
                    }
                `;
            } catch(e) {
                console.warn('Font style injection error:', e);
            }
        }

        if (cfg.fontSizeScale) {
            root.style.setProperty('--font-scale', cfg.fontSizeScale);
            root.style.fontSize = (16 * cfg.fontSizeScale) + 'px';
        }

        // Trigger custom event so any canvas or charts can re-color
        window.dispatchEvent(new CustomEvent('treva-theme-changed', { detail: cfg }));
    }

    // Global Controller API
    window.ThemeEngine = {
        getConfig: loadConfig,
        setPreset: function(presetKey) {
            const cfg = loadConfig();
            cfg.preset = presetKey;
            // Clear custom color overrides on preset switch unless user specifically set them
            cfg.customColors = {};
            saveConfig(cfg);
            applyConfig(cfg);
            return cfg;
        },
        setColorOverride: function(varName, colorVal) {
            const cfg = loadConfig();
            if (!cfg.customColors) cfg.customColors = {};
            cfg.customColors[varName] = colorVal;
            saveConfig(cfg);
            applyConfig(cfg);
            return cfg;
        },
        setFontFamily: function(fontFamily) {
            const cfg = loadConfig();
            cfg.fontFamily = fontFamily;
            saveConfig(cfg);
            applyConfig(cfg);
            return cfg;
        },
        setFontSizeScale: function(scale) {
            const cfg = loadConfig();
            cfg.fontSizeScale = parseFloat(scale) || 1.0;
            saveConfig(cfg);
            applyConfig(cfg);
            return cfg;
        },
        resetToDefault: function() {
            const cfg = {
                preset: 'default',
                customColors: {},
                fontFamily: "'Inter', sans-serif",
                fontSizeScale: 1.0
            };
            saveConfig(cfg);
            applyConfig(cfg);
            return cfg;
        },
        init: function() {
            const cfg = loadConfig();
            applyConfig(cfg);
        }
    };

    // Auto-initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.ThemeEngine.init);
    } else {
        window.ThemeEngine.init();
    }
})();
