/**
 * ============================================================================
 * TREVA ECOSYSTEM — SUPABASE CLIENT (SHARED)
 * Include this before any page script that needs to talk to Supabase.
 * ============================================================================
 */

const SUPABASE_URL = "https://xhmpdhousonsdasolyzc.supabase.co";
const SUPABASE_KEY = "sb_publishable_GnvX1KDInNAm0Ip6OSynJg_PomHcyVp";

/**
 * Thin REST wrapper around Supabase PostgREST.
 * @param {string} table      - Table name (e.g. 'teacher')
 * @param {object} [params]   - Query params: { select, eq, order, limit }
 * @returns {Promise<Array>}
 */
async function sbSelect(table, params = {}) {
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
    return res.json();
}

/**
 * Insert a row into a Supabase table.
 * @param {string} table
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function sbInsert(table, payload) {
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
    return res.json();
}

/**
 * Update rows in a Supabase table using PATCH.
 * @param {string} table
 * @param {object} filterParams - e.g. { student_id: 'in.(148,149)' } or { class_id: 31 }
 * @param {object} payload - fields to update
 * @returns {Promise<Array>}
 */
async function sbUpdate(table, filterParams = {}, payload = {}) {
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
    return res.json();
}

/**
 * Delete row(s) from a Supabase table.
 * @param {string} table
 * @param {object} filterParams - e.g. { student_id: 148 } or { student_id: 'in.(148,149)' }
 * @returns {Promise<Array>}
 */
async function sbDelete(table, filterParams = {}) {
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
    return res.json();
}

/**
 * Session helpers — store/retrieve teacher info in sessionStorage.
 */
const TrevaSession = {
    KEY: 'treva_teacher_session',

    save(data) {
        try { sessionStorage.setItem(this.KEY, JSON.stringify(data)); } catch(e) {}
    },

    load() {
        try { return JSON.parse(sessionStorage.getItem(this.KEY) || 'null'); } catch(e) { return null; }
    },

    clear() {
        try { sessionStorage.removeItem(this.KEY); } catch(e) {}
    },

    /** Redirect to sign-in if no session exists */
    requireAuth(signinPath = '../temp_signinup/index1.html') {
        if (!this.load()) {
            window.location.href = signinPath;
        }
    }
};
