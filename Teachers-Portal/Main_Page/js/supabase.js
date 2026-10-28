/**
 * ============================================================================
 * TREVA ECOSYSTEM — SUPABASE CLIENT (SHARED)
 * Include this before any page script that needs to talk to Supabase.
 * ============================================================================
 */

const SUPABASE_URL = "https://xhmpdhousonsdasolyzc.supabase.co";
const SUPABASE_KEY = "sb_publishable_GnvX1KDInNAm0Ip6OSynJg_PomHcyVp";

/* =============================================
   GLOBAL LOADING MANAGER — Loading animation overlay and state tracking
   ============================================= */

let _activeDbRequestsCount = 0;
let _loaderHideTimer = null;
let _loaderElement = null;

// Creates or retrieves the singleton global loading overlay DOM element
function ensureGlobalLoaderElement() {
    if (typeof document === 'undefined') return null;
    if (_loaderElement && document.body && document.body.contains(_loaderElement)) return _loaderElement;
    _loaderElement = document.getElementById('trevaGlobalLoader');
    if (!_loaderElement && document.body) {
        _loaderElement = document.createElement('div');
        _loaderElement.id = 'trevaGlobalLoader';
        _loaderElement.className = 'treva-global-loader';
        const assetPath = 'assets/loading.svg';
        _loaderElement.innerHTML = `
            <div class="treva-global-loader-icon">
                <img src="${assetPath}" alt="Loading...">
            </div>
            <div class="treva-global-loader-text">
                <span class="treva-global-loader-title" id="trevaGlobalLoaderTitle">Loading from Database...</span>
                <span class="treva-global-loader-sub" id="trevaGlobalLoaderSub">Syncing records with Supabase</span>
            </div>
        `;
        document.body.appendChild(_loaderElement);
    }
    return _loaderElement;
}

// Shows the global database loading overlay with customizable text
window.showGlobalLoader = function(title = 'Loading from Database...', sub = 'Syncing records with Supabase') {
    if (typeof document === 'undefined') return;
    const el = ensureGlobalLoaderElement();
    if (!el) return;
    const titleEl = document.getElementById('trevaGlobalLoaderTitle');
    const subEl   = document.getElementById('trevaGlobalLoaderSub');
    if (titleEl) titleEl.textContent = title;
    if (subEl)   subEl.textContent   = sub;
    if (_loaderHideTimer) {
        clearTimeout(_loaderHideTimer);
        _loaderHideTimer = null;
    }
    el.classList.add('active');
};

// Hides the global database loading overlay after an optional delay
window.hideGlobalLoader = function(delayMs = 280) {
    if (_loaderHideTimer) clearTimeout(_loaderHideTimer);
    _loaderHideTimer = setTimeout(() => {
        if (_activeDbRequestsCount <= 0 && _loaderElement) {
            _loaderElement.classList.remove('active');
        }
    }, delayMs);
};

// Generates inline HTML markup for table/card loading placeholders
window.getTrevaLoadingHtml = function(title = 'Loading records from database...', sub = 'Fetching live data from Supabase...') {
    const assetPath = 'assets/loading.svg';
    return `
        <div class="treva-loading-box">
            <div class="treva-loader-icon-card">
                <img src="${assetPath}" alt="Loading...">
            </div>
            <div>
                <div class="treva-loader-heading">${title}</div>
                <div class="treva-loader-desc">${sub}</div>
            </div>
        </div>`;
};

// Initialize loader element on DOM ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureGlobalLoaderElement);
    } else {
        ensureGlobalLoaderElement();
    }
}

/* =============================================
   POSTGREST REST HELPERS — Supabase query, insert, update, and delete wrappers
   ============================================= */

/**
 * Thin REST wrapper around Supabase PostgREST.
 * @param {string} table      - Table name (e.g. 'teacher')
 * @param {object} [params]   - Query params: { select, eq, order, limit }
 * @returns {Promise<Array>}
 */
async function sbSelect(table, params = {}) {
    // Keep the shared loader open until every overlapping request has finished.
    _activeDbRequestsCount++;
    if (_activeDbRequestsCount === 1) {
        const prettyTable = table === 'student' ? 'Student Records' : table === 'timetable_slot' ? 'Timetable Slots' : table;
        window.showGlobalLoader(`Loading ${prettyTable}...`, 'Syncing records from database');
    }
    try {
        let url = `${SUPABASE_URL}/rest/v1/${table}?`;
        if (params.select) url += `select=${encodeURIComponent(params.select)}&`;
        if (params.eq) {
            for (const [col, val] of Object.entries(params.eq)) {
                url += `${col}=eq.${encodeURIComponent(val)}&`;
            }
        }
        if (params.order) url += `order=${encodeURIComponent(params.order)}&`;
        if (params.limit)  url += `limit=${params.limit}&`;

        const res = await fetch(url, {
            headers: {
                "apikey":        SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type":  "application/json"
            }
        });
        if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
        return await res.json();
    } finally {
        _activeDbRequestsCount = Math.max(0, _activeDbRequestsCount - 1);
        if (_activeDbRequestsCount === 0) {
            window.hideGlobalLoader(300);
        }
    }
}

/**
 * Insert a row into a Supabase table.
 * @param {string} table
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function sbInsert(table, payload) {
    _activeDbRequestsCount++;
    window.showGlobalLoader(`Saving to Database...`, `Creating new record in ${table}`);
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method:  "POST",
            headers: {
                "apikey":        SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type":  "application/json",
                "Prefer":        "return=representation"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
        return await res.json();
    } finally {
        _activeDbRequestsCount = Math.max(0, _activeDbRequestsCount - 1);
        if (_activeDbRequestsCount === 0) {
            window.hideGlobalLoader(300);
        }
    }
}

/**
 * Update rows in a Supabase table using PATCH.
 * @param {string} table
 * @param {object} filterParams - e.g. { student_id: 'in.(148,149)' } or { class_id: 31 }
 * @param {object} payload - fields to update
 * @returns {Promise<Array>}
 */
async function sbUpdate(table, filterParams = {}, payload = {}) {
    _activeDbRequestsCount++;
    window.showGlobalLoader(`Updating Database...`, `Saving changes to ${table}`);
    try {
        let url = `${SUPABASE_URL}/rest/v1/${table}?`;
        for (const [col, val] of Object.entries(filterParams)) {
            if (typeof val === 'string' && (val.startsWith('in.') || val.startsWith('gte.') || val.startsWith('lte.') || val.startsWith('eq.'))) {
                url += `${col}=${val}&`;
            } else {
                url += `${col}=eq.${encodeURIComponent(val)}&`;
            }
        }
        const res = await fetch(url, {
            method:  "PATCH",
            headers: {
                "apikey":        SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type":  "application/json",
                "Prefer":        "return=representation"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
        return await res.json();
    } finally {
        _activeDbRequestsCount = Math.max(0, _activeDbRequestsCount - 1);
        if (_activeDbRequestsCount === 0) {
            window.hideGlobalLoader(300);
        }
    }
}

/**
 * Delete row(s) from a Supabase table.
 * @param {string} table
 * @param {object} filterParams - e.g. { student_id: 148 } or { student_id: 'in.(148,149)' }
 * @returns {Promise<Array>}
 */
async function sbDelete(table, filterParams = {}) {
    _activeDbRequestsCount++;
    window.showGlobalLoader(`Deleting from Database...`, `Removing record from ${table}`);
    try {
        let url = `${SUPABASE_URL}/rest/v1/${table}?`;
        for (const [col, val] of Object.entries(filterParams)) {
            if (typeof val === 'string' && (val.startsWith('in.') || val.startsWith('gte.') || val.startsWith('lte.') || val.startsWith('eq.'))) {
                url += `${col}=${val}&`;
            } else {
                url += `${col}=eq.${encodeURIComponent(val)}&`;
            }
        }
        const res = await fetch(url, {
            method:  "DELETE",
            headers: {
                "apikey":        SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type":  "application/json",
                "Prefer":        "return=representation"
            }
        });
        if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
        return await res.json();
    } finally {
        _activeDbRequestsCount = Math.max(0, _activeDbRequestsCount - 1);
        if (_activeDbRequestsCount === 0) {
            window.hideGlobalLoader(300);
        }
    }
}

/* =============================================
   SESSION MANAGER — Teacher authentication state and session persistence
   ============================================= */

/**
 * Session helpers — store/retrieve teacher info in localStorage (persistent 1-time login)
 * and mirror in sessionStorage.
 */
const TrevaSession = {
    KEY: 'treva_teacher_session',

    save(data) {
        try {
            const current = this.load() || {};
            const merged = { ...current, ...data };
            localStorage.setItem(this.KEY, JSON.stringify(merged));
            sessionStorage.setItem(this.KEY, JSON.stringify(merged));
            return merged;
        } catch(e) {
            return data;
        }
    },

    update(partialData) {
        return this.save(partialData);
    },

    load() {
        try {
            const raw = localStorage.getItem(this.KEY) || sessionStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : null;
        } catch(e) {
            return null;
        }
    },

    clear() {
        try {
            localStorage.removeItem(this.KEY);
            sessionStorage.removeItem(this.KEY);
        } catch(e) {}
    },

    /** Redirect to sign-in if no session exists */
    requireAuth(signinPath = '../temp_signinup/index1.html') {
        if (!this.load()) {
            window.location.href = signinPath;
        }
    }
};
if (typeof window !== 'undefined') {
    window.TrevaSession = TrevaSession;
}

/* =============================================
   ATTENDANCE UTILITIES — Shared metrics, session aggregation, and database sync
   ============================================= */

/**
 * Shared Attendance Utilities for Treva Ecosystem
 */
const TrevaAttendance = {
    KEY: 'treva_attendance_log',

    getLog() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY) || '[]');
        } catch(e) {
            return [];
        }
    },

    saveLog(arr) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(arr));
        } catch(e) {}
    },

    /**
     * Calculate individual student attendance from all recorded sessions
     */
    calculateStudentAttendance(enrollment, log = null) {
        if (!log) log = this.getLog();
        const enrollStr = String(enrollment || '').trim();
        if (!enrollStr) return { totalSessions: 0, attendedSessions: 0, pct: null, hasRecords: false };

        const studentSessions = log.filter(entry =>
            Array.isArray(entry.records) && entry.records.some(r => String(r.enroll).trim() === enrollStr)
        );

        if (studentSessions.length === 0) {
            return {
                totalSessions: 0,
                attendedSessions: 0,
                pct: null, // No fake baseline; return null when no attendance recorded in database
                hasRecords: false
            };
        }

        const attended = studentSessions.filter(entry =>
            entry.records.some(r => String(r.enroll).trim() === enrollStr && Boolean(r.present))
        ).length;

        const pct = Math.round((attended / studentSessions.length) * 100);
        return {
            totalSessions: studentSessions.length,
            attendedSessions: attended,
            pct: pct,
            hasRecords: true
        };
    },

    /**
     * Calculate overall class average attendance percentage
     */
    calculateClassAverage(students, log = null) {
        if (!students || students.length === 0) return null;
        if (!log) log = this.getLog();
        let sum = 0;
        let count = 0;
        students.forEach(s => {
            const stats = this.calculateStudentAttendance(s.enroll, log);
            if (stats.hasRecords && Number.isFinite(stats.pct)) {
                sum += stats.pct;
                count++;
            }
        });
        return count ? Math.round(sum / count) : null;
    },

    /**
     * Get unique attendance dates sorted chronologically
     */
    getDates(log = null) {
        if (!log) log = this.getLog();
        const dateMap = new Map();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Several classes or subjects can have sessions on one date; expose them as one day.
        (log || []).forEach(entry => {
            if (!entry.date) return;
            if (!dateMap.has(entry.date)) {
                let dayName = '';
                try {
                    const d = new Date(entry.date);
                    dayName = dayNames[d.getDay()] || '';
                } catch(e) {}
                dateMap.set(entry.date, {
                    date: entry.date,
                    day: dayName || 'Day',
                    total: 0,
                    sessions: []
                });
            }
            const item = dateMap.get(entry.date);
            item.total++;
            item.sessions.push(entry);
        });

        return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    },

    /**
     * Safely sync session attendance records to Supabase public.attendance
     */
    async syncSessionToSupabase(slotId, records, dateStr, teacherId = null) {
        if (typeof SUPABASE_URL === 'undefined' || !slotId || !Array.isArray(records)) return;
        try {
            const validTeacherId = (Number.isInteger(Number(teacherId)) && Number(teacherId) >= 2 && Number(teacherId) <= 20)
                ? Number(teacherId)
                : null;

            // Attendance can be marked before a student has a database ID; those rows cannot sync.
            const rowsToInsert = records.map(r => ({
                slotid: slotId,
                student_id: r.id || null,
                date: dateStr,
                is_present: Boolean(r.present),
                marked_by: validTeacherId
            })).filter(r => r.student_id);

            if (rowsToInsert.length === 0) return;

            const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(rowsToInsert)
            });
            if (!res.ok) {
                console.warn('[TrevaAttendance] Supabase sync returned status:', res.status);
            }
        } catch (err) {
            console.warn('[TrevaAttendance] Supabase sync error:', err);
        }
    }
};
