/* =============================================
   ELASTIC WAVE PHYSICS ENGINE — 1D wave simulation and interactive string canvas
   ============================================= */

(function initStringNav() {
    function setup() {
        const stringCv = document.getElementById('stringCv');
        if (!stringCv) return;
        const stringCtx = stringCv.getContext('2d');
        const wrapper = document.getElementById('stringNavWrapper');
        const navButtons = Array.from(document.querySelectorAll('.string-nav-btn'));
        if (navButtons.length === 0) return;

        // Auto-detect initial active index from URL or data attribute
        let initialIndex = 0;
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        if (search.includes('tab=forms')) {
            initialIndex = 4;
        } else if (path.includes('my_class') || path.includes('myclass')) {
            initialIndex = 1;
        } else if (path.includes('timetable') || path.includes('analytics')) {
            initialIndex = 2;
        } else if (path.includes('attendance') || path.includes('students')) {
            initialIndex = 3;
        } else if (wrapper && wrapper.hasAttribute('data-active-index')) {
            initialIndex = parseInt(wrapper.getAttribute('data-active-index')) || 0;
        }

        const N = 140;
        const x = new Float32Array(N);
        const v = new Float32Array(N);
        let sW = 0, sH = 0, sDpr = 1;
        let Y0 = 24, Y1 = 356, dy = (Y1 - Y0) / (N - 1);
        let A = Y0 + 16, B = Y1 - 16;
        let BASE_X = 22;
        let by = 0, bvy = 0, ty = 0, xb = 0;
        let dragging = false, py = 0, pxOff = 0, cur = initialIndex;

        const iy = i => A + (B - A) * i / Math.max(1, navButtons.length - 1);
        const nodeAt = yVal => Math.max(2, Math.min(N - 3, Math.round((yVal - Y0) / dy)));

        // Injects velocity perturbation into wave simulation at specific y-coordinate
        function pluck(yVal, amp) {
            const j = nodeAt(yVal);
            for (let k = -5; k <= 5; k++) {
                if (j + k >= 0 && j + k < N) {
                    const w = Math.exp(-k * k / 6);
                    v[j + k] += amp * w;
                }
            }
        }

        // Updates active navigation button styling and plucks the string
        function selectNav(i, doPluck = true) {
            if (i < 0 || i >= navButtons.length) return;
            cur = i;
            navButtons.forEach((btn, idx) => {
                btn.classList.toggle('active', idx === i);
            });
            if (doPluck) {
                pluck(iy(i), (Math.random() < 0.5 ? -1 : 1) * 4.5);
            }
        }

        /* =============================================
           NAVIGATION & TAB ROUTING — Multi-page transitions, in-page tabs, and route matching
           ============================================= */

        // Stores nav state in sessionStorage and redirects to target URL
        function navigateToPage(targetUrl, idx) {
            // Each page controller declares globals, so keep them in separate documents.
            try {
                sessionStorage.setItem('treva_nav_from_index', String(idx >= 0 ? idx : cur));
                sessionStorage.setItem('treva_nav_from_by', String(by));
            } catch (e) {}
            window.location.href = targetUrl;
        }

        // Handles in-page section transitions or multi-page routing
        async function navigateTab(idx) {
            const btn = navButtons[idx];
            if (!btn) return;
            const tabName = btn.getAttribute('data-tab');

            const curPath = window.location.pathname.toLowerCase();
            // Pages with their own controllers must not inherit the home-only views.
            const isHome = curPath.endsWith('index.html') || curPath.endsWith('/') ||
                          (!curPath.includes('my_class') && !curPath.includes('settings') &&
                           !curPath.includes('timetable') && !curPath.includes('students') &&
                           !curPath.includes('attendance'));

            // In-page section transitions
            if (tabName === 'forms' && isHome) {
                if (typeof window.showFormsHub === 'function') window.showFormsHub();
                return;
            }
            if (tabName === 'home' && isHome) {
                if (typeof window.showHomeView === 'function') window.showHomeView();
                return;
            }
            if (tabName === 'resources' && curPath.includes('my_class')) {
                if (typeof window.switchSection === 'function') window.switchSection('resources');
                return;
            }
            if (tabName === 'myclass' && curPath.includes('my_class')) {
                if (typeof window.switchSection === 'function') window.switchSection('students');
                return;
            }

            // Target URL
            let targetUrl = 'index.html';
            if (tabName === 'myclass' || tabName === 'resources') targetUrl = 'my_class.html';
            else if (tabName === 'timetable') targetUrl = 'timetable.html';
            else if (tabName === 'attendance' || tabName === 'students') targetUrl = 'attendance.html';
            else if (tabName === 'forms') targetUrl = 'index.html?tab=forms';
            else if (tabName === 'home') targetUrl = 'index.html';

            navigateToPage(targetUrl, idx);
        }

        // Selects navigation index, plucks string, and triggers tab navigation
        function goTo(i) {
            if (i < 0 || i >= navButtons.length) return;
            ty = iy(i);
            selectNav(i, true);
            navigateTab(i);
        }

        window.trevaNavigate = function(url) {
            const low = url.toLowerCase();
            let idx = 0;
            if (low.includes('tab=forms')) idx = 4;
            else if (low.includes('my_class')) idx = 1;
            else if (low.includes('timetable')) idx = 2;
            else if (low.includes('attendance') || low.includes('students')) idx = 3;
            else if (low.includes('settings')) idx = -1;

            if (idx >= 0 && idx < navButtons.length) {
                goTo(idx);
            } else {
                navButtons.forEach(btn => btn.classList.remove('active'));
                navigateToPage(url, -1);
            }
        };

        window.setNavActiveByName = function(name) {
            const idx = navButtons.findIndex(btn => btn.getAttribute('data-tab') === name);
            if (idx !== -1) goTo(idx);
        };

        // Browser Back / Forward handler
        window.addEventListener('popstate', () => {
            const curPath = window.location.pathname.toLowerCase();
            const search = window.location.search.toLowerCase();
            let idx = 0;
            if (search.includes('tab=forms')) idx = 4;
            else if (curPath.includes('my_class')) idx = 1;
            else if (curPath.includes('timetable')) idx = 2;
            else if (curPath.includes('attendance') || curPath.includes('students')) idx = 3;
            else if (curPath.includes('settings')) idx = -1;

            if (idx >= 0 && idx < navButtons.length) {
                cur = idx;
                ty = iy(idx);
                selectNav(idx, true);
            }
        });

        // Intercept internal HTML link clicks for seamless SPA transitions
        document.addEventListener('click', function(e) {
            const target = e.target.closest('a, button, .sidebar-college');
            if (!target) return;
            if (target.classList.contains('string-nav-btn')) return;

            const onclickStr = target.getAttribute('onclick') || '';
            const match = onclickStr.match(/window\.location\.href\s*=\s*['"]([^'"]+\.html[^'"]*)['"]/);
            if (match && match[1]) {
                const dest = match[1];
                if (!dest.startsWith('http') && !dest.startsWith('//') && !dest.startsWith('../')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.trevaNavigate(dest);
                }
            }
        }, true);

        // Check if we came from another page via reload fallback
        let initialFromIdx = null;
        let initialFromBy = null;
        try {
            const sIdx = sessionStorage.getItem('treva_nav_from_index');
            const sBy = sessionStorage.getItem('treva_nav_from_by');
            if (sIdx !== null) {
                initialFromIdx = parseInt(sIdx, 10);
                if (sBy) initialFromBy = parseFloat(sBy);
                sessionStorage.removeItem('treva_nav_from_index');
                sessionStorage.removeItem('treva_nav_from_by');
            }
        } catch(e) {}

        function resizeStringNav() {
            sDpr = window.devicePixelRatio || 1;
            const rect = stringCv.getBoundingClientRect();
            sW = rect.width;
            sH = rect.height;
            stringCv.width = sW * sDpr;
            stringCv.height = sH * sDpr;
            stringCtx.setTransform(sDpr, 0, 0, sDpr, 0, 0);

            Y0 = 24;
            Y1 = Math.max(Y0 + 80, sH - 24);
            dy = (Y1 - Y0) / (N - 1);
            A = Y0 + 16;
            B = Y1 - 16;
            BASE_X = 22;

            navButtons.forEach((btn, i) => {
                btn.style.top = iy(i) + 'px';
                btn.onclick = () => goTo(i);
            });

            if (initialFromIdx !== null && !isNaN(initialFromIdx) && initialFromIdx !== cur) {
                by = initialFromBy !== null ? initialFromBy : iy(initialFromIdx);
                ty = iy(cur);
                pluck(by, (cur > initialFromIdx ? 1 : -1) * 4.5);
                initialFromIdx = null; // Only once on startup
            } else {
                by = ty = iy(cur);
            }
            selectNav(cur, false);
        }

        // Advances 1D wave equation simulation physics by time steps
        function stepString() {
            const jf = Math.max(1, Math.min(N - 2, (by - Y0) / dy));
            for (let s = 0; s < 3; s++) {
                for (let i = 1; i < N - 1; i++) {
                    let a = 0.6 * (x[i - 1] + x[i + 1] - 2 * x[i]) + 0.04 * (v[i - 1] + v[i + 1] - 2 * v[i]);
                    if (dragging) {
                        const eq = i <= jf ? xb * i / jf : xb * (N - 1 - i) / (N - 1 - jf);
                        a += 0.15 * (eq - x[i]);
                    }
                    v[i] += a;
                }
                for (let i = 1; i < N - 1; i++) {
                    v[i] *= 0.975;
                    x[i] += v[i];
                }
                x[0] = x[N - 1] = 0;
            }

            const j0 = Math.floor(jf), fr = jf - j0;
            if (dragging) {
                by += (py - by) * 0.35;
                by = Math.max(A - 14, Math.min(B + 14, by));
                xb += (pxOff - xb) * 0.4;
                for (let k = -1; k <= 2; k++) {
                    const n = j0 + k;
                    if (n < 1 || n > N - 2) continue;
                    const w = Math.max(0, 1 - Math.abs(n - jf) / 2);
                    x[n] += (xb - x[n]) * 0.7 * w;
                    v[n] *= 1 - 0.5 * w;
                }
                for (let i = 0; i < navButtons.length; i++) {
                    if (i !== cur && Math.abs(by - iy(i)) < 16) selectNav(i, false);
                }
            } else {
                bvy += (ty - by) * 0.1;
                bvy *= 0.8;
                by += bvy;
                xb = x[j0] * (1 - fr) + x[Math.min(N - 1, j0 + 1)] * fr;
            }
        }

        // Renders elastic string curve, fixed anchor pins, and interactive bead
        function drawString() {
            stringCtx.clearRect(0, 0, sW, sH);

            const rootStyle = getComputedStyle(document.documentElement);
            const primaryColor = rootStyle.getPropertyValue('--primary').trim() || '#1B5E3B';
            const cardColor = rootStyle.getPropertyValue('--card').trim() || '#FFFFFF';

            // String line
            stringCtx.lineWidth = 2.4;
            stringCtx.lineJoin = stringCtx.lineCap = 'round';
            stringCtx.strokeStyle = primaryColor;
            stringCtx.beginPath();
            stringCtx.moveTo(BASE_X, Y0);
            for (let i = 1; i < N - 1; i++) {
                const ya = Y0 + i * dy;
                const xa = BASE_X + x[i];
                const yb2 = ya + dy;
                const xb2 = BASE_X + x[i + 1];
                stringCtx.quadraticCurveTo(xa, ya, (xa + xb2) / 2, (ya + yb2) / 2);
            }
            stringCtx.lineTo(BASE_X, Y1);
            stringCtx.stroke();

            // Pinned anchors
            stringCtx.fillStyle = primaryColor;
            [Y0, Y1].forEach(yPos => {
                stringCtx.beginPath();
                stringCtx.arc(BASE_X, yPos, 3.5, 0, Math.PI * 2);
                stringCtx.fill();
            });

            // Subtle node resting dots
            stringCtx.globalAlpha = 0.35;
            navButtons.forEach((btn, i) => {
                const node = nodeAt(iy(i));
                stringCtx.beginPath();
                stringCtx.arc(BASE_X + x[node], iy(i), 2.5, 0, Math.PI * 2);
                stringCtx.fill();
            });
            stringCtx.globalAlpha = 1;

            // Interactive Bead (Ball)
            const curBx = BASE_X + xb;
            stringCtx.save();
            stringCtx.shadowColor = primaryColor;
            stringCtx.shadowBlur = dragging ? 18 : 10;
            stringCtx.fillStyle = cardColor;
            stringCtx.strokeStyle = primaryColor;
            stringCtx.lineWidth = 3;
            stringCtx.beginPath();
            stringCtx.arc(curBx, by, 10, 0, Math.PI * 2);
            stringCtx.fill();
            stringCtx.stroke();

            // Bead Center Dot
            stringCtx.fillStyle = primaryColor;
            stringCtx.beginPath();
            stringCtx.arc(curBx, by, 3.5, 0, Math.PI * 2);
            stringCtx.fill();
            stringCtx.restore();
        }

        window.addEventListener('treva-theme-changed', function() {
            drawString();
        });

        let stringLast = 0, stringAcc = 0;
        function stringLoop(t) {
            if (!stringLast) stringLast = t;
            stringAcc += Math.min(50, t - stringLast);
            stringLast = t;
            while (stringAcc >= 1000 / 60) {
                stepString();
                stringAcc -= 1000 / 60;
            }
            drawString();
            requestAnimationFrame(stringLoop);
        }

        function pointerPos(e) {
            const r = stringCv.getBoundingClientRect();
            py = e.clientY - r.top;
            pxOff = 38 * Math.tanh((e.clientX - r.left - BASE_X) / 45);
        }

        stringCv.addEventListener('pointerdown', e => {
            pointerPos(e);
            const r = stringCv.getBoundingClientRect();
            const touchX = e.clientX - r.left;
            const touchY = e.clientY - r.top;
            const distToBall = Math.hypot(touchX - (BASE_X + xb), touchY - by);
            const distToString = Math.abs(touchX - BASE_X);
            if (distToBall < 30 || (distToString < 24 && touchY >= Y0 - 12 && touchY <= Y1 + 12)) {
                dragging = true;
                stringCv.setPointerCapture(e.pointerId);
            }
        });

        stringCv.addEventListener('pointermove', e => {
            if (dragging) pointerPos(e);
        });

        function pointerRelease() {
            if (!dragging) return;
            dragging = false;
            let best = 0, minDist = 1e9;
            navButtons.forEach((btn, i) => {
                const d = Math.abs(by - iy(i));
                if (d < minDist) { minDist = d; best = i; }
            });
            bvy = (py - by) * 0.2;
            goTo(best);
        }

        stringCv.addEventListener('pointerup', pointerRelease);
        stringCv.addEventListener('pointercancel', pointerRelease);

        window.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowDown') {
                goTo(Math.min(navButtons.length - 1, cur + 1));
            } else if (e.key === 'ArrowUp') {
                goTo(Math.max(0, cur - 1));
            }
        });

        resizeStringNav();
        requestAnimationFrame(stringLoop);
        window.addEventListener('resize', resizeStringNav);
        if (window.lucide) {
            try { window.lucide.createIcons(); } catch(e) {}
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();

/* =============================================
   GLOBAL ESCAPE KEY & MODAL MANAGER — Hierarchical modal dismissal and back navigation
   ============================================= */

// Handles hierarchical backward navigation: modals, dropdowns, and browser history
window.trevaGoBack = function() {
    // 1. Check for open modals and close the topmost modal
    const knownModalIds = [
        'deleteConfirmModal',
        'genericConfirmModal',
        'studentModal',
        'dayBreakdownModal',
        'resultModal',
        'studentProfileModal',
        'attendanceModal',
        'addSlotModal',
        'editSlotModal',
        'themeConfigModal',
        'studentAnswersModal',
        'formPreviewModal',
        'formResponsesModal',
        'createFormModal',
        'copyFormModal'
    ];
    for (const id of knownModalIds) {
        const m = document.getElementById(id);
        if (m && (m.classList.contains('active') || m.classList.contains('open') || m.style.display === 'flex' || m.style.display === 'block')) {
            if (id === 'studentProfileModal' && typeof window.closeStudentProfileModal === 'function') { window.closeStudentProfileModal(); return; }
            if (id === 'resultModal' && typeof window.closeResultModal === 'function') { window.closeResultModal(); return; }
            if (id === 'dayBreakdownModal' && typeof window.closeDayBreakdownModal === 'function') { window.closeDayBreakdownModal(); return; }
            if (id === 'studentModal' && typeof window.closeStudentModal === 'function') { window.closeStudentModal(); return; }
            if (id === 'attendanceModal' && typeof window.closeAttendanceModal === 'function') { window.closeAttendanceModal(); return; }
            if (id === 'genericConfirmModal' && typeof window.closeGenericConfirmModal === 'function') { window.closeGenericConfirmModal(); return; }
            if (id === 'deleteConfirmModal' && typeof window.closeDeleteConfirmModal === 'function') { window.closeDeleteConfirmModal(); return; }
            if (id === 'addSlotModal' && typeof window.closeAddSlotModal === 'function') { window.closeAddSlotModal(); return; }
            if (id === 'editSlotModal' && typeof window.closeEditSlotModal === 'function') { window.closeEditSlotModal(); return; }
            if (id === 'themeConfigModal' && typeof window.closeThemeConfigModal === 'function') { window.closeThemeConfigModal(); return; }
            if (id === 'studentAnswersModal' && typeof window.closeStudentAnswersModal === 'function') { window.closeStudentAnswersModal(); return; }
            if (id === 'formPreviewModal' && typeof window.closeFormPreviewModal === 'function') { window.closeFormPreviewModal(); return; }

            const closeBtn = m.querySelector('.modal-close-btn, .close-btn, .cancel-btn, [data-modal-close], .btn-cancel');
            if (closeBtn) { closeBtn.click(); return; }
            m.classList.remove('active', 'open');
            m.style.display = 'none';
            return;
        }
    }

    const openModals = Array.from(document.querySelectorAll('.modal-overlay.active, .modal-overlay.open, .modal-container.active, .modal-backdrop.active'))
        .filter(m => window.getComputedStyle(m).display !== 'none');
    if (openModals.length > 0) {
        const topModal = openModals[openModals.length - 1];
        const closeBtn = topModal.querySelector('.modal-close-btn, .close-btn, .cancel-btn, [data-modal-close], .btn-cancel');
        if (closeBtn) { closeBtn.click(); return; }
        topModal.classList.remove('active', 'open');
        topModal.style.display = 'none';
        return;
    }

    // 2. Close profile dropdown or other open popovers
    const profDD = document.getElementById('profDD');
    if (profDD && (profDD.classList.contains('show') || profDD.classList.contains('active') || profDD.style.display === 'block')) {
        profDD.classList.remove('show', 'active');
        profDD.style.display = 'none';
        return;
    }

    // 3. Sub-views on pages:
    const path = window.location.pathname.toLowerCase();
    const isHome = path.endsWith('index.html') || path.endsWith('/') || (!path.includes('my_class') && !path.includes('settings') && !path.includes('analytics') && !path.includes('students') && !path.includes('attendance'));

    if (isHome) {
        const formsSec = document.getElementById('formsSection');
        const builderSec = document.getElementById('formBuilderView');
        if (builderSec && window.getComputedStyle(builderSec).display !== 'none' && typeof window.showFormsHub === 'function') {
            window.showFormsHub();
            return;
        }
        if (formsSec && window.getComputedStyle(formsSec).display !== 'none' && typeof window.showHomeView === 'function') {
            window.showHomeView();
            return;
        }
    }

    // On my_class.html: if in Excel matrix view, switch back to detailed roster view
    if (path.includes('my_class') && typeof window.currentStudentView !== 'undefined' && window.currentStudentView === 'matrix') {
        if (typeof window.switchStudentViewMode === 'function') {
            window.switchStudentViewMode('roster');
            return;
        }
    }

    // On attendance.html: if in drill-down sub-step (type, batch, subject, action, watch), step back inside attendance flow first!
    if (path.includes('attendance') && typeof window.goBackOneStep === 'function' && window.attFlow && window.attFlow.step !== 'class') {
        window.goBackOneStep();
        return;
    }

    // 4. Page-level Navigation:
    // If user has history within app, go back
    if (window.history.length > 1 && document.referrer && (document.referrer.includes(window.location.host) || document.referrer.includes('Main_Page') || document.referrer.includes('.html'))) {
        window.history.back();
        // Safety fallback if history didn't change page
        setTimeout(() => {
            if (!isHome && (window.location.pathname.toLowerCase() === path)) {
                window.location.href = 'index.html';
            }
        }, 320);
    } else {
        if (!isHome) {
            window.location.href = 'index.html';
        }
    }
};

// Global keydown listener for Escape
window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            document.activeElement.blur();
        }
        window.trevaGoBack();
    }
});
