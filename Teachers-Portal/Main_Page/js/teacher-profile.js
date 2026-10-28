/**
 * ============================================================================
 * TREVA ECOSYSTEM — TEACHER PROFILE & CREDENTIALS MANAGER
 * Displays complete profile dossier: Name, Class Coordinator, Password (with
 * reveal/hide), Department, College, Teacher ID, and Password Updates.
 * ============================================================================
 */

(function() {
    "use strict";

    let isPasswordRevealed = false;
    let isEditingPassword = false;

    // Retrieves active teacher session from storage or TrevaSession helper
    function getSession() {
        if (typeof TrevaSession !== 'undefined' && typeof TrevaSession.load === 'function') {
            return TrevaSession.load() || {};
        }
        try {
            const raw = localStorage.getItem('treva_teacher_session') || sessionStorage.getItem('treva_teacher_session');
            return raw ? JSON.parse(raw) : {};
        } catch(e) {
            return {};
        }
    }

/* =============================================
   MODAL DOM INJECTION — Generates and injects profile modal markup into DOM
   ============================================= */
    // Ensures modal container and card structure exist in document body
    function ensureProfileModalDom() {
        if (typeof document === 'undefined') return null;
        let modal = document.getElementById('teacherProfileModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'teacherProfileModal';
        modal.className = 'modal-overlay teacher-profile-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'tProfName');

        modal.innerHTML = `
            <div class="teacher-profile-card">
                <!-- Modal Header -->
                <div class="tprof-header">
                    <div class="tprof-identity">
                        <div class="tprof-avatar-wrap">
                            <div class="tprof-avatar" id="tProfAvatar">SP</div>
                            <span class="tprof-online-dot" title="Active Session"></span>
                        </div>
                        <div class="tprof-meta">
                            <div class="tprof-name-row">
                                <h2 class="tprof-name" id="tProfName">Teacher Profile</h2>
                                <span class="tprof-role-badge" id="tProfRoleBadge">Class Coordinator</span>
                            </div>
                            <div class="tprof-sub-row">
                                <span class="tprof-username" id="tProfUsername">@username</span>
                                <span class="tprof-dot-sep">•</span>
                                <span class="tprof-dept" id="tProfDept">Computer Engineering</span>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="tprof-close-btn" onclick="closeTeacherProfileModal()" title="Close (Esc)">
                        <i data-lucide="x"></i>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="tprof-body">
                    <!-- Academic Assignment Grid -->
                    <div class="tprof-section">
                        <div class="tprof-section-title">
                            <i data-lucide="shield-check"></i> Academic Identity & Designation
                        </div>
                        <div class="tprof-grid">
                            <div class="tprof-info-box">
                                <span class="tprof-info-lbl">Coordinating Class</span>
                                <div class="tprof-info-val" id="tProfClassVal">
                                    <span class="tprof-coord-pill" id="tProfClassPill">CO31</span>
                                    <small id="tProfClassSub" style="color:var(--text-muted); font-size:11.5px; margin-left:6px;">Semester 3 Incharge</small>
                                </div>
                            </div>

                            <div class="tprof-info-box">
                                <span class="tprof-info-lbl">Institution / College</span>
                                <div class="tprof-info-val" id="tProfCollege">R.C. Technical Institute</div>
                            </div>

                            <div class="tprof-info-box">
                                <span class="tprof-info-lbl">Department</span>
                                <div class="tprof-info-val" id="tProfDepartment">Computer Engineering</div>
                            </div>

                            <div class="tprof-info-box">
                                <span class="tprof-info-lbl">Faculty / Teacher ID</span>
                                <div class="tprof-info-val"><code id="tProfTeacherId">#T-31</code></div>
                            </div>
                        </div>
                    </div>

                    <!-- Security & Credentials Section (PASSWORD REVEAL) -->
                    <div class="tprof-section tprof-security-section">
                        <div class="tprof-section-title">
                            <i data-lucide="key"></i> Account Credentials & Security
                        </div>

                        <div class="tprof-credential-box">
                            <div class="tprof-cred-row">
                                <div class="tprof-cred-left">
                                    <div class="tprof-cred-label">Login Password</div>
                                    <div class="tprof-password-display">
                                        <span class="tprof-password-text" id="tProfPasswordDisplay">••••••••••••</span>
                                        <span class="tprof-password-badge" id="tProfPassBadge">Encrypted in DB</span>
                                    </div>
                                </div>
                                <div class="tprof-cred-actions">
                                    <button type="button" class="tprof-btn-sec" id="btnToggleProfPassword" onclick="toggleTeacherProfilePassword()" title="Reveal / Hide Password">
                                        <i data-lucide="eye" id="tProfEyeIcon"></i>
                                        <span id="tProfEyeLabel">Show</span>
                                    </button>
                                    <button type="button" class="tprof-btn-sec" onclick="copyTeacherProfilePassword()" title="Copy password">
                                        <i data-lucide="copy"></i>
                                        <span>Copy</span>
                                    </button>
                                    <button type="button" class="tprof-btn-sec" onclick="toggleEditTeacherPassword()" title="Change Password">
                                        <i data-lucide="edit-3"></i>
                                        <span>Change</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Inline Password Editor Form -->
                            <div class="tprof-change-pass-wrap" id="tProfChangePassWrap" style="display:none;">
                                <div class="tprof-change-pass-box">
                                    <label for="newTeacherPasswordInput">Enter New Password (min 8 chars):</label>
                                    <div class="tprof-input-action-row">
                                        <input type="text" id="newTeacherPasswordInput" placeholder="Enter new strong password" maxlength="72">
                                        <button type="button" class="primary-action-btn" id="btnSaveNewPassword" onclick="saveNewTeacherPassword()">
                                            <i data-lucide="check"></i> Save
                                        </button>
                                        <button type="button" class="cancel-btn" onclick="toggleEditTeacherPassword(false)">
                                            Cancel
                                        </button>
                                    </div>
                                    <span class="tprof-msg" id="tProfPassMsg"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- One-Time Login Session Status -->
                    <div class="tprof-session-banner">
                        <div class="tprof-session-banner-left">
                            <i data-lucide="check-circle-2"></i>
                            <div>
                                <strong>Persistent 1-Time Login Active</strong>
                                <p>You remain signed in on this device across browser sessions without entering password repeatedly.</p>
                            </div>
                        </div>
                        <span class="tprof-session-pill">Active Session</span>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="tprof-footer">
                    <button type="button" class="tprof-logout-btn" onclick="logoutTeacher()" title="Sign out from this device">
                        <i data-lucide="log-out"></i> Sign Out
                    </button>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button type="button" class="cancel-btn" onclick="closeTeacherProfileModal()">Close (Esc)</button>
                        <button type="button" class="primary-action-btn" onclick="window.location.href='settings.html'">
                            <i data-lucide="palette"></i> Theme & Appearance
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        return modal;
    }

/* =============================================
   PROFILE CONTROLLER & DATA LOADING — Loads teacher profile data and updates UI
   ============================================= */
    // Fetches credentials from Supabase if needed and populates profile modal fields
    window.openTeacherProfileModal = async function() {
        const modal = ensureProfileModalDom();
        if (!modal) return;

        let session = getSession();

        // Some login paths omit the password from the session; hydrate profile data before rendering.
        if (!session.password && session.fullname && typeof SUPABASE_URL !== 'undefined') {
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/teacher_logins?fullname=eq.${encodeURIComponent(session.fullname)}&select=*`, {
                    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
                });
                if (res.ok) {
                    const rows = await res.json();
                    if (rows && rows.length > 0) {
                        const row = rows[0];
                        session.password = row.password;
                        if (!session.department) session.department = row.department;
                        if (!session.collegename) session.collegename = row.collegename;
                        if (row.batchofcoordinator) session.coordinatingClass = row.batchofcoordinator;
                        session.isCoordinator = (row.isclasscoordinator === 1) || Boolean(row.batchofcoordinator);
                        if (typeof TrevaSession !== 'undefined' && typeof TrevaSession.save === 'function') {
                            TrevaSession.save(session);
                        }
                    }
                }
            } catch(e) {
                console.warn('[TeacherProfile] Fresh fetch failed:', e);
            }
        }

        // 1. Initials & Avatar
        const fullName = session.fullname || session.username || 'Teacher';
        const initials = fullName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('') || 'SP';

        const avatarEl = document.getElementById('tProfAvatar');
        const nameEl   = document.getElementById('tProfName');
        const userEl   = document.getElementById('tProfUsername');
        const roleEl   = document.getElementById('tProfRoleBadge');
        const deptEl   = document.getElementById('tProfDept');
        const collEl   = document.getElementById('tProfCollege');
        const deptBoxEl = document.getElementById('tProfDepartment');
        const tidEl    = document.getElementById('tProfTeacherId');

        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl)   nameEl.textContent   = fullName;
        if (userEl)   userEl.textContent   = `@${(session.username || session.login_username || fullName).toLowerCase().replace(/\s+/g, '_')}`;

        const isCoord = Boolean(session.isCoordinator || session.coordinatingClass || session.batchofcoordinator);
        const coordClass = session.coordinatingClass || session.batchofcoordinator || (isCoord ? 'CO31' : '');

        if (roleEl) {
            roleEl.className = `tprof-role-badge ${isCoord ? 'coordinator' : 'faculty'}`;
            roleEl.textContent = isCoord ? `Class Coordinator · ${coordClass}` : 'Subject Faculty';
        }

        if (deptEl)    deptEl.textContent    = session.department || 'Computer Engineering';
        if (deptBoxEl) deptBoxEl.textContent = session.department || 'Computer Engineering';
        if (collEl)    collEl.textContent    = session.collegename || 'R.C. Technical Institute';
        if (tidEl)     tidEl.textContent     = session.teacherid ? `#T-${session.teacherid}` : `#FAC-${fullName.slice(0, 3).toUpperCase()}`;

        // Class Coordinator section
        const classPillEl = document.getElementById('tProfClassPill');
        const classSubEl  = document.getElementById('tProfClassSub');
        if (classPillEl && classSubEl) {
            if (isCoord) {
                classPillEl.textContent = coordClass || 'CO31';
                classPillEl.className = 'tprof-coord-pill active';
                classSubEl.textContent = `Designated Coordinator for ${coordClass}`;
            } else {
                classPillEl.textContent = 'None';
                classPillEl.className = 'tprof-coord-pill none';
                classSubEl.textContent = 'Not assigned as class incharge';
            }
        }

        // 2. Password section
        isPasswordRevealed = false;
        isEditingPassword = false;
        renderPasswordDisplay();

        modal.classList.add('open');
        try { if (window.lucide) lucide.createIcons(); } catch(e) {}
    };

    // Closes the teacher profile modal
    window.closeTeacherProfileModal = function() {
        const modal = document.getElementById('teacherProfileModal');
        if (modal) modal.classList.remove('open');
    };

/* =============================================
   PASSWORD MANAGEMENT — Password reveal, clipboard copy, and credentials updates
   ============================================= */
    // Toggles between masked and revealed password text
    window.toggleTeacherProfilePassword = function() {
        isPasswordRevealed = !isPasswordRevealed;
        renderPasswordDisplay();
    };

    // Updates password text, visibility icons, and security badges
    function renderPasswordDisplay() {
        const session = getSession();
        const pwd = session.password || '••••••••';
        const displayEl = document.getElementById('tProfPasswordDisplay');
        const eyeIconEl = document.getElementById('tProfEyeIcon');
        const eyeLblEl  = document.getElementById('tProfEyeLabel');
        const badgeEl   = document.getElementById('tProfPassBadge');

        if (displayEl) {
            if (isPasswordRevealed) {
                displayEl.textContent = pwd;
                displayEl.classList.add('revealed');
                if (eyeLblEl) eyeLblEl.textContent = 'Hide';
                if (eyeIconEl) eyeIconEl.setAttribute('data-lucide', 'eye-off');
                if (badgeEl) badgeEl.textContent = 'Revealed';
            } else {
                displayEl.textContent = '••••••••••••';
                displayEl.classList.remove('revealed');
                if (eyeLblEl) eyeLblEl.textContent = 'Show';
                if (eyeIconEl) eyeIconEl.setAttribute('data-lucide', 'eye');
                if (badgeEl) badgeEl.textContent = 'Encrypted in DB';
            }
        }
        try { if (window.lucide) lucide.createIcons(); } catch(e) {}
    }

    // Copies active password to system clipboard
    window.copyTeacherProfilePassword = function() {
        const session = getSession();
        const pwd = session.password || '';
        if (!pwd) {
            alert('Password not found in session.');
            return;
        }
        navigator.clipboard.writeText(pwd).then(() => {
            const badge = document.getElementById('tProfPassBadge');
            if (badge) {
                const prev = badge.textContent;
                badge.textContent = '✓ Copied to clipboard!';
                badge.style.color = '#15803d';
                setTimeout(() => {
                    badge.textContent = prev;
                    badge.style.color = '';
                }, 1800);
            }
        }).catch(() => {
            alert(`Password: ${pwd}`);
        });
    };

    // Shows or hides inline password change input field
    window.toggleEditTeacherPassword = function(forceState = null) {
        isEditingPassword = (forceState !== null) ? forceState : !isEditingPassword;
        const wrap = document.getElementById('tProfChangePassWrap');
        const input = document.getElementById('newTeacherPasswordInput');
        const msg = document.getElementById('tProfPassMsg');
        if (wrap) wrap.style.display = isEditingPassword ? 'block' : 'none';
        if (msg) msg.textContent = '';
        if (isEditingPassword && input) {
            input.value = '';
            input.focus();
        }
        try { if (window.lucide) lucide.createIcons(); } catch(e) {}
    };

    // Validates and persists updated password to Supabase and local session
    window.saveNewTeacherPassword = async function() {
        const input = document.getElementById('newTeacherPasswordInput');
        const msg   = document.getElementById('tProfPassMsg');
        const btn   = document.getElementById('btnSaveNewPassword');
        if (!input || !input.value.trim()) {
            if (msg) { msg.textContent = 'Please enter a valid password.'; msg.style.color = '#dc2626'; }
            return;
        }
        const newPwd = input.value.trim();
        if (newPwd.length < 8) {
            if (msg) { msg.textContent = 'Password must be at least 8 characters.'; msg.style.color = '#dc2626'; }
            return;
        }

        const session = getSession();
        const fullName = session.fullname;
        if (!fullName) {
            if (msg) { msg.textContent = 'Unable to identify active teacher session.'; msg.style.color = '#dc2626'; }
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `Saving...`;
        }

        try {
            if (typeof sbUpdate === 'function') {
                await sbUpdate('teacher_logins', { fullname: fullName }, { password: newPwd });
            } else if (typeof SUPABASE_URL !== 'undefined') {
                await fetch(`${SUPABASE_URL}/rest/v1/teacher_logins?fullname=eq.${encodeURIComponent(fullName)}`, {
                    method: 'PATCH',
                    headers: {
                        "apikey": SUPABASE_KEY,
                        "Authorization": `Bearer ${SUPABASE_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ password: newPwd })
                });
            }

            // Update in-memory session and localStorage
            session.password = newPwd;
            if (typeof TrevaSession !== 'undefined' && typeof TrevaSession.save === 'function') {
                TrevaSession.save(session);
            }

            if (msg) {
                msg.textContent = '✓ Password updated successfully in database!';
                msg.style.color = '#15803d';
            }
            isPasswordRevealed = true;
            renderPasswordDisplay();

            setTimeout(() => {
                toggleEditTeacherPassword(false);
            }, 1200);

        } catch (err) {
            console.error('[TeacherProfile] Password update error:', err);
            if (msg) {
                msg.textContent = 'Failed to update password in database. Please try again.';
                msg.style.color = '#dc2626';
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="check"></i> Save`;
                try { if (window.lucide) lucide.createIcons(); } catch(e) {}
            }
        }
    };

/* =============================================
   SESSION & EVENT HOOKING — Session teardown and UI event triggers
   ============================================= */
    // Clears user session and redirects to signin portal
    window.logoutTeacher = function() {
        if (typeof TrevaSession !== 'undefined' && typeof TrevaSession.clear === 'function') {
            TrevaSession.clear();
        } else {
            try {
                localStorage.removeItem('treva_teacher_session');
                sessionStorage.removeItem('treva_teacher_session');
            } catch(e) {}
        }
        window.location.href = '../temp_signinup/index1.html?logout=true';
    };

    // Auto-hook click events across the page on ready
    function autoHookProfileTriggers() {
        // 1. Profile avatar button
        const profDD  = document.getElementById('profDD');

        if (profDD) {
            // Find Profile item in dropdown
            const items = profDD.querySelectorAll('.dd-item');
            items.forEach(item => {
                if (item.textContent.toLowerCase().includes('profile') || item.querySelector('[data-lucide="user"]')) {
                    item.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        profDD.classList.remove('open');
                        window.openTeacherProfileModal();
                    };
                }
                if (item.classList.contains('logout') || item.textContent.toLowerCase().includes('logout') || item.textContent.toLowerCase().includes('sign out')) {
                    item.onclick = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.logoutTeacher();
                    };
                }
            });
        }

        // 2. Dashboard Card 1 (.card-profile)
        const cardProfile = document.querySelector('.card-profile');
        if (cardProfile) {
            cardProfile.style.cursor = 'pointer';
            cardProfile.setAttribute('title', 'Click to view complete teacher profile & credentials');
            cardProfile.addEventListener('click', (e) => {
                // If clicked on an inner button, ignore
                if (e.target.closest('button') || e.target.closest('a')) return;
                window.openTeacherProfileModal();
            });
        }

        // 3. Esc key listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('teacherProfileModal');
                if (modal && modal.classList.contains('open')) {
                    window.closeTeacherProfileModal();
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoHookProfileTriggers);
    } else {
        autoHookProfileTriggers();
    }

})();
