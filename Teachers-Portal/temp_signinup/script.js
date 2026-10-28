(() => {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  // Scene & DOM Elements
  const scene = $("#loginScene");
  const form = $("#authForm");
  const themeToggle = $("#themeToggle");
  const passwordToggle = $("#passwordToggle");
  const confirmPasswordToggle = $("#confirmPasswordToggle");
  const switchMode = $("#switchMode");
  const loginTab = $("#loginTab");
  const createTab = $("#createTab");
  const submitButton = $("#submitButton");
  const submitText = $("#submitText");
  const statusMessage = $("#statusMessage");
  const toast = $("#toast");
  const cursorGlow = $("#cursorGlow");
  const bgCanvas = $("#bgCanvas");

  // Form Inputs
  const collegeInput = $("#college");
  const departmentInput = $("#department");
  const nameInput = $("#name");
  const idInput = $("#userId");
  const passwordInput = $("#password");
  const confirmPasswordInput = $("#confirmPassword");
  const isCoordinatorInput = $("#isCoordinator");
  const coordinatorClassInput = $("#coordinatorClass");
  const rememberInput = $("#remember");

  // Containers & Labels
  const coordinatorContainer = $("#coordinatorContainer");
  const coordinatorLabel = $("#coordinatorLabel");
  const batchYearContainer = $("#batchYearContainer");
  const idLabel = $("#idLabel");
  const passwordLabel = $("#passwordLabel");
  const formEyebrow = $("#formEyebrow");
  const formTitle = $("#formTitle");
  const formSubtitle = $("#formSubtitle");
  const switchPrompt = $("#switchPrompt");
  const panelTitle = $("#panelTitle");
  const panelText = $("#panelText");

  // Field Errors
  const collegeError = $("#collegeError");
  const departmentError = $("#departmentError");
  const nameError = $("#nameError");
  const idError = $("#idError");
  const passwordError = $("#passwordError");
  const confirmPasswordError = $("#confirmPasswordError");
  const coordinatorClassError = $("#coordinatorClassError");

  let mode = "login";
  let toastTimer;

  // Supabase config — sourced from shared supabase.js (loaded via index1.html)
  // SUPABASE_URL and SUPABASE_KEY are declared globally in supabase.js

  const REMEMBER_KEY = "auraBytesRememberedTeacherId";
  const THEME_KEY = "auraBytesTheme";

  init();

  function init() {
    loadTheme();
    loadRememberedId();
    loadTeachersAndClasses();
    bindEvents();
    initCanvasAnimation();
    initCursorGlow();
    checkActiveSession();
  }

  /* =============================================
     Canvas Animation — Particle network background
     ============================================= */

  // Initializes particle animation on canvas with mouse repulsion and link connections
  function initCanvasAnimation() {
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext("2d");
    let width = (bgCanvas.width = window.innerWidth);
    let height = (bgCanvas.height = window.innerHeight);

    let mouse = { x: width / 2, y: height / 2, radius: 140 };

    window.addEventListener("resize", () => {
      width = bgCanvas.width = window.innerWidth;
      height = bgCanvas.height = window.innerHeight;
    });

    window.addEventListener("mousemove", e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    const particleCount = Math.floor(Math.min(width, height) / 12);
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.4 + 0.1
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      const isDay = document.body.classList.contains("day-mode");
      const dotColor = isDay ? "2, 132, 199" : "56, 189, 248";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction / Repulsion
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x -= (dx / dist) * force * 3;
          p.y -= (dy / dist) * force * 3;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor}, ${p.baseAlpha})`;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const pdist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (pdist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${dotColor}, ${0.12 * (1 - pdist / 110)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    }

    render();
  }

  /* =============================================
     Cursor Glow — Interactive spotlight following cursor
     ============================================= */

  // Smoothly positions ambient cursor spotlight following mouse pointer
  function initCursorGlow() {
    if (!cursorGlow) return;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    window.addEventListener("mousemove", e => {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    function updateGlow() {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;
      cursorGlow.style.left = `${currentX}px`;
      cursorGlow.style.top = `${currentY}px`;
      requestAnimationFrame(updateGlow);
    }

    updateGlow();
  }

  /* =============================================
     Data Loading — Fetch faculty and class records
     ============================================= */

  // Populates teacher names and class dropdown options from Supabase
  async function loadTeachersAndClasses() {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/teacher?select=fullname&order=fullname.asc`, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        }),
        fetch(`${SUPABASE_URL}/rest/v1/class?select=classname,semid&order=classname.asc`, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        })
      ]);
      if (tRes.ok) {
        const teachers = await tRes.json();
        if (teachers && teachers.length > 0 && nameInput) {
          const curr = nameInput.value;
          nameInput.innerHTML = '<option value="" disabled selected>— Select your name —</option>' +
            teachers.map(t => `<option value="${t.fullname}">${t.fullname}</option>`).join('');
          if (curr) nameInput.value = curr;
        }
      }
      if (cRes.ok) {
        const classes = await cRes.json();
        if (classes && classes.length > 0 && coordinatorClassInput) {
          const curr = coordinatorClassInput.value;
          coordinatorClassInput.innerHTML = '<option value="" disabled selected>— Select class you coordinate —</option>' +
            classes.map(c => `<option value="${c.classname}">${c.classname} (Semester ${c.semid || '—'})</option>`).join('');
          if (curr) coordinatorClassInput.value = curr;
        }
      }
    } catch(e) {
      console.warn("Error fetching teachers/classes from Supabase:", e);
    }
  }

  // Binds user interaction and authentication event listeners
  function bindEvents() {
    themeToggle.addEventListener("click", toggleTheme);
    passwordToggle.addEventListener("click", togglePassword);
    confirmPasswordToggle.addEventListener("click", toggleConfirmPassword);
    switchMode.addEventListener("click", toggleAuthMode);

    if (loginTab) loginTab.addEventListener("click", () => setAuthMode("login"));
    if (createTab) createTab.addEventListener("click", () => setAuthMode("create"));

    form.addEventListener("submit", handleSubmit);
    $("#privacyLink").addEventListener("click", e => {
      e.preventDefault();
      showToast("Privacy policy integrated for Treva Forms Ecosystem.");
    });

    isCoordinatorInput.addEventListener("change", toggleCoordinatorClass);
    if (coordinatorClassInput) {
      coordinatorClassInput.addEventListener("change", () => clearFieldError(coordinatorClassInput, coordinatorClassError));
    }

    idInput.addEventListener("input", () => clearFieldError(idInput, idError));
    passwordInput.addEventListener("input", () => clearFieldError(passwordInput, passwordError));
    collegeInput.addEventListener("change", () => clearFieldError(collegeInput, collegeError));
    departmentInput.addEventListener("change", () => clearFieldError(departmentInput, departmentError));
    nameInput.addEventListener("change", () => clearFieldError(nameInput, nameError));
    nameInput.addEventListener("input", () => clearFieldError(nameInput, nameError));
    confirmPasswordInput.addEventListener("input", () => clearFieldError(confirmPasswordInput, confirmPasswordError));
  }

  function toggleCoordinatorClass() {
    if (isCoordinatorInput.checked) {
      batchYearContainer.style.display = "block";
      coordinatorLabel.classList.add("selected");
    } else {
      batchYearContainer.style.display = "none";
      if (coordinatorClassInput) coordinatorClassInput.value = "";
      coordinatorLabel.classList.remove("selected");
      if (coordinatorClassInput) clearFieldError(coordinatorClassInput, coordinatorClassError);
    }
  }

  /* =============================================
     Auth Mode Switching — Toggle between Sign In and Create Account
     ============================================= */

  // Toggles mode between login and create account
  function toggleAuthMode() {
    setAuthMode(mode === "login" ? "create" : "login");
  }

  // Updates submit button loading state and spinner
  function setSubmitLoading(isLoading, label) {
    if (!submitButton || !submitText) return;
    submitButton.classList.toggle("is-loading", isLoading);
    submitButton.disabled = isLoading;
    submitButton.setAttribute("aria-busy", String(isLoading));
    if (label) submitText.textContent = label;
  }

  // Clears submit button loading state and resets label
  function clearSubmitLoading() {
    setSubmitLoading(false, mode === "login" ? "Sign In" : "Create Account");
  }

  // Switches layout, labels, and visible fields between sign-in and sign-up
  function setAuthMode(nextMode) {
    mode = nextMode;
    scene.classList.toggle("create-mode", mode === "create");

    if (loginTab) loginTab.classList.toggle("active", mode === "login");
    if (createTab) createTab.classList.toggle("active", mode === "create");

    if (mode === "create") {
      formTitle.textContent = "Create Account";
      formSubtitle.textContent = "Set up your teacher access for Treva Forms.";
      passwordLabel.textContent = "Create Password";
      submitText.textContent = "Create Account";
      switchPrompt.textContent = "Already registered?";
      switchMode.textContent = "Sign In";
      panelTitle.textContent = "Set up your teacher access.";
      idLabel.textContent = "Username";
      idInput.placeholder = "Choose a username";
      coordinatorContainer.style.display = "block";
    } else {
      formTitle.textContent = "Welcome back";
      formSubtitle.textContent = "Sign in to access your teacher dashboard.";
      passwordLabel.textContent = "Password";
      submitText.textContent = "Sign In";
      switchPrompt.textContent = "Need a teacher account?";
      switchMode.textContent = "Create account";
      panelTitle.textContent = "Inspiring minds. Shaping tomorrow.";
      idLabel.textContent = "Username";
      idInput.placeholder = "Enter username";
      coordinatorContainer.style.display = "none";
      isCoordinatorInput.checked = false;
      toggleCoordinatorClass();
    }

    clearErrors();
    statusMessage.textContent = "";
    requestAnimationFrame(() => {
      if (mode === "create") {
        collegeInput.focus();
      } else {
        idInput.focus();
      }
    });
  }

  /* =============================================
     Form Submission — Validate input and authenticate
     ============================================= */

  // Validates form input, verifies credentials, and saves active session
  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitLoading(true, mode === "create" ? "Creating Account..." : "Verifying...");
    statusMessage.textContent = "";

    await wait(350);

    const id = idInput.value.trim();
    const password = passwordInput.value;

    if (mode === "create") {
      await createAccount(id, password);
      clearSubmitLoading();
      return;
    }

    const account = await getStoredAccount("teacher", id);
    const valid = account && (
      account.passwordHash === await sha256(password) ||
      account.rawPassword === password
    );

    if (!valid) {
      passwordInput.classList.add("invalid");
      passwordError.textContent = "Username or password is incorrect.";
      statusMessage.textContent = "";
      clearSubmitLoading();
      return;
    }

    if (rememberInput.checked) {
      localStorage.setItem(REMEMBER_KEY, id);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    // Save session — used by Main_Page to personalise the dashboard
    const tr = account.teacherRow || {};
    TrevaSession.save({
      username:          id,
      fullname:          account.fullname || tr.fullname || account.name || id,
      department:        account.department || tr.department || '',
      collegename:       account.collegename || tr.collegename || account.college || '',
      teacherid:         account.teacherid || tr.teacherid || null,
      isCoordinator:     Boolean(account.isCoordinator),
      coordinatingClass: account.coordinatingClass || '',
      batchofcoordinator: account.coordinatingClass || '',
      password:          account.rawPassword || password
    });

    beginLoginTransition();
  }

  /* =============================================
     Account Creation — Register new teacher in Supabase
     ============================================= */

  // Creates teacher login record and associates coordinator class in database
  async function createAccount(id, password) {
    const collegeVal = collegeInput.options[collegeInput.selectedIndex]?.text || collegeInput.value;
    const departmentVal = departmentInput.options[departmentInput.selectedIndex]?.text || departmentInput.value;
    const fullNameVal = nameInput.value.trim() || id;
    const isCoord = isCoordinatorInput.checked;
    const coordClass = isCoord && coordinatorClassInput ? coordinatorClassInput.value : "";

    let supabaseSaved = false;
    let createdTeacherRecord = null;
    try {
      // 1. Insert into teacher_logins
      const loginPayload = {
        collegename: collegeVal,
        department: departmentVal,
        fullname: fullNameVal,
        password: password,
        isclasscoordinator: isCoord ? 1 : 0,
        batchofcoordinator: coordClass
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/teacher_logins`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(loginPayload)
      });

      if (res.ok) {
        supabaseSaved = true;

        // 2. Fetch or create teacher record to get teacherid and link login_username
        let teacherRecord = null;
        try {
          const tRes = await fetch(`${SUPABASE_URL}/rest/v1/teacher?fullname=eq.${encodeURIComponent(fullNameVal)}&select=*`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
          });
          if (tRes.ok) {
            const tList = await tRes.json();
            if (tList && tList.length > 0) teacherRecord = tList[0];
          }
        } catch(e) {}

        if (!teacherRecord) {
          try {
            const insRes = await fetch(`${SUPABASE_URL}/rest/v1/teacher`, {
              method: "POST",
              headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
              },
              body: JSON.stringify({
                fullname: fullNameVal,
                department: departmentVal,
                collegename: collegeVal,
                login_username: id
              })
            });
            if (insRes.ok) {
              const insList = await insRes.json();
              if (insList && insList.length > 0) teacherRecord = insList[0];
            }
          } catch(e) {}
        }

        createdTeacherRecord = teacherRecord;

        if (teacherRecord) {
          // Update login_username for this teacher
          await fetch(`${SUPABASE_URL}/rest/v1/teacher?teacherid=eq.${teacherRecord.teacherid}`, {
            method: "PATCH",
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ login_username: id })
          });

          // 3. If coordinator, update coordinator in class table
          if (isCoord && coordClass) {
            await fetch(`${SUPABASE_URL}/rest/v1/class?classname=eq.${encodeURIComponent(coordClass)}`, {
              method: "PATCH",
              headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ coordinator: teacherRecord.teacherid })
            });
          }
        }
      } else {
        const errorDetail = await res.json().catch(() => ({}));
        console.warn("Supabase response:", res.status, errorDetail);
        if (res.status === 401) {
          statusMessage.textContent = "Supabase 401 RLS Error: Run 'ALTER TABLE teacher_logins DISABLE ROW LEVEL SECURITY;' in Supabase SQL Editor.";
        } else {
          statusMessage.textContent = "Account could not be created in the database.";
        }
        clearSubmitLoading();
        return;
      }
    } catch (err) {
      console.warn("Supabase connection error:", err);
      statusMessage.textContent = "Could not connect to the database. Please try again.";
      clearSubmitLoading();
      return;
    }

    if (!supabaseSaved) {
      statusMessage.textContent = "Account could not be created in the database.";
      clearSubmitLoading();
      return;
    }

    if (rememberInput.checked) localStorage.setItem(REMEMBER_KEY, id);

    // Save session immediately so user enters workspace directly
    TrevaSession.save({
      username:          id,
      fullname:          fullNameVal,
      department:        departmentVal,
      collegename:       collegeVal,
      teacherid:         createdTeacherRecord ? createdTeacherRecord.teacherid : null,
      isCoordinator:     Boolean(isCoord),
      coordinatingClass: coordClass,
      batchofcoordinator: coordClass,
      password:          password
    });

    statusMessage.textContent = "Teacher account created! Launching your workspace...";
    clearSubmitLoading();

    setTimeout(() => {
      beginLoginTransition();
    }, 450);
  }

  /* =============================================
     Active Session Check — Resume existing login
     ============================================= */

  // Verifies stored session and shows quick resume card if authenticated
  function checkActiveSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const isLogout = urlParams.get('logout') === 'true';

    if (isLogout) {
      if (typeof TrevaSession !== 'undefined' && typeof TrevaSession.clear === 'function') {
        TrevaSession.clear();
      } else {
        try {
          localStorage.removeItem('treva_teacher_session');
          sessionStorage.removeItem('treva_teacher_session');
        } catch(e) {}
      }
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch(e) {}
      showToast("Signed out successfully.");
      return;
    }

    const session = (typeof TrevaSession !== 'undefined') ? TrevaSession.load() : null;
    if (session && (session.fullname || session.username)) {
      const activeCard = $("#activeSessionCard");
      const authForm = $("#authForm");
      const modeTabs = $("#modeTabsWrap");
      const resumeBtn = $("#btnResumeWorkspace");
      const switchBtn = $("#btnSwitchAccount");

      if (activeCard && authForm) {
        const name = session.fullname || session.username;
        const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'SP';
        const role = session.isCoordinator
          ? `Class Coordinator · ${session.coordinatingClass || 'CO31'}`
          : (session.department ? `Faculty · ${session.department}` : 'Subject Faculty');

        const avatarEl = $("#activeSessAvatar");
        const nameEl = $("#activeSessName");
        const roleEl = $("#activeSessRole");

        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl) nameEl.textContent = name;
        if (roleEl) roleEl.textContent = role;

        authForm.style.display = "none";
        if (modeTabs) modeTabs.style.display = "none";
        activeCard.style.display = "flex";

        let autoTimer = null;

        if (resumeBtn) {
          resumeBtn.onclick = () => {
            if (autoTimer) clearTimeout(autoTimer);
            beginLoginTransition();
          };
        }

        if (switchBtn) {
          switchBtn.onclick = () => {
            if (autoTimer) clearTimeout(autoTimer);
            if (typeof TrevaSession !== 'undefined') TrevaSession.clear();
            activeCard.style.display = "none";
            if (modeTabs) modeTabs.style.display = "";
            authForm.style.display = "";
            idInput.value = "";
            passwordInput.value = "";
            setTimeout(() => idInput.focus(), 120);
          };
        }

        showToast(`Welcome back, ${name}! Resuming workspace...`);
        autoTimer = setTimeout(() => {
          if (activeCard.style.display !== "none") {
            beginLoginTransition();
          }
        }, 850);
      }
    }
  }

  /* =============================================
     Credential Lookup — Query teacher record and verify password
     ============================================= */

  // Fetches matching teacher credentials from Supabase tables
  async function getStoredAccount(accountRole, id) {
    try {
      const cleanId = id.trim();
      // 1. Try teacher table by login_username or fullname
      let teacherRow = null;
      try {
        const tRes = await fetch(
          `${SUPABASE_URL}/rest/v1/teacher?or=(login_username.eq.${encodeURIComponent(cleanId)},fullname.eq.${encodeURIComponent(cleanId)},fullname.ilike.*${encodeURIComponent(cleanId)}*)&select=*`,
          { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
        );
        if (tRes.ok) {
          const tRows = await tRes.json();
          if (tRows && tRows.length > 0) teacherRow = tRows[0];
        }
      } catch(e) { console.warn("teacher lookup:", e); }

      // 2. Query teacher_logins
      const lookupName = teacherRow ? teacherRow.fullname : cleanId;
      const queryUrl = `${SUPABASE_URL}/rest/v1/teacher_logins?or=(fullname.eq.${encodeURIComponent(lookupName)},fullname.eq.${encodeURIComponent(cleanId)},fullname.ilike.*${encodeURIComponent(cleanId)}*)&select=*`;
      const res = await fetch(queryUrl, {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const userRow = rows[0];

          if (!teacherRow) {
            try {
              const tRes2 = await fetch(
                `${SUPABASE_URL}/rest/v1/teacher?fullname=eq.${encodeURIComponent(userRow.fullname)}&select=*`,
                { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
              );
              if (tRes2.ok) {
                const tRows2 = await tRes2.json();
                if (tRows2 && tRows2.length > 0) teacherRow = tRows2[0];
              }
            } catch(e) {}
          }

          // Also check class table to verify if this teacher coordinates any class
          let coordClass = userRow.batchofcoordinator || '';
          if (teacherRow && teacherRow.teacherid) {
            try {
              const cRes = await fetch(
                `${SUPABASE_URL}/rest/v1/class?coordinator=eq.${teacherRow.teacherid}&select=classname`,
                { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
              );
              if (cRes.ok) {
                const cRows = await cRes.json();
                if (cRows && cRows.length > 0) {
                  coordClass = cRows[0].classname;
                }
              }
            } catch(e) {}
          }

          return {
            role: "teacher",
            id: userRow.fullname,
            fullname: userRow.fullname,
            department: userRow.department || (teacherRow && teacherRow.department) || '',
            collegename: userRow.collegename || (teacherRow && teacherRow.collegename) || '',
            passwordHash: await sha256(userRow.password),
            rawPassword: userRow.password,
            isCoordinator: userRow.isclasscoordinator === 1 || Boolean(coordClass),
            coordinatingClass: coordClass,
            teacherid: teacherRow ? teacherRow.teacherid : null,
            teacherRow
          };
        }
      }
    } catch (err) {
      console.warn("Supabase query error:", err);
    }

    return null;
  }

  /* =============================================
     Login Transition — Animated redirect to portal workspace
     ============================================= */

  // Triggers fly-away scene transition and redirects to Teacher Portal
  function beginLoginTransition() {
    setSubmitLoading(true, "Opening Workspace...");
    statusMessage.textContent = "";

    setTimeout(() => {
      scene.classList.add("fly-away");
      // Redirect to the real Teacher Portal after fly-away animation
      setTimeout(() => {
        window.location.href = "../Main_Page/index.html";
      }, 650);
    }, 180);
  }

  function validate() {
    clearErrors();
    let valid = true;

    const id = idInput.value.trim();
    const password = passwordInput.value;

    if (mode === "create") {
      if (!collegeInput.value) {
        collegeError.textContent = "Select your college.";
        collegeInput.classList.add("invalid");
        valid = false;
      }
      if (!departmentInput.value) {
        departmentError.textContent = "Select department.";
        departmentInput.classList.add("invalid");
        valid = false;
      }
      if (!nameInput.value) {
        nameError.textContent = "Select your name.";
        nameInput.classList.add("invalid");
        valid = false;
      }
      if (!id) {
        idError.textContent = "Enter your username.";
        idInput.classList.add("invalid");
        valid = false;
      }
      if (!password) {
        passwordError.textContent = "Enter your password.";
        passwordInput.classList.add("invalid");
        valid = false;
      } else if (password.length < 8) {
        passwordError.textContent = "Use at least 8 characters.";
        passwordInput.classList.add("invalid");
        valid = false;
      }
      if (!confirmPasswordInput.value) {
        confirmPasswordError.textContent = "Confirm your password.";
        confirmPasswordInput.classList.add("invalid");
        valid = false;
      } else if (confirmPasswordInput.value !== password) {
        confirmPasswordError.textContent = "Passwords do not match.";
        confirmPasswordInput.classList.add("invalid");
        valid = false;
      }
      if (isCoordinatorInput.checked && (!coordinatorClassInput || !coordinatorClassInput.value)) {
        coordinatorClassError.textContent = "Select your coordinating class.";
        if (coordinatorClassInput) coordinatorClassInput.classList.add("invalid");
        valid = false;
      }
    } else {
      if (!id) {
        idError.textContent = "Enter your username.";
        idInput.classList.add("invalid");
        valid = false;
      }
      if (!password) {
        passwordError.textContent = "Enter your password.";
        passwordInput.classList.add("invalid");
        valid = false;
      }
    }

    return valid;
  }

  function clearErrors() {
    [collegeInput, departmentInput, nameInput, idInput, passwordInput, confirmPasswordInput, coordinatorClassInput].forEach(input => {
      if (input) input.classList.remove("invalid");
    });
    [collegeError, departmentError, nameError, idError, passwordError, confirmPasswordError, coordinatorClassError].forEach(err => {
      if (err) err.textContent = "";
    });
  }

  function clearFieldError(input, error) {
    if (input) input.classList.remove("invalid");
    if (error) error.textContent = "";
  }

  function togglePassword() {
    const visible = passwordInput.type === "text";
    passwordInput.type = visible ? "password" : "text";
    passwordToggle.textContent = visible ? "Show" : "Hide";
  }

  function toggleConfirmPassword() {
    const visible = confirmPasswordInput.type === "text";
    confirmPasswordInput.type = visible ? "password" : "text";
    confirmPasswordToggle.textContent = visible ? "Show" : "Hide";
  }

  function toggleTheme() {
    const isDay = document.body.classList.toggle("day-mode");
    themeToggle.setAttribute("aria-pressed", String(isDay));
    localStorage.setItem(THEME_KEY, isDay ? "day" : "night");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", isDay ? "#f8fafc" : "#090d16");
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "day") {
      document.body.classList.add("day-mode");
      themeToggle.setAttribute("aria-pressed", "true");
    }
  }

  function loadRememberedId() {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) idInput.value = remembered;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* =============================================
     SHA-256 — Cryptographic password hashing
     ============================================= */

  // Computes SHA-256 hexadecimal hash string for credential verification
  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
})();
