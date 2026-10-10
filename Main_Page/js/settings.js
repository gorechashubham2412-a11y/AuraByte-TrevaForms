/**
 * ============================================================================
 * SETTINGS & THEME STUDIO CONTROLLER
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', function() {
    try { lucide.createIcons(); } catch(e) { console.warn(e); }

    // ========== ELEMENT COLOR CONFIG MATRIX ==========
    const ELEMENT_VARIABLES = [
        { key: '--bg', label: 'App Background', desc: 'Main canvas & page backdrop' },
        { key: '--card', label: 'Card Surface', desc: 'Panels, bento cards & popups' },
        { key: '--primary', label: 'Primary Accent', desc: 'Buttons, active indicators & pills' },
        { key: '--primary-light', label: 'Primary Hover / Light', desc: 'Hover highlights & secondary tints' },
        { key: '--text', label: 'Primary Text', desc: 'Headings, titles & primary labels' },
        { key: '--text-secondary', label: 'Secondary / Subtext', desc: 'Captions, dates & metadata' },
        { key: '--border', label: 'Border & Dividers', desc: 'Card outlines, inputs & table lines' }
    ];

    // ========== FONT OPTIONS ==========
    const FONT_OPTIONS = [
        { name: 'Inter', family: "'Inter', sans-serif", desc: 'Balanced Modern SaaS standard' },
        { name: 'Poppins', family: "'Poppins', sans-serif", desc: 'Geometric, friendly & rounded' },
        { name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", desc: 'Crisp, contemporary tech feel' },
        { name: 'Playfair Display', family: "'Playfair Display', serif", desc: 'Luxury editorial serif elegance' },
        { name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", desc: 'Bold, brutalist modern typography' },
        { name: 'Merriweather', family: "'Merriweather', serif", desc: 'Warm classical academic serif' }
    ];

    // ========== QUICK ACCENT SWATCHES ==========
    const QUICK_SWATCHES = [
        { name: 'Forest Green', primary: '#1B5E3B', light: '#217A4B' },
        { name: 'Emerald', primary: '#059669', light: '#10B981' },
        { name: 'Ocean Teal', primary: '#0D9488', light: '#14B8A6' },
        { name: 'Electric Indigo', primary: '#4F46E5', light: '#6366F1' },
        { name: 'Royal Blue', primary: '#2563EB', light: '#3B82F6' },
        { name: 'Ruby Rose', primary: '#E11D48', light: '#F43F5E' },
        { name: 'Warm Amber', primary: '#D97706', light: '#F59E0B' },
        { name: 'Sunset Coral', primary: '#EA580C', light: '#F97316' },
        { name: 'Luxury Gold', primary: '#D4AF37', light: '#E5C158' },
        { name: 'Monochrome Dark', primary: '#18181B', light: '#27272A' }
    ];

    // Initialize Components
    renderThemePresetCards();
    renderColorInputControls();
    renderQuickSwatches();
    renderFontOptions();
    initFontSizeSlider();
    syncUIWithCurrentConfig();

    // Listen to theme engine updates
    window.addEventListener('treva-theme-changed', function(e) {
        syncUIWithCurrentConfig(e.detail);
    });

    // =========================================================================
    // 1. RENDER PRESET THEME CARDS
    // =========================================================================
    function renderThemePresetCards() {
        const grid = document.getElementById('themePresetsGrid');
        if (!grid) return;

        const presets = window.THEME_PRESETS || {};
        grid.innerHTML = Object.entries(presets).map(([key, p]) => {
            const v = p.vars || {};
            return `
                <div class="theme-card" data-preset="${key}" onclick="selectThemePreset('${key}')">
                    <div class="theme-card-preview" style="background:${v['--bg']}; border-color:${v['--border']}">
                        <div style="background:${v['--card']}; padding:6px 8px; border-radius:6px; box-shadow:${v['--shadow']}">
                            <div class="theme-card-mini-bar" style="background:${v['--primary']}"></div>
                        </div>
                        <div class="theme-card-mini-pills">
                            <span class="theme-card-mini-pill" style="background:${v['--primary']}"></span>
                            <span class="theme-card-mini-pill" style="background:${v['--card']}"></span>
                            <span class="theme-card-mini-pill" style="background:${v['--text']}"></span>
                        </div>
                    </div>
                    <div class="theme-card-info">
                        <div class="theme-card-title">
                            <span>${p.name}</span>
                            <span class="theme-badge-active">Active</span>
                        </div>
                        <span class="theme-card-cat">${p.category}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.selectThemePreset = function(key) {
        window.ThemeEngine.setPreset(key);
    };

    // =========================================================================
    // 2. RENDER ELEMENT COLOR INPUTS
    // =========================================================================
    function renderColorInputControls() {
        const grid = document.getElementById('elementColorGrid');
        if (!grid) return;

        grid.innerHTML = ELEMENT_VARIABLES.map(item => `
            <div class="color-input-item">
                <div class="color-label-group">
                    <span class="color-label-title">${item.label}</span>
                    <span class="color-label-var">${item.key}</span>
                </div>
                <div class="color-picker-control">
                    <input type="color" id="picker_${item.key.replace('--','')}" data-var="${item.key}" oninput="handleColorChange('${item.key}', this.value)">
                    <span class="color-hex-val" id="hex_${item.key.replace('--','')}">#000000</span>
                </div>
            </div>
        `).join('');
    }

    window.handleColorChange = function(varName, val) {
        const hexId = 'hex_' + varName.replace('--','');
        const hexEl = document.getElementById(hexId);
        if (hexEl) hexEl.textContent = val.toUpperCase();
        window.ThemeEngine.setColorOverride(varName, val);
    };

    // =========================================================================
    // 3. RENDER QUICK PALETTE SWATCHES
    // =========================================================================
    function renderQuickSwatches() {
        const wrap = document.getElementById('quickPaletteSwatches');
        if (!wrap) return;

        wrap.innerHTML = QUICK_SWATCHES.map(s => `
            <div class="palette-chip" title="${s.name}" style="background:${s.primary}" onclick="applyQuickAccent('${s.primary}', '${s.light}')"></div>
        `).join('');
    }

    window.applyQuickAccent = function(primary, light) {
        window.ThemeEngine.setColorOverride('--primary', primary);
        window.ThemeEngine.setColorOverride('--primary-light', light);
    };

    // =========================================================================
    // 4. RENDER FONT OPTIONS
    // =========================================================================
    function renderFontOptions() {
        const grid = document.getElementById('fontOptionsGrid');
        if (!grid) return;

        grid.innerHTML = FONT_OPTIONS.map((f, idx) => `
            <div class="font-option-card" data-font-idx="${idx}" style="font-family:${f.family}">
                <div class="font-name-title">${f.name}</div>
                <div class="font-sample-preview">${f.desc}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.font-option-card').forEach(card => {
            card.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-font-idx'), 10);
                const selected = FONT_OPTIONS[idx];
                if (selected) {
                    window.selectFontFamily(selected.family);
                }
            });
        });
    }

    window.selectFontFamily = function(family) {
        window.ThemeEngine.setFontFamily(family);
    };

    // =========================================================================
    // 5. FONT SIZE SLIDER
    // =========================================================================
    function initFontSizeSlider() {
        const slider = document.getElementById('fontSizeSlider');
        const badge = document.getElementById('fontSizeBadge');
        if (!slider) return;

        slider.addEventListener('input', function() {
            const scale = parseFloat(this.value);
            if (badge) badge.textContent = Math.round(scale * 100) + '%';
            window.ThemeEngine.setFontSizeScale(scale);
        });
    }

    // =========================================================================
    // 6. SYNC UI WITH CURRENT CONFIG
    // =========================================================================
    function syncUIWithCurrentConfig(customCfg = null) {
        const cfg = customCfg || window.ThemeEngine.getConfig();
        const rootStyles = getComputedStyle(document.documentElement);

        // Highlight active theme card
        document.querySelectorAll('.theme-card').forEach(card => {
            const isTarget = card.getAttribute('data-preset') === cfg.preset;
            card.classList.toggle('active', isTarget);
        });

        // Update color pickers & hex codes
        ELEMENT_VARIABLES.forEach(item => {
            const currentVal = rootStyles.getPropertyValue(item.key).trim();
            const cleanHex = rgbToHex(currentVal);
            const picker = document.getElementById('picker_' + item.key.replace('--',''));
            const hexEl = document.getElementById('hex_' + item.key.replace('--',''));

            if (picker && cleanHex) picker.value = cleanHex;
            if (hexEl) hexEl.textContent = cleanHex ? cleanHex.toUpperCase() : currentVal;
        });

        // Highlight font option card
        document.querySelectorAll('.font-option-card').forEach(card => {
            const idx = parseInt(card.getAttribute('data-font-idx'), 10);
            const f = FONT_OPTIONS[idx];
            card.classList.toggle('active', !!(f && f.family === cfg.fontFamily));
        });

        // Update font size slider & badge
        const slider = document.getElementById('fontSizeSlider');
        const badge = document.getElementById('fontSizeBadge');
        if (slider) slider.value = cfg.fontSizeScale || 1.0;
        if (badge) badge.textContent = Math.round((cfg.fontSizeScale || 1.0) * 100) + '%';

        // Update Live Preview Name
        const previewPresetName = document.getElementById('previewPresetName');
        const currentPreset = window.THEME_PRESETS[cfg.preset] || window.THEME_PRESETS['default'];
        if (previewPresetName) previewPresetName.textContent = currentPreset.name;
    }

    // Color conversion helper
    function rgbToHex(val) {
        if (!val) return '';
        if (val.startsWith('#') && (val.length === 7 || val.length === 4)) {
            if (val.length === 4) {
                return '#' + val[1]+val[1] + val[2]+val[2] + val[3]+val[3];
            }
            return val;
        }
        const rgb = val.match(/\d+/g);
        if (!rgb || rgb.length < 3) return '#1B5E3B';
        const hex = (x) => ("0" + parseInt(x).toString(16)).slice(-2);
        return "#" + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
    }

    // =========================================================================
    // UNIVERSAL STYLED CONFIRMATION MODAL SYSTEM
    // =========================================================================
    let pendingGenericConfirmAction = null;

    window.showConfirmModal = function({
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        icon = 'alert-triangle',
        iconBg = 'rgba(239, 68, 68, 0.12)',
        iconColor = '#ef4444',
        btnText = 'Delete',
        btnIcon = 'trash-2',
        btnBg = '#dc2626',
        details = [],
        onConfirm = null
    }) {
        pendingGenericConfirmAction = onConfirm;

        const modal = document.getElementById('genericConfirmModal');
        if (!modal) {
            console.warn('[Treva] #genericConfirmModal not found in DOM.');
            return;
        }

        const titleEl = document.getElementById('genConfirmTitle');
        const msgEl   = document.getElementById('genConfirmMessage');
        const wrapEl  = document.getElementById('genConfirmIconWrap');
        const detEl   = document.getElementById('genConfirmDetails');
        const btnEl   = document.getElementById('btnExecuteGenericConfirm');

        if (titleEl) titleEl.textContent = title;
        if (msgEl)   msgEl.textContent = message;

        if (wrapEl) {
            wrapEl.style.background = iconBg;
            wrapEl.style.color = iconColor;
            wrapEl.innerHTML = `<i data-lucide="${icon}" style="width: 28px; height: 28px;"></i>`;
        }

        if (detEl) {
            if (details && (Array.isArray(details) ? details.length > 0 : !!details)) {
                detEl.style.display = 'block';
                if (Array.isArray(details)) {
                    detEl.innerHTML = details.map((d, i) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; ${i < details.length - 1 ? 'margin-bottom: 6px;' : ''}">
                            <span style="font-size: 12px; color: var(--text-muted);">${d.label}:</span>
                            <strong style="font-size: 13px; font-weight: 600; color: var(--text);">${d.value}</strong>
                        </div>
                    `).join('');
                } else {
                    detEl.innerHTML = details;
                }
            } else {
                detEl.style.display = 'none';
                detEl.innerHTML = '';
            }
        }

        if (btnEl) {
            btnEl.style.background = btnBg;
            btnEl.innerHTML = `<i data-lucide="${btnIcon}" style="width: 16px; height: 16px;"></i> <span id="genConfirmBtnText">${btnText}</span>`;
        }

        modal.classList.add('open');
        try { lucide.createIcons(); } catch(e){}
    };

    window.closeGenericConfirmModal = function() {
        const modal = document.getElementById('genericConfirmModal');
        if (modal) modal.classList.remove('open');
        pendingGenericConfirmAction = null;
    };

    window.executeGenericConfirmAction = async function() {
        if (typeof pendingGenericConfirmAction === 'function') {
            const action = pendingGenericConfirmAction;
            const btn = document.getElementById('btnExecuteGenericConfirm');
            const origContent = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `⏳ Processing...`;
            }
            try {
                await action();
            } catch(err) {
                console.error('[Treva] Error executing confirmed action:', err);
            } finally {
                closeGenericConfirmModal();
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = origContent;
                    try { lucide.createIcons(); } catch(e){}
                }
            }
        } else {
            closeGenericConfirmModal();
        }
    };

    (function initConfirmModalListeners() {
        const attach = () => {
            const genModal = document.getElementById('genericConfirmModal');
            if (genModal && !genModal._hasBackdropClick) {
                genModal._hasBackdropClick = true;
                genModal.addEventListener('click', (e) => {
                    if (e.target === genModal) closeGenericConfirmModal();
                });
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attach);
        } else {
            attach();
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const genModal = document.getElementById('genericConfirmModal');
                if (genModal && genModal.classList.contains('open')) closeGenericConfirmModal();
            }
        });
    })();

    // Reset All Handler
    window.resetThemeStudio = function() {
        showConfirmModal({
            title: 'Reset Theme & Appearance?',
            message: 'Are you sure you want to restore factory default styling? All custom theme presets, element color overrides, and typography adjustments will be reset.',
            icon: 'rotate-ccw',
            iconBg: 'rgba(245, 158, 11, 0.12)',
            iconColor: '#d97706',
            btnText: 'Reset to Default',
            btnIcon: 'rotate-ccw',
            btnBg: '#d97706',
            details: [
                { label: 'Studio Setting', value: 'Theme & Appearance' },
                { label: 'Target', value: 'Theme Preset, Custom Colors & Font Overrides' },
                { label: 'Default Theme', value: 'Treva Emerald Green' }
            ],
            onConfirm: () => {
                window.ThemeEngine.resetToDefault();
            }
        });
    };
});
