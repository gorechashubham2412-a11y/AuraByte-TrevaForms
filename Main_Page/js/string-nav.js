/**
 * ============================================================================
 * VERTICAL STRING NAV - ELASTIC 1D WAVE EQUATION PHYSICS ENGINE
 * ============================================================================
 */

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
        if (path.includes('my_class') || path.includes('myclass')) {
            initialIndex = 1;
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

        function pluck(yVal, amp) {
            const j = nodeAt(yVal);
            for (let k = -5; k <= 5; k++) {
                if (j + k >= 0 && j + k < N) {
                    const w = Math.exp(-k * k / 6);
                    v[j + k] += amp * w;
                }
            }
        }

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

        function navigateTab(idx) {
            const btn = navButtons[idx];
            if (!btn) return;
            const tabName = btn.getAttribute('data-tab');

            const isHome = path.endsWith('index.html') || path.endsWith('/') || (!path.includes('my_class') && !path.includes('settings') && !path.includes('analytics') && !path.includes('students'));
            const isMyClass = path.includes('my_class');

            if (tabName === 'home') {
                if (!isHome) setTimeout(() => { window.location.href = 'index.html'; }, 240);
            } else if (tabName === 'myclass') {
                if (!isMyClass) setTimeout(() => { window.location.href = 'my_class.html'; }, 240);
                else if (typeof window.switchSection === 'function') window.switchSection('students');
            } else if (tabName === 'students') {
                if (!path.includes('students')) {
                    setTimeout(() => { window.location.href = 'students.html'; }, 240);
                }
            } else if (tabName === 'resources') {
                if (isMyClass && typeof window.switchSection === 'function') {
                    window.switchSection('resources');
                } else {
                    setTimeout(() => { window.location.href = 'my_class.html'; }, 240);
                }
            } else if (tabName === 'analytics') {
                if (!path.includes('analytics')) {
                    setTimeout(() => { window.location.href = 'analytics.html'; }, 240);
                }
            } else if (tabName === 'forms' || tabName === 'messages') {
                if (!isHome) setTimeout(() => { window.location.href = 'index.html'; }, 240);
            }
        }

        function goTo(i) {
            if (i < 0 || i >= navButtons.length) return;
            ty = iy(i);
            selectNav(i, true);
            navigateTab(i);
        }

        window.setNavActiveByName = function(name) {
            const idx = navButtons.findIndex(btn => btn.getAttribute('data-tab') === name);
            if (idx !== -1) goTo(idx);
        };

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

            by = ty = iy(cur);
            selectNav(cur, false);
        }

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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
