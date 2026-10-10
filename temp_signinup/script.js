(() => {
  "use strict";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  // Scene & DOM Elements
  const scene = $("#loginScene");
  const form = $("#authForm");
  const dashboard = $("#dashboard");
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
  const batchStartYear = $("#batchStartYear");
  const batchEndYear = $("#batchEndYear");
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
  const batchYearError = $("#batchYearError");

  let mode = "login";
  let toastTimer;

  const DEMO_ACCOUNTS = {
    teacher: {
      id: "teacher123",
      password: "teacherpassword"
    }
  };

  // Supabase config — sourced from shared supabase.js (loaded via index1.html)
  // SUPABASE_URL and SUPABASE_KEY are declared globally in supabase.js

  const REMEMBER_KEY = "auraBytesRememberedTeacherId";
  const THEME_KEY = "auraBytesTheme";

  init();

  function init() {
    loadTheme();
    loadRememberedId();
    populateBatchYears();
    bindEvents();
    initCanvasAnimation();
    initCursorGlow();
  }

  // ---------------- Interactive Canvas Particle Network ----------------

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

  // ---------------- Interactive Cursor Glow Spotlight ----------------

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

  // ---------------- Batch Year Options ----------------

  function populateBatchYears() {
    batchStartYear.innerHTML = '<option value="" disabled selected>Select year</option>';
    const currentYear = new Date().getFullYear();
    for (let year = 2020; year <= currentYear + 5; year++) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      batchStartYear.appendChild(option);
    }
  }

  // ---------------- Event Listeners ----------------

  function bindEvents() {
    themeToggle.addEventListener("click", toggleTheme);
    passwordToggle.addEventListener("click", togglePassword);
    confirmPasswordToggle.addEventListener("click", toggleConfirmPassword);
    switchMode.addEventListener("click", toggleAuthMode);

    if (loginTab) loginTab.addEventListener("click", () => setAuthMode("login"));
    if (createTab) createTab.addEventListener("click", () => setAuthMode("create"));

    form.addEventListener("submit", handleSubmit);
    $("#dashboardLogout").addEventListener("click", resetToLogin);

    $("#privacyLink").addEventListener("click", e => {
      e.preventDefault();
      showToast("Privacy policy integrated for Treva Forms Ecosystem.");
    });

    isCoordinatorInput.addEventListener("change", toggleBatchYear);
    batchStartYear.addEventListener("change", () => {
      if (batchStartYear.value) {
        batchEndYear.value = Number(batchStartYear.value) + 1;
        clearFieldError(batchStartYear, batchYearError);
      }
    });

    idInput.addEventListener("input", () => clearFieldError(idInput, idError));
    passwordInput.addEventListener("input", () => clearFieldError(passwordInput, passwordError));
    collegeInput.addEventListener("change", () => clearFieldError(collegeInput, collegeError));
    departmentInput.addEventListener("change", () => clearFieldError(departmentInput, departmentError));
    nameInput.addEventListener("input", () => clearFieldError(nameInput, nameError));
    confirmPasswordInput.addEventListener("input", () => clearFieldError(confirmPasswordInput, confirmPasswordError));
  }

  function toggleBatchYear() {
    if (isCoordinatorInput.checked) {
      batchYearContainer.style.display = "block";
      coordinatorLabel.classList.add("selected");
    } else {
      batchYearContainer.style.display = "none";
      batchStartYear.value = "";
      batchEndYear.value = "";
      coordinatorLabel.classList.remove("selected");
      clearFieldError(batchStartYear, batchYearError);
    }
  }

  function toggleAuthMode() {
    setAuthMode(mode === "login" ? "create" : "login");
  }

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
      toggleBatchYear();
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

  // ---------------- Submission & Supabase Auth ----------------

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    submitButton.disabled = true;
    statusMessage.textContent = "";

    await wait(350);

    const id = idInput.value.trim();
    const password = passwordInput.value;

    if (mode === "create") {
      await createPrototypeAccount(id, password);
      submitButton.disabled = false;
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
      submitButton.disabled = false;
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
      username:    id,
      fullname:    tr.fullname  || id,
      department:  tr.department  || account.department  || '',
      collegename: tr.collegename || account.college     || '',
      teacherid:   tr.teacherid  || null
    });

    beginLoginTransition();
  }

  async function createPrototypeAccount(id, password) {
    const key = `auraBytesAccount_teacher_${id.toLowerCase()}`;
    const exists = localStorage.getItem(key);

    if (exists) {
      idError.textContent = "An account with this username already exists.";
      idInput.classList.add("invalid");
      submitButton.disabled = false;
      return;
    }

    const collegeVal = collegeInput.options[collegeInput.selectedIndex]?.text || collegeInput.value;
    const departmentVal = departmentInput.options[departmentInput.selectedIndex]?.text || departmentInput.value;
    const fullNameVal = nameInput.value.trim() || id;

    const account = {
      role: "teacher",
      college: collegeVal,
      department: departmentVal,
      name: fullNameVal,
      id,
      passwordHash: await sha256(password),
      isCoordinator: isCoordinatorInput.checked,
      batchStartYear: batchStartYear.value || null,
      batchEndYear: batchEndYear.value || null,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(account));
    if (rememberInput.checked) {
      localStorage.setItem(REMEMBER_KEY, id);
    }

    let supabaseSaved = false;
    try {
      // 1. Insert into teacher_logins
      const loginPayload = {
        collegename: collegeVal,
        department: departmentVal,
        fullname: fullNameVal,
        password: password,
        isclasscoordinator: isCoordinatorInput.checked ? 1 : 0,
        batchofcoordinator: batchStartYear.value ? String(batchStartYear.value).slice(0, 6) : ""
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

        // 2. Also insert into teacher master table (avoids duplicate if exists)
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/teacher`, {
            method: "POST",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal,resolution=ignore-duplicates"
            },
            body: JSON.stringify({
              fullname: fullNameVal,
              department: departmentVal,
              collegename: collegeVal,
              login_username: fullNameVal
            })
          });
        } catch(e) { console.warn("teacher table insert:", e); }

      } else {
        const errorDetail = await res.json().catch(() => ({}));
        console.warn("Supabase response:", res.status, errorDetail);
        if (res.status === 401) {
          statusMessage.textContent = "Supabase 401 RLS Error: Run 'ALTER TABLE teacher_logins DISABLE ROW LEVEL SECURITY;' in Supabase SQL Editor.";
          submitButton.disabled = false;
          return;
        }
      }
    } catch (err) {
      console.warn("Supabase connection error:", err);
    }

    statusMessage.textContent = supabaseSaved
      ? "Teacher account created & synced to Supabase! Please sign in."
      : "Teacher account created! (Saved locally)";

    submitButton.disabled = false;

    setTimeout(() => {
      setAuthMode("login");
      passwordInput.value = "";
      statusMessage.textContent = supabaseSaved
        ? "Account created in Supabase. Please sign in."
        : "Account created. Please sign in.";
    }, 650);
  }

  async function getStoredAccount(accountRole, id) {
    try {
      const queryUrl = `${SUPABASE_URL}/rest/v1/teacher_logins?fullname=eq.${encodeURIComponent(id)}&select=*`;
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

          // Also fetch the teacher master record to get teacherid
          let teacherRow = null;
          try {
            const tRes = await fetch(
              `${SUPABASE_URL}/rest/v1/teacher?login_username=eq.${encodeURIComponent(id)}&select=*`,
              { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
            );
            if (tRes.ok) {
              const tRows = await tRes.json();
              if (tRows && tRows.length > 0) teacherRow = tRows[0];
            }
          } catch(e) { console.warn("teacher lookup:", e); }

          return {
            role: "teacher",
            id: userRow.fullname,
            passwordHash: await sha256(userRow.password),
            rawPassword: userRow.password,
            teacherRow            // may be null if not yet in teacher table
          };
        }
      }
    } catch (err) {
      console.warn("Supabase query error:", err);
    }

    const key = `auraBytesAccount_teacher_${id.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);

    const demo = DEMO_ACCOUNTS.teacher;
    if (demo && demo.id.toLowerCase() === id.toLowerCase()) {
      return {
        role: "teacher",
        id: demo.id,
        passwordHash: await sha256(demo.password)
      };
    }

    return null;
  }

  function beginLoginTransition() {
    submitButton.disabled = true;
    submitText.textContent = "Opening Portal...";
    statusMessage.textContent = "";

    setTimeout(() => {
      scene.classList.add("fly-away");
      // Redirect to the real Teacher Portal after fly-away animation
      setTimeout(() => {
        window.location.href = "../Main_Page/index.html";
      }, 650);
    }, 180);
  }

  function resetToLogin() {
    dashboard.classList.remove("visible");
    dashboard.setAttribute("aria-hidden", "true");

    scene.style.display = "";
    scene.classList.remove("fly-away");
    form.reset();
    isCoordinatorInput.checked = false;
    toggleBatchYear();
    submitButton.disabled = false;
    submitText.textContent = mode === "login" ? "Sign In" : "Create Account";
    loadRememberedId();

    setTimeout(() => idInput.focus(), 500);
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
      if (!nameInput.value.trim()) {
        nameError.textContent = "Enter your full name.";
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
      if (isCoordinatorInput.checked && !batchStartYear.value) {
        batchYearError.textContent = "Select starting year.";
        batchStartYear.classList.add("invalid");
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
    [collegeInput, departmentInput, nameInput, idInput, passwordInput, confirmPasswordInput, batchStartYear].forEach(input => {
      if (input) input.classList.remove("invalid");
    });
    [collegeError, departmentError, nameError, idError, passwordError, confirmPasswordError, batchYearError].forEach(err => {
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

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
})();
