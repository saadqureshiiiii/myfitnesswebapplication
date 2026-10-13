/**
 * ============================================================================
 * SAAD LIFE TRACKER — MASTER HARDENED JAVASCRIPT ENGINE
 * Full-featured, Local-First, Zero-Dependencies, Strict Client-Side Security
 * ============================================================================
 */

// Master Storage Database Keys
const DB_KEY = "SAAD_LIFE_TRACKER_DB_V2";
const THEME_KEY = "SAAD_THEME_PREF";
const PIN_KEY = "SAAD_VAULT_PIN_HASH";
const VAULT_NOTES_KEY = "SAAD_VAULT_NOTES_CIPHER";

// Initial Blueprint State
const DEFAULT_DATA = {
    config: {
        city: "Karachi",
        country: "Pakistan",
        method: "1",
        calorieGoal: 2200,
        proteinGoal: 140,
        streak: 0,
        lastStreakDate: ""
    },
    qadha: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
    assignments: [],
    learning: [
        { id: "learn-1", title: "Clean Code Architecture", current: 85, total: 240 }
    ],
    habits: [
        { id: "habit-1", text: "Morning Routine & Sun Exposure", completed: false },
        { id: "habit-2", text: "Attend All University Classes", completed: false },
        { id: "habit-3", text: "No Distractions / Social Media before 12 PM", completed: false },
        { id: "habit-4", text: "Nightly Planning & Accountability Review", completed: false }
    ],
    days: {}
};

// ============================================================================
// 1. SECURITY & SANITIZATION UTILITIES (XSS & PROTOYPE POLLUTION IMMUNITY)
// ============================================================================

/**
 * Escapes unsafe HTML characters to prevent XSS injection.
 * @param {unknown} val
 * @returns {string}
 */
function escapeHTML(val) {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Bounds text to safe length limit (max 120 chars).
 * @param {unknown} text
 * @param {number} max
 * @returns {string}
 */
function boundString(text, max = 120) {
    if (typeof text !== 'string') return '';
    return text.trim().slice(0, max);
}

/**
 * Bounds positive numbers within defined min & max.
 * @param {unknown} val
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function boundNumber(val, min = 0, max = 100000, fallback = 0) {
    const num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(max, Math.max(min, num));
}

/**
 * Strips prototype pollution keys (__proto__, constructor, prototype) recursively.
 * @param {unknown} obj
 * @param {number} depth
 * @returns {unknown}
 */
function sanitizeAgainstPrototypePollution(obj, depth = 0) {
    if (depth > 25) return null; // Prevent circular or deeply nested attacks
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeAgainstPrototypePollution(item, depth + 1));
    }

    const clean = Object.create(null);
    for (const key of Object.keys(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue; // Strip pollution key
        }
        clean[key] = sanitizeAgainstPrototypePollution(obj[key], depth + 1);
    }
    return clean;
}

/**
 * Validates and normalizes imported store against strict schema.
 * @param {unknown} raw
 * @returns {typeof DEFAULT_DATA | null}
 */
function validateAndNormalizeStore(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    // Purge prototype pollution first
    const clean = sanitizeAgainstPrototypePollution(raw);
    if (!clean || typeof clean !== 'object') return null;

    const out = JSON.parse(JSON.stringify(DEFAULT_DATA));

    // Validate Config
    if (clean.config && typeof clean.config === 'object') {
        out.config.city = boundString(clean.config.city, 120) || "Karachi";
        out.config.country = boundString(clean.config.country, 120) || "Pakistan";
        out.config.method = ["1", "2", "3", "4", "5"].includes(String(clean.config.method))
            ? String(clean.config.method) : "1";
        out.config.calorieGoal = boundNumber(clean.config.calorieGoal, 500, 10000, 2200);
        out.config.proteinGoal = boundNumber(clean.config.proteinGoal, 10, 500, 140);
        out.config.streak = boundNumber(clean.config.streak, 0, 50000, 0);
        out.config.lastStreakDate = boundString(clean.config.lastStreakDate, 30);
    }

    // Validate Qadha
    if (clean.qadha && typeof clean.qadha === 'object') {
        const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        prayers.forEach(p => {
            out.qadha[p] = boundNumber(clean.qadha[p], 0, 50000, 0);
        });
    }

    // Validate Assignments
    if (Array.isArray(clean.assignments)) {
        out.assignments = clean.assignments
            .filter(a => a && typeof a === 'object')
            .map(a => ({
                id: boundString(String(a.id || Date.now()), 50),
                title: boundString(String(a.title || 'Assignment'), 120),
                course: boundString(String(a.course || 'General'), 120),
                dueDate: isValidDateString(a.dueDate) ? a.dueDate : new Date().toISOString(),
                priority: ['High', 'Medium', 'Low'].includes(a.priority) ? a.priority : 'Medium'
            }))
            .slice(0, 200);
    }

    // Validate Learning
    if (Array.isArray(clean.learning)) {
        out.learning = clean.learning
            .filter(b => b && typeof b === 'object')
            .map((b, idx) => ({
                id: boundString(String(b.id || idx), 50),
                title: boundString(String(b.title || 'Book'), 120),
                current: boundNumber(b.current, 0, 50000, 0),
                total: boundNumber(b.total, 1, 50000, 100)
            }))
            .slice(0, 100);
    }

    // Validate Habits
    if (Array.isArray(clean.habits)) {
        out.habits = clean.habits
            .filter(h => h && typeof h === 'object')
            .map((h, idx) => ({
                id: boundString(String(h.id || idx), 50),
                text: boundString(String(h.text || 'Habit'), 120),
                completed: Boolean(h.completed)
            }))
            .slice(0, 100);
    }

    // Validate Days
    if (clean.days && typeof clean.days === 'object') {
        out.days = {};
        for (const [dateKey, dayData] of Object.entries(clean.days)) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && dayData && typeof dayData === 'object') {
                const day = {
                    prayers: { Fajr: null, Dhuhr: null, Asr: null, Maghrib: null, Isha: null },
                    waterGlasses: boundNumber(dayData.waterGlasses, 0, 32, 0),
                    meals: [],
                    gymSets: []
                };

                if (dayData.prayers && typeof dayData.prayers === 'object') {
                    for (const p of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
                        if (['on-time', 'late', 'missed', null].includes(dayData.prayers[p])) {
                            day.prayers[p] = dayData.prayers[p];
                        }
                    }
                }

                if (Array.isArray(dayData.meals)) {
                    day.meals = dayData.meals
                        .filter(m => m && typeof m === 'object')
                        .map(m => ({
                            id: boundString(String(m.id || Date.now()), 50),
                            name: boundString(String(m.name || 'Meal'), 120),
                            type: ['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(m.type) ? m.type : 'Snack',
                            cals: boundNumber(m.cals, 0, 10000, 0),
                            protein: boundNumber(m.protein, 0, 1000, 0)
                        }))
                        .slice(0, 50);
                }

                if (Array.isArray(dayData.gymSets)) {
                    day.gymSets = dayData.gymSets
                        .filter(s => s && typeof s === 'object')
                        .map(s => ({
                            id: boundString(String(s.id || Date.now()), 50),
                            exercise: boundString(String(s.exercise || 'Lift'), 120),
                            weight: boundNumber(s.weight, 0, 1000, 0),
                            reps: boundNumber(s.reps, 1, 500, 1)
                        }))
                        .slice(0, 100);
                }

                out.days[dateKey] = day;
            }
        }
    }

    return out;
}

function isValidDateString(str) {
    if (!str || typeof str !== 'string') return false;
    const time = new Date(str).getTime();
    return !Number.isNaN(time);
}

// ============================================================================
// 2. DATA STORE & STORAGE ACCESSORS
// ============================================================================

function getStore() {
    try {
        const raw = localStorage.getItem(DB_KEY);
        if (!raw) {
            const cleanDefault = JSON.parse(JSON.stringify(DEFAULT_DATA));
            localStorage.setItem(DB_KEY, JSON.stringify(cleanDefault));
            return cleanDefault;
        }
        const parsed = JSON.parse(raw);
        const validated = validateAndNormalizeStore(parsed);
        if (!validated) {
            console.warn("Storage structure invalid, resetting safely.");
            localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DATA));
            return DEFAULT_DATA;
        }
        return validated;
    } catch (e) {
        console.error("Local storage read error:", e);
        return DEFAULT_DATA;
    }
}

function saveStore(store) {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(store));
        refreshAllViews();
    } catch (e) {
        console.error("Local storage save error:", e);
        alert("Warning: Local storage quota exceeded or storage disabled.");
    }
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function getTodayData(store) {
    const todayKey = getTodayKey();
    if (!store.days[todayKey]) {
        store.days[todayKey] = {
            prayers: { Fajr: null, Dhuhr: null, Asr: null, Maghrib: null, Isha: null },
            waterGlasses: 0,
            meals: [],
            gymSets: []
        };
    }
    return store.days[todayKey];
}

// ============================================================================
// 3. WEB CRYPTO API VAULT ENGINE (AES-GCM & PBKDF2)
// ============================================================================

/**
 * Derives a cryptographic AES-GCM key from user PIN and salt.
 * @param {string} pin
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKeyFromPin(pin, salt) {
    const enc = new TextEncoder();
    const pinBuffer = enc.encode(pin);

    const baseKey = await crypto.subtle.importKey(
        "raw",
        pinBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Computes a verification hash for the 4-digit PIN using SHA-256 with salt.
 * @param {string} pin
 * @param {Uint8Array} salt
 * @returns {Promise<string>}
 */
async function hashPinWithSalt(pin, salt) {
    const enc = new TextEncoder();
    const data = new Uint8Array(pin.length + salt.length);
    data.set(enc.encode(pin));
    data.set(salt, pin.length);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Encrypts arbitrary text using AES-GCM.
 * @param {string} plainText
 * @param {string} pin
 * @returns {Promise<string>}
 */
async function encryptWithPin(plainText, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyFromPin(pin, salt);
    const enc = new TextEncoder();

    const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(plainText)
    );

    const payload = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(cipherBuffer))
    };
    return JSON.stringify(payload);
}

/**
 * Decrypts AES-GCM ciphertext string with PIN.
 * @param {string} encryptedJson
 * @param {string} pin
 * @returns {Promise<string>}
 */
async function decryptWithPin(encryptedJson, pin) {
    const payload = JSON.parse(encryptedJson);
    const salt = new Uint8Array(payload.salt);
    const iv = new Uint8Array(payload.iv);
    const ciphertext = new Uint8Array(payload.ciphertext);

    const key = await deriveKeyFromPin(pin, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
}

// App Security State
let activeVaultPin = null;
let isAppLocked = false;
let enteredPinDigits = "";

// ============================================================================
// 4. THEME CONTROLLER (MINIMALIST WHITE / SLEEK DARK)
// ============================================================================

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

    const isDark = theme === "dark";
    const icon = isDark ? "☀️" : "🌙";
    const label = isDark ? "Switch to Light" : "Switch to Dark";

    document.querySelectorAll(".theme-icon-slot").forEach(el => {
        el.textContent = icon;
    });

    const txtTheme = document.getElementById("txt-theme-mode");
    if (txtTheme) txtTheme.textContent = label;
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
}

// ============================================================================
// 5. RESPONSIVE SIDEBAR & NAVIGATION SYSTEM
// ============================================================================

const TAB_METADATA = {
    'tab-dashboard': { title: '⚡ Master Dashboard', subtitle: 'Daily discipline index and habit momentum' },
    'tab-prayers': { title: '🕌 5 Daily Prayers', subtitle: 'Aadhan prayer times and persistent Qadha tracking' },
    'tab-academics': { title: '🎓 University Tasks', subtitle: 'Assignments, coursework and strict exam deadlines' },
    'tab-learning': { title: '📚 Learning & Focus', subtitle: 'Deep work Pomodoro studio and book reading log' },
    'tab-gym': { title: '🏋️ Gym & Overload', subtitle: 'Workout splits, progressive overload memory and rest stopwatch' },
    'tab-nutrition': { title: '🥗 Nutrition & Water', subtitle: 'Daily calorie budget, protein targets and 8-glass hydration' },
    'tab-tasks': { title: '📋 Daily Habits', subtitle: 'Checklist of daily non-negotiables and discipline items' },
    'tab-vault': { title: '🔐 Private Vault', subtitle: 'Native Web Crypto AES-GCM encrypted notes and reflections' },
    'tab-backup': { title: '💾 Backup & Privacy', subtitle: 'Local storage export, schema validation and data purge' }
};

function switchTab(tabId) {
    if (!TAB_METADATA[tabId]) return;

    // Update active nav button
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.toggle('active-panel', panel.id === tabId);
    });

    // Update topbar header text
    const meta = TAB_METADATA[tabId];
    const titleEl = document.getElementById('page-active-title');
    const descEl = document.getElementById('page-active-desc');
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.subtitle;

    // Close mobile sidebar drawer if open
    closeMobileSidebar();
}

function openMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('sidebar-open');
    if (backdrop) backdrop.classList.add('active');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('sidebar-open');
    if (backdrop) backdrop.classList.remove('active');
}

// ============================================================================
// 6. AUDIO SYNTHESIZER (NATIVE BROWSER CHIMES)
// ============================================================================

function playBeep(freq = 880, duration = 0.2) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Audio interaction restrictions
    }
}

// ============================================================================
// 7. PRAYERS & ALADHAN API (STRICT HTTPS)
// ============================================================================

const PRAYERS = [
    { key: 'Fajr', ar: 'الفجر' },
    { key: 'Dhuhr', ar: 'الظهر' },
    { key: 'Asr', ar: 'العصر' },
    { key: 'Maghrib', ar: 'المغرب' },
    { key: 'Isha', ar: 'العشاء' }
];

let cachedTimings = { Fajr: "05:15", Dhuhr: "12:15", Asr: "15:45", Maghrib: "18:05", Isha: "19:25" };

async function fetchPrayerTimes() {
    const store = getStore();
    const city = encodeURIComponent(store.config.city || "Karachi");
    const country = encodeURIComponent(store.config.country || "Pakistan");
    const method = encodeURIComponent(store.config.method || "1");

    // Strictly enforce HTTPS
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=${method}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP error " + res.status);
        const json = await res.json();
        if (json.code === 200 && json.data && json.data.timings) {
            cachedTimings = json.data.timings;
            if (json.data.date && json.data.date.hijri) {
                const h = json.data.date.hijri;
                const txtHijri = document.getElementById('txt-hijri');
                if (txtHijri) {
                    txtHijri.textContent = `${h.day} ${h.month.en} ${h.year} AH`;
                }
            }
        }
    } catch (e) {
        console.warn("Prayer times fetch offline:", e);
        const txtHijri = document.getElementById('txt-hijri');
        if (txtHijri) txtHijri.textContent = "Offline Mode";
    }

    renderPrayers();
    updatePrayerCountdown();
}

function format12(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return "--:--";
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return "--:--";
    const [h, m] = parts;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function renderPrayers() {
    const store = getStore();
    const today = getTodayData(store);
    const container = document.getElementById('prayer-grid-container');
    if (!container) return;

    container.textContent = ''; // Safe wipe

    PRAYERS.forEach(({ key, ar }) => {
        const status = today.prayers[key];
        const card = document.createElement('div');
        card.className = `prayer-card ${status ? 'completed' : ''}`;

        const head = document.createElement('div');
        head.className = 'prayer-card-header';

        const nameEl = document.createElement('strong');
        nameEl.className = 'prayer-name';
        nameEl.textContent = key;

        const arEl = document.createElement('span');
        arEl.className = 'prayer-arabic';
        arEl.textContent = ar;

        head.appendChild(nameEl);
        head.appendChild(arEl);

        const timeEl = document.createElement('div');
        timeEl.className = 'time';
        timeEl.textContent = format12(cachedTimings[key]);

        const btnsBox = document.createElement('div');
        btnsBox.className = 'prayer-btns';

        const btnOntime = document.createElement('button');
        btnOntime.className = `p-btn ${status === 'on-time' ? 'active-ontime' : ''}`;
        btnOntime.textContent = '✓ On-Time';
        btnOntime.addEventListener('click', () => togglePrayer(key, 'on-time'));

        const btnLate = document.createElement('button');
        btnLate.className = `p-btn ${status === 'late' ? 'active-late' : ''}`;
        btnLate.textContent = '⏱️ Late';
        btnLate.addEventListener('click', () => togglePrayer(key, 'late'));

        const btnMissed = document.createElement('button');
        btnMissed.className = `p-btn ${status === 'missed' ? 'active-missed' : ''}`;
        btnMissed.textContent = '✗ Missed';
        btnMissed.addEventListener('click', () => togglePrayer(key, 'missed'));

        btnsBox.appendChild(btnOntime);
        btnsBox.appendChild(btnLate);
        btnsBox.appendChild(btnMissed);

        card.appendChild(head);
        card.appendChild(timeEl);
        card.appendChild(btnsBox);

        container.appendChild(card);
    });

    // Render Persistent Qadha Counters
    const qadhaContainer = document.getElementById('qadha-counters-container');
    if (qadhaContainer) {
        qadhaContainer.textContent = '';
        PRAYERS.forEach(({ key }) => {
            const count = store.qadha[key] || 0;
            const box = document.createElement('div');
            box.className = 'qadha-box';

            const title = document.createElement('div');
            title.className = 'qadha-box-title';
            title.textContent = key;

            const val = document.createElement('div');
            val.className = 'qadha-box-val';
            val.textContent = String(count);

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'center';
            row.style.gap = '6px';

            const btnMinus = document.createElement('button');
            btnMinus.className = 'btn btn-secondary btn-sm';
            btnMinus.textContent = '-';
            btnMinus.addEventListener('click', () => changeQadha(key, -1));

            const btnPlus = document.createElement('button');
            btnPlus.className = 'btn btn-secondary btn-sm';
            btnPlus.textContent = '+';
            btnPlus.addEventListener('click', () => changeQadha(key, 1));

            row.appendChild(btnMinus);
            row.appendChild(btnPlus);

            box.appendChild(title);
            box.appendChild(val);
            box.appendChild(row);

            qadhaContainer.appendChild(box);
        });
    }
}

function togglePrayer(prayerKey, status) {
    const store = getStore();
    const today = getTodayData(store);

    if (today.prayers[prayerKey] === status) {
        today.prayers[prayerKey] = null;
    } else {
        today.prayers[prayerKey] = status;
        if (status === 'missed') {
            store.qadha[prayerKey] = (store.qadha[prayerKey] || 0) + 1;
        }
        playBeep(520, 0.15);
    }
    saveStore(store);
}

function changeQadha(key, delta) {
    const store = getStore();
    store.qadha[key] = Math.max(0, (store.qadha[key] || 0) + delta);
    saveStore(store);
}

function updatePrayerCountdown() {
    const now = new Date();
    let nextKey = null;
    let nextDate = null;

    for (const { key } of PRAYERS) {
        const timeStr = cachedTimings[key] || "00:00";
        const parts = timeStr.split(':').map(Number);
        if (parts.length >= 2) {
            const d = new Date();
            d.setHours(parts[0], parts[1], 0, 0);
            if (d > now) {
                nextKey = key;
                nextDate = d;
                break;
            }
        }
    }

    const banner = document.getElementById('dash-next-prayer-banner');
    if (banner) {
        if (nextKey && nextDate) {
            const diffMs = nextDate.getTime() - now.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const hrs = Math.floor(diffMin / 60);
            const mins = diffMin % 60;
            banner.textContent = `Upcoming: ${nextKey} at ${format12(cachedTimings[nextKey])} (in ${hrs}h ${mins}m)`;
        } else {
            banner.textContent = `All today's prayers completed/passed. Next: Fajr tomorrow.`;
        }
    }
}

// ============================================================================
// 8. UNIVERSITY ASSIGNMENTS (SAFE DOM MANIPULATION)
// ============================================================================

function renderAssignments() {
    const store = getStore();
    const list = document.getElementById('assignment-list-container');
    const summaryBadge = document.getElementById('assign-summary-count');
    const dashCount = document.getElementById('dash-assign-count');
    const dashUrgent = document.getElementById('dash-urgent-task');
    const navBadge = document.getElementById('nav-badge-assign');

    if (!list) return;
    list.textContent = ''; // Safe wipe

    const count = store.assignments.length;
    if (summaryBadge) summaryBadge.textContent = `${count} Tasks`;
    if (dashCount) dashCount.textContent = `${count} Active`;
    if (navBadge) navBadge.textContent = String(count);

    if (count === 0) {
        const empty = document.createElement('p');
        empty.style.color = 'var(--text-dim)';
        empty.style.fontSize = '0.88rem';
        empty.style.padding = '10px 0';
        empty.textContent = 'No pending assignments. You are all caught up!';
        list.appendChild(empty);
        if (dashUrgent) dashUrgent.textContent = 'No upcoming deadlines pending!';
        return;
    }

    // Sort by due date
    const sorted = [...store.assignments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (dashUrgent && sorted[0]) {
        dashUrgent.textContent = `Nearest: ${sorted[0].title} (${sorted[0].course})`;
    }

    sorted.forEach(item => {
        const due = new Date(item.dueDate);
        const diffHours = (due.getTime() - Date.now()) / (1000 * 60 * 60);

        let badgeClass = "badge-safe";
        let urgencyText = `${Math.ceil(diffHours / 24)}d left`;

        if (diffHours < 0) {
            badgeClass = "badge-urgent";
            urgencyText = "Overdue!";
        } else if (diffHours < 24) {
            badgeClass = "badge-urgent";
            urgencyText = `${Math.round(diffHours)}h left`;
        } else if (diffHours < 48) {
            badgeClass = "badge-medium";
        }

        const div = document.createElement('div');
        div.className = 'assignment-item';

        const infoCol = document.createElement('div');
        const titleEl = document.createElement('div');
        titleEl.style.fontWeight = '700';
        titleEl.style.fontSize = '0.95rem';
        titleEl.textContent = item.title; // Safe textContent (XSS immunity)

        const subEl = document.createElement('div');
        subEl.style.fontSize = '0.8rem';
        subEl.style.color = 'var(--text-muted)';
        const dateStr = due.toLocaleDateString();
        const timeStr = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        subEl.textContent = `${item.course} • Due: ${dateStr} ${timeStr}`;

        infoCol.appendChild(titleEl);
        infoCol.appendChild(subEl);

        const actionsCol = document.createElement('div');
        actionsCol.style.display = 'flex';
        actionsCol.style.alignItems = 'center';
        actionsCol.style.gap = '10px';

        const badge = document.createElement('span');
        badge.className = `badge ${badgeClass}`;
        badge.textContent = urgencyText;

        const btnDone = document.createElement('button');
        btnDone.className = 'btn btn-emerald btn-sm';
        btnDone.textContent = '✓ Done';
        btnDone.addEventListener('click', () => removeAssignment(item.id));

        actionsCol.appendChild(badge);
        actionsCol.appendChild(btnDone);

        div.appendChild(infoCol);
        div.appendChild(actionsCol);
        list.appendChild(div);
    });
}

function addAssignment() {
    const titleInput = document.getElementById('in-assign-title');
    const courseInput = document.getElementById('in-assign-course');
    const dateInput = document.getElementById('in-assign-date');
    const prioInput = document.getElementById('in-assign-priority');

    const title = boundString(titleInput.value, 120);
    const course = boundString(courseInput.value, 120);
    const dueDate = dateInput.value;
    const priority = prioInput.value;

    if (!title || !dueDate) {
        alert("Please enter both an assignment title and due date.");
        return;
    }

    if (!isValidDateString(dueDate)) {
        alert("Please select a valid deadline date and time.");
        return;
    }

    const store = getStore();
    store.assignments.push({
        id: "assign-" + Date.now().toString(36),
        title,
        course: course || "General",
        dueDate,
        priority: ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium'
    });
    saveStore(store);

    titleInput.value = '';
    courseInput.value = '';
    dateInput.value = '';
}

function removeAssignment(id) {
    const store = getStore();
    store.assignments = store.assignments.filter(a => a.id !== id);
    playBeep(700, 0.15);
    saveStore(store);
}

// ============================================================================
// 9. POMODORO & SELF-LEARNING
// ============================================================================

let pomoSeconds = 25 * 60;
let pomoInterval = null;

function renderPomodoro() {
    const mins = Math.floor(pomoSeconds / 60).toString().padStart(2, '0');
    const secs = (pomoSeconds % 60).toString().padStart(2, '0');
    const display = document.getElementById('pomo-display');
    if (display) display.textContent = `${mins}:${secs}`;
}

function startPomodoro() {
    if (pomoInterval) return;
    pomoInterval = setInterval(() => {
        if (pomoSeconds > 0) {
            pomoSeconds--;
            renderPomodoro();
        } else {
            clearInterval(pomoInterval);
            pomoInterval = null;
            playBeep(950, 0.5);
            alert("Focus session complete! Take a well-deserved 5-minute break.");
        }
    }, 1000);
}

function pausePomodoro() {
    clearInterval(pomoInterval);
    pomoInterval = null;
}

function resetPomodoro() {
    clearInterval(pomoInterval);
    pomoInterval = null;
    pomoSeconds = 25 * 60;
    renderPomodoro();
}

function renderLearning() {
    const store = getStore();
    const container = document.getElementById('learning-items-container');
    if (!container) return;

    container.textContent = ''; // Safe wipe

    store.learning.forEach(item => {
        const percent = Math.min(100, Math.round((item.current / item.total) * 100));
        const div = document.createElement('div');
        div.className = 'list-item-card';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'stretch';
        div.style.gap = '8px';

        const rowTop = document.createElement('div');
        rowTop.style.display = 'flex';
        rowTop.style.justifyContent = 'space-between';
        rowTop.style.fontWeight = '700';
        rowTop.style.fontSize = '0.88rem';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = item.title; // Safe textContent

        const pctSpan = document.createElement('span');
        pctSpan.style.color = 'var(--accent-cyan)';
        pctSpan.textContent = `${percent}% (${item.current}/${item.total})`;

        rowTop.appendChild(titleSpan);
        rowTop.appendChild(pctSpan);

        const progBg = document.createElement('div');
        progBg.className = 'prog-bar-bg';

        const progFill = document.createElement('div');
        progFill.className = 'prog-bar-fill';
        progFill.style.width = `${percent}%`;
        progFill.style.background = 'var(--accent-cyan)';
        progBg.appendChild(progFill);

        const actionsRow = document.createElement('div');
        actionsRow.style.display = 'flex';
        actionsRow.style.justifyContent = 'flex-end';
        actionsRow.style.gap = '8px';

        const btn5 = document.createElement('button');
        btn5.className = 'btn btn-secondary btn-sm';
        btn5.textContent = '+5 Pg';
        btn5.addEventListener('click', () => stepBookProgress(item.id, 5));

        const btn10 = document.createElement('button');
        btn10.className = 'btn btn-secondary btn-sm';
        btn10.textContent = '+10 Pg';
        btn10.addEventListener('click', () => stepBookProgress(item.id, 10));

        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-secondary btn-sm';
        btnDel.textContent = '✕';
        btnDel.addEventListener('click', () => deleteBook(item.id));

        actionsRow.appendChild(btn5);
        actionsRow.appendChild(btn10);
        actionsRow.appendChild(btnDel);

        div.appendChild(rowTop);
        div.appendChild(progBg);
        div.appendChild(actionsRow);
        container.appendChild(div);
    });
}

function addBook() {
    const titleInput = document.getElementById('in-book-title');
    const currentInput = document.getElementById('in-book-current');
    const totalInput = document.getElementById('in-book-total');

    const title = boundString(titleInput.value, 120);
    const current = boundNumber(currentInput.value, 0, 50000, 0);
    const total = boundNumber(totalInput.value, 1, 50000, 100);

    if (!title) return;

    const store = getStore();
    store.learning.push({
        id: "learn-" + Date.now().toString(36),
        title,
        current: Math.min(current, total),
        total
    });
    saveStore(store);

    titleInput.value = '';
    currentInput.value = '';
    totalInput.value = '';
}

function stepBookProgress(id, delta) {
    const store = getStore();
    const item = store.learning.find(x => x.id === id);
    if (item) {
        item.current = Math.min(item.total, item.current + delta);
        saveStore(store);
    }
}

function deleteBook(id) {
    const store = getStore();
    store.learning = store.learning.filter(x => x.id !== id);
    saveStore(store);
}

// ============================================================================
// 10. GYM & PROGRESSIVE OVERLOAD
// ============================================================================

let restTimerInterval = null;
let restSeconds = 90;

function startRestTimer(seconds) {
    clearInterval(restTimerInterval);
    restSeconds = boundNumber(seconds, 10, 600, 90);
    updateRestDisplay();
    restTimerInterval = setInterval(() => {
        if (restSeconds > 0) {
            restSeconds--;
            updateRestDisplay();
        } else {
            clearInterval(restTimerInterval);
            playBeep(880, 0.4);
            alert("Rest period complete! Ready for your next set.");
        }
    }, 1000);
}

function stopRestTimer() {
    clearInterval(restTimerInterval);
    restSeconds = 0;
    updateRestDisplay();
}

function updateRestDisplay() {
    const m = Math.floor(restSeconds / 60).toString().padStart(2, '0');
    const s = (restSeconds % 60).toString().padStart(2, '0');
    const display = document.getElementById('rest-timer-display');
    if (display) display.textContent = `${m}:${s}`;
}

function updateOverloadTip(rawName) {
    const tip = document.getElementById('gym-overload-tip');
    if (!tip) return;

    tip.textContent = ''; // Safe wipe
    const name = boundString(rawName, 120).toLowerCase();

    if (!name) {
        tip.textContent = '💡 Enter an exercise above to see what you lifted in your previous session!';
        return;
    }

    const store = getStore();
    let lastSet = null;

    for (const dayKey of Object.keys(store.days).sort().reverse()) {
        const found = (store.days[dayKey].gymSets || []).find(s => s.exercise.toLowerCase() === name);
        if (found) {
            lastSet = found;
            break;
        }
    }

    if (lastSet) {
        const span = document.createElement('span');
        span.textContent = `🔥 Previous Session: ${lastSet.weight}kg × ${lastSet.reps} reps. Target: +1 rep or +1.25kg today!`;
        tip.appendChild(span);
    } else {
        const span = document.createElement('span');
        span.textContent = `✨ First time logging this exercise! Set a solid benchmark today.`;
        tip.appendChild(span);
    }
}

function logGymSet() {
    const exerciseInput = document.getElementById('in-gym-exercise');
    const weightInput = document.getElementById('in-gym-weight');
    const repsInput = document.getElementById('in-gym-reps');

    const exercise = boundString(exerciseInput.value, 120);
    const weight = boundNumber(weightInput.value, 0, 500, -1);
    const reps = boundNumber(repsInput.value, 1, 200, -1);

    if (!exercise || weight < 0 || reps < 1) {
        alert("Please enter a valid exercise, positive weight (0-500 kg), and reps (1-200).");
        return;
    }

    const store = getStore();
    const today = getTodayData(store);
    today.gymSets.push({
        id: "gym-" + Date.now().toString(36),
        exercise,
        weight,
        reps
    });
    saveStore(store);

    startRestTimer(90);
    weightInput.value = '';
    repsInput.value = '';
}

function renderGymTable() {
    const store = getStore();
    const today = getTodayData(store);
    const tbody = document.getElementById('gym-log-table-body');
    if (!tbody) return;

    tbody.textContent = ''; // Safe wipe

    if (today.gymSets.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.color = 'var(--text-dim)';
        td.textContent = 'No workout sets logged today yet.';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    today.gymSets.forEach(set => {
        const tr = document.createElement('tr');

        const tdEx = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = set.exercise; // Immune to XSS
        tdEx.appendChild(strong);

        const tdWt = document.createElement('td');
        tdWt.textContent = `${set.weight} kg`;

        const tdReps = document.createElement('td');
        tdReps.textContent = `${set.reps} reps`;

        const tdVol = document.createElement('td');
        tdVol.textContent = `${Math.round(set.weight * set.reps)} kg`;

        const tdAct = document.createElement('td');
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-secondary btn-sm';
        btnDel.textContent = '✕';
        btnDel.addEventListener('click', () => deleteGymSet(set.id));
        tdAct.appendChild(btnDel);

        tr.appendChild(tdEx);
        tr.appendChild(tdWt);
        tr.appendChild(tdReps);
        tr.appendChild(tdVol);
        tr.appendChild(tdAct);

        tbody.appendChild(tr);
    });
}

function deleteGymSet(id) {
    const store = getStore();
    const today = getTodayData(store);
    today.gymSets = today.gymSets.filter(s => s.id !== id);
    saveStore(store);
}

// ============================================================================
// 11. NUTRITION & WATER TRACKER
// ============================================================================

function renderNutrition() {
    const store = getStore();
    const today = getTodayData(store);

    let totalCals = 0;
    let totalProtein = 0;

    today.meals.forEach(m => {
        totalCals += (m.cals || 0);
        totalProtein += (m.protein || 0);
    });

    const calsConsumedEl = document.getElementById('nutri-cals-consumed');
    const calsTargetEl = document.getElementById('nutri-cals-target');
    const proteinValEl = document.getElementById('nutri-protein-val');
    const dashCalPill = document.getElementById('dash-cal-pill');
    const dashCalRatio = document.getElementById('dash-cal-ratio');
    const nutriMacroBar = document.getElementById('nutri-macro-bar');
    const dashCalFill = document.getElementById('dash-cal-fill');

    if (calsConsumedEl) calsConsumedEl.textContent = String(totalCals);
    if (calsTargetEl) calsTargetEl.textContent = (store.config.calorieGoal || 2200).toLocaleString();
    if (proteinValEl) proteinValEl.textContent = `${totalProtein}g`;
    if (dashCalPill) dashCalPill.textContent = `${totalCals} kcal`;
    if (dashCalRatio) dashCalRatio.textContent = `${totalCals} / ${store.config.calorieGoal} kcal`;

    const calPct = Math.min(100, Math.round((totalCals / (store.config.calorieGoal || 2200)) * 100));
    if (nutriMacroBar) nutriMacroBar.style.width = `${calPct}%`;
    if (dashCalFill) dashCalFill.style.width = `${calPct}%`;

    // Render Meals List
    const mealList = document.getElementById('meals-list-container');
    if (mealList) {
        mealList.textContent = ''; // Safe wipe
        today.meals.forEach(m => {
            const row = document.createElement('div');
            row.className = 'list-item-card';

            const info = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = m.name; // Safe textContent

            const typeSpan = document.createElement('span');
            typeSpan.style.fontSize = '0.75rem';
            typeSpan.style.color = 'var(--text-dim)';
            typeSpan.style.marginLeft = '6px';
            typeSpan.textContent = `(${m.type})`;

            info.appendChild(strong);
            info.appendChild(typeSpan);

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.alignItems = 'center';
            actions.style.gap = '10px';

            const statSpan = document.createElement('span');
            statSpan.style.fontSize = '0.85rem';
            statSpan.style.color = 'var(--accent-amber)';
            statSpan.textContent = `${m.cals} kcal • ${m.protein}g P`;

            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-secondary btn-sm';
            btnDel.textContent = '✕';
            btnDel.addEventListener('click', () => deleteMeal(m.id));

            actions.appendChild(statSpan);
            actions.appendChild(btnDel);

            row.appendChild(info);
            row.appendChild(actions);
            mealList.appendChild(row);
        });
    }

    // Render Water Tracker
    const bubbleContainer = document.getElementById('water-bubbles-container');
    const waterCountText = document.getElementById('water-count-text');
    const glasses = today.waterGlasses || 0;

    if (waterCountText) {
        waterCountText.textContent = `${glasses} / 8 Glasses (${(glasses * 0.25).toFixed(1)}L)`;
    }

    if (bubbleContainer) {
        bubbleContainer.textContent = '';
        for (let i = 1; i <= 8; i++) {
            const bubble = document.createElement('div');
            bubble.className = `water-bubble ${i <= glasses ? 'filled' : ''}`;
            bubble.textContent = '💧';
            bubble.title = `Glass ${i} (250ml)`;
            bubble.addEventListener('click', () => {
                today.waterGlasses = (glasses === i) ? i - 1 : i;
                saveStore(store);
            });
            bubbleContainer.appendChild(bubble);
        }
    }
}

function addMeal() {
    const nameInput = document.getElementById('in-meal-name');
    const typeInput = document.getElementById('in-meal-type');
    const calsInput = document.getElementById('in-meal-cals');
    const protInput = document.getElementById('in-meal-protein');

    const name = boundString(nameInput.value, 120);
    const type = typeInput.value;
    const cals = boundNumber(calsInput.value, 0, 10000, 0);
    const protein = boundNumber(protInput.value, 0, 1000, 0);

    if (!name) return;

    const store = getStore();
    const today = getTodayData(store);
    today.meals.push({
        id: "meal-" + Date.now().toString(36),
        name,
        type: ['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(type) ? type : 'Snack',
        cals,
        protein
    });
    saveStore(store);

    nameInput.value = '';
    calsInput.value = '';
    protInput.value = '';
}

function deleteMeal(id) {
    const store = getStore();
    const today = getTodayData(store);
    today.meals = today.meals.filter(m => m.id !== id);
    saveStore(store);
}

// ============================================================================
// 12. HABITS & ROUTINE CHECKLIST
// ============================================================================

function renderHabits() {
    const store = getStore();
    const container = document.getElementById('task-list-container');
    const progressPill = document.getElementById('tasks-progress-pill');
    const navBadge = document.getElementById('nav-badge-habits');
    if (!container) return;

    container.textContent = ''; // Safe wipe
    let doneCount = 0;

    store.habits.forEach(h => {
        if (h.completed) doneCount++;

        const div = document.createElement('div');
        div.className = `task-item ${h.completed ? 'checked' : ''}`;

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = h.completed;
        chk.addEventListener('change', () => toggleHabit(h.id));

        const textSpan = document.createElement('span');
        textSpan.style.flex = '1';
        textSpan.textContent = h.text; // Safe textContent (XSS immunity)

        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-secondary btn-sm';
        btnDel.textContent = '✕';
        btnDel.addEventListener('click', () => deleteHabit(h.id));

        div.appendChild(chk);
        div.appendChild(textSpan);
        div.appendChild(btnDel);

        container.appendChild(div);
    });

    const statusText = `${doneCount}/${store.habits.length} Done`;
    if (progressPill) progressPill.textContent = statusText;
    if (navBadge) navBadge.textContent = `${doneCount}/${store.habits.length}`;
}

function toggleHabit(id) {
    const store = getStore();
    const h = store.habits.find(x => x.id === id);
    if (h) {
        h.completed = !h.completed;
        if (h.completed) playBeep(640, 0.1);
        saveStore(store);
    }
}

function addHabit() {
    const input = document.getElementById('in-new-task');
    const text = boundString(input.value, 120);
    if (!text) return;

    const store = getStore();
    store.habits.push({
        id: "habit-" + Date.now().toString(36),
        text,
        completed: false
    });
    saveStore(store);
    input.value = '';
}

function deleteHabit(id) {
    const store = getStore();
    store.habits = store.habits.filter(x => x.id !== id);
    saveStore(store);
}

// ============================================================================
// 13. MASTER DISCIPLINE & STREAK ENGINE
// ============================================================================

function calculateDiscipline() {
    const store = getStore();
    const today = getTodayData(store);

    // 1. Prayers Component (30%)
    const prayersDone = Object.values(today.prayers).filter(p => p === 'on-time' || p === 'late').length;
    const prayerScore = (prayersDone / 5) * 30;

    const dashPrayerCount = document.getElementById('dash-prayer-count');
    const navPrayerBadge = document.getElementById('nav-badge-prayers');
    if (dashPrayerCount) dashPrayerCount.textContent = `${prayersDone}/5`;
    if (navPrayerBadge) navPrayerBadge.textContent = `${prayersDone}/5`;

    // 2. Habits Component (25%)
    const totalHabits = store.habits.length || 1;
    const doneHabits = store.habits.filter(h => h.completed).length;
    const habitScore = (doneHabits / totalHabits) * 25;

    // 3. Gym Component (25%)
    const gymScore = (today.gymSets.length > 0) ? 25 : 0;

    // 4. Nutrition / Hydration Component (20%)
    const waterScore = Math.min(10, ((today.waterGlasses || 0) / 8) * 10);
    const calRatio = (today.meals.reduce((a, b) => a + (b.cals || 0), 0) / (store.config.calorieGoal || 2200));
    const calScore = (calRatio >= 0.75 && calRatio <= 1.15) ? 10 : (calRatio > 0 ? 5 : 0);
    const nutriScore = waterScore + calScore;

    // Final Weighted Score (0 to 100)
    const finalScore = Math.min(100, Math.round(prayerScore + habitScore + gymScore + nutriScore));

    const statDiscipline = document.getElementById('stat-discipline');
    const sidebarStatDiscipline = document.getElementById('sidebar-stat-discipline');
    const heroScoreVal = document.getElementById('hero-score-val');
    const heroDial = document.getElementById('hero-dial');

    if (statDiscipline) statDiscipline.textContent = `${finalScore}%`;
    if (sidebarStatDiscipline) sidebarStatDiscipline.textContent = `${finalScore}%`;
    if (heroScoreVal) heroScoreVal.textContent = `${finalScore}%`;
    if (heroDial) {
        heroDial.style.background = `conic-gradient(var(--accent-emerald) ${finalScore}%, var(--bg-input) ${finalScore}%)`;
    }

    // Streak increment if score >= 75%
    const todayStr = getTodayKey();
    if (finalScore >= 75 && store.config.lastStreakDate !== todayStr) {
        store.config.streak = (store.config.streak || 0) + 1;
        store.config.lastStreakDate = todayStr;
        saveStore(store);
    }

    const streakStr = `${store.config.streak || 0} Days`;
    const statStreak = document.getElementById('stat-streak');
    const sidebarStatStreak = document.getElementById('sidebar-stat-streak');
    if (statStreak) statStreak.textContent = streakStr;
    if (sidebarStatStreak) sidebarStatStreak.textContent = streakStr;
}

function refreshAllViews() {
    renderPrayers();
    renderAssignments();
    renderLearning();
    renderGymTable();
    renderNutrition();
    renderHabits();
    calculateDiscipline();
    refreshVaultUI();
}

// ============================================================================
// 14. DATA BACKUP, SAFE IMPORT & FACTORY RESET
// ============================================================================

function exportJsonBackup() {
    const data = getStore();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Saad-Life-Tracker-Backup-${getTodayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importJsonBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const rawParsed = JSON.parse(e.target.result);
            const validated = validateAndNormalizeStore(rawParsed);

            if (!validated) {
                alert("Security Error: Backup file format is corrupted or failed integrity validation.");
                return;
            }

            // Write safe validated store to LocalStorage
            localStorage.setItem(DB_KEY, JSON.stringify(validated));
            alert("Backup restored and verified successfully!");
            location.reload();
        } catch (err) {
            console.error("Backup restoration failed:", err);
            alert("Error reading backup file: Invalid JSON syntax.");
        }
    };
    reader.readAsText(file);
}

function triggerFactoryPurge() {
    const modal = document.getElementById('purge-modal');
    const confirmInput = document.getElementById('in-purge-confirm-text');
    if (confirmInput) confirmInput.value = '';
    if (modal) modal.style.display = 'flex';
}

function confirmFactoryPurge() {
    const confirmInput = document.getElementById('in-purge-confirm-text');
    if (!confirmInput || confirmInput.value.trim().toUpperCase() !== 'RESET') {
        alert("Please type 'RESET' exactly to confirm data purge.");
        return;
    }

    // Securely wipe all stored items
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(VAULT_NOTES_KEY);
    sessionStorage.clear();

    alert("Saad Life Tracker has been reset to factory defaults.");
    location.reload();
}

function cancelFactoryPurge() {
    const modal = document.getElementById('purge-modal');
    if (modal) modal.style.display = 'none';
}

// ============================================================================
// 15. PRIVATE VAULT & PIN LOCK SCREEN (WEB CRYPTO AES-GCM)
// ============================================================================

function isPinConfigured() {
    return Boolean(localStorage.getItem(PIN_KEY));
}

function refreshVaultUI() {
    const badge = document.getElementById('vault-status-badge');
    const setupBox = document.getElementById('vault-setup-container');
    const contentBox = document.getElementById('vault-content-container');
    const lockSidebarBtn = document.getElementById('btn-lock-sidebar');
    const lockDesktopBtn = document.getElementById('btn-lock-desktop');
    const lockMobileBtn = document.getElementById('btn-lock-mobile');
    const removePinBtn = document.getElementById('btn-remove-pin');

    const hasPin = isPinConfigured();

    if (lockSidebarBtn) lockSidebarBtn.style.display = hasPin ? 'block' : 'none';
    if (lockDesktopBtn) lockDesktopBtn.style.display = hasPin ? 'flex' : 'none';
    if (lockMobileBtn) lockMobileBtn.style.display = hasPin ? 'flex' : 'none';
    if (removePinBtn) removePinBtn.style.display = hasPin ? 'inline-flex' : 'none';

    if (!hasPin) {
        if (badge) {
            badge.textContent = "PIN Not Set";
            badge.className = "badge";
        }
        if (setupBox) setupBox.style.display = 'block';
        if (contentBox) contentBox.style.display = 'none';
        return;
    }

    if (activeVaultPin) {
        // Unlocked state
        if (badge) {
            badge.textContent = "Unlocked";
            badge.className = "badge badge-emerald";
        }
        if (setupBox) setupBox.style.display = 'none';
        if (contentBox) contentBox.style.display = 'block';
        renderDecryptedVaultNotes();
    } else {
        // Configured but locked
        if (badge) {
            badge.textContent = "Locked";
            badge.className = "badge badge-urgent";
        }
        if (setupBox) setupBox.style.display = 'none';
        if (contentBox) contentBox.style.display = 'none';
    }
}

async function setupNewPin() {
    const pinInput = document.getElementById('in-vault-pin-setup');
    const pin = (pinInput ? pinInput.value : "").trim();

    if (!/^\d{4}$/.test(pin)) {
        alert("PIN must be exactly 4 numeric digits.");
        return;
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPinWithSalt(pin, salt);

    const record = {
        salt: Array.from(salt),
        hash: hash
    };

    localStorage.setItem(PIN_KEY, JSON.stringify(record));
    activeVaultPin = pin;
    if (pinInput) pinInput.value = '';

    alert("4-Digit PIN successfully enabled! Your personal vault is now protected.");
    refreshVaultUI();
}

function removePinProtection() {
    if (!confirm("Are you sure you want to remove PIN protection? Your encrypted vault notes will be deleted.")) {
        return;
    }
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(VAULT_NOTES_KEY);
    activeVaultPin = null;
    alert("PIN protection and encrypted notes removed.");
    refreshVaultUI();
}

async function verifyPinAttempt(pin) {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return false;

    try {
        const record = JSON.parse(raw);
        const salt = new Uint8Array(record.salt);
        const expectedHash = record.hash;
        const computedHash = await hashPinWithSalt(pin, salt);
        return computedHash === expectedHash;
    } catch (e) {
        return false;
    }
}

function showPinModal(isScreenLock = false) {
    isAppLocked = isScreenLock;
    enteredPinDigits = "";
    updatePinDots();

    const modal = document.getElementById('pin-modal');
    const title = document.getElementById('pin-modal-title');
    const desc = document.getElementById('pin-modal-desc');
    const err = document.getElementById('pin-error-text');

    if (title) title.textContent = isScreenLock ? "App Locked" : "Unlock Private Vault";
    if (desc) desc.textContent = isScreenLock
        ? "Enter your 4-digit PIN to access Saad Life Tracker"
        : "Enter your 4-digit PIN to decrypt your personal notes";
    if (err) err.textContent = "";

    if (modal) modal.style.display = 'flex';
}

function hidePinModal() {
    const modal = document.getElementById('pin-modal');
    if (modal) modal.style.display = 'none';
    enteredPinDigits = "";
    updatePinDots();
}

function updatePinDots() {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`pdot-${i}`);
        if (dot) {
            dot.classList.toggle('filled', i <= enteredPinDigits.length);
        }
    }
}

async function handlePinInput(digit) {
    if (enteredPinDigits.length >= 4) return;
    enteredPinDigits += digit;
    updatePinDots();

    if (enteredPinDigits.length === 4) {
        const success = await verifyPinAttempt(enteredPinDigits);
        if (success) {
            activeVaultPin = enteredPinDigits;
            playBeep(780, 0.15);
            hidePinModal();
            refreshVaultUI();
        } else {
            playBeep(320, 0.3);
            const err = document.getElementById('pin-error-text');
            if (err) err.textContent = "Incorrect PIN. Please try again.";
            setTimeout(() => {
                enteredPinDigits = "";
                updatePinDots();
            }, 600);
        }
    }
}

async function saveEncryptedNote() {
    if (!activeVaultPin) {
        showPinModal(false);
        return;
    }

    const textArea = document.getElementById('in-vault-note-text');
    const text = boundString(textArea ? textArea.value : "", 2000);
    if (!text) return;

    try {
        let existingNotes = [];
        const rawVault = localStorage.getItem(VAULT_NOTES_KEY);
        if (rawVault) {
            try {
                const decryptedStr = await decryptWithPin(rawVault, activeVaultPin);
                existingNotes = JSON.parse(decryptedStr);
            } catch (e) {
                existingNotes = [];
            }
        }

        const newNote = {
            id: "note-" + Date.now().toString(36),
            text: text,
            date: new Date().toISOString()
        };

        existingNotes.unshift(newNote);
        const cipher = await encryptWithPin(JSON.stringify(existingNotes), activeVaultPin);
        localStorage.setItem(VAULT_NOTES_KEY, cipher);

        if (textArea) textArea.value = '';
        renderDecryptedVaultNotes();
        playBeep(640, 0.1);
    } catch (e) {
        console.error("Encryption error:", e);
        alert("Error encrypting note.");
    }
}

async function renderDecryptedVaultNotes() {
    const list = document.getElementById('vault-notes-list');
    if (!list) return;

    list.textContent = ''; // Safe wipe

    if (!activeVaultPin) {
        const p = document.createElement('p');
        p.style.color = 'var(--text-muted)';
        p.textContent = 'Vault is locked. Enter your PIN to view decrypted notes.';
        list.appendChild(p);
        return;
    }

    const rawVault = localStorage.getItem(VAULT_NOTES_KEY);
    if (!rawVault) {
        const p = document.createElement('p');
        p.style.color = 'var(--text-dim)';
        p.style.fontSize = '0.88rem';
        p.textContent = 'No encrypted notes stored yet. Write your first reflection above!';
        list.appendChild(p);
        return;
    }

    try {
        const decryptedStr = await decryptWithPin(rawVault, activeVaultPin);
        const notes = JSON.parse(decryptedStr);

        if (!Array.isArray(notes) || notes.length === 0) {
            const p = document.createElement('p');
            p.style.color = 'var(--text-dim)';
            p.style.fontSize = '0.88rem';
            p.textContent = 'No encrypted notes stored yet.';
            list.appendChild(p);
            return;
        }

        notes.forEach(note => {
            const row = document.createElement('div');
            row.className = 'list-item-card';
            row.style.flexDirection = 'column';
            row.style.alignItems = 'stretch';
            row.style.gap = '8px';

            const headerRow = document.createElement('div');
            headerRow.style.display = 'flex';
            headerRow.style.justifyContent = 'space-between';
            headerRow.style.fontSize = '0.75rem';
            headerRow.style.color = 'var(--text-muted)';

            const dateSpan = document.createElement('span');
            dateSpan.textContent = new Date(note.date).toLocaleString();

            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-secondary btn-sm';
            btnDel.textContent = '✕ Delete';
            btnDel.addEventListener('click', () => deleteVaultNote(note.id));

            headerRow.appendChild(dateSpan);
            headerRow.appendChild(btnDel);

            const bodyText = document.createElement('p');
            bodyText.style.fontSize = '0.92rem';
            bodyText.style.lineHeight = '1.5';
            bodyText.style.color = 'var(--text-main)';
            bodyText.textContent = note.text; // Immune to XSS

            row.appendChild(headerRow);
            row.appendChild(bodyText);
            list.appendChild(row);
        });
    } catch (e) {
        console.error("Decryption error:", e);
        const errP = document.createElement('p');
        errP.style.color = 'var(--accent-rose)';
        errP.textContent = 'Decryption failed: PIN mismatch or corrupted ciphertext.';
        list.appendChild(errP);
    }
}

async function deleteVaultNote(id) {
    if (!activeVaultPin) return;
    const rawVault = localStorage.getItem(VAULT_NOTES_KEY);
    if (!rawVault) return;

    try {
        const decryptedStr = await decryptWithPin(rawVault, activeVaultPin);
        let notes = JSON.parse(decryptedStr);
        notes = notes.filter(n => n.id !== id);

        const cipher = await encryptWithPin(JSON.stringify(notes), activeVaultPin);
        localStorage.setItem(VAULT_NOTES_KEY, cipher);
        renderDecryptedVaultNotes();
    } catch (e) {
        console.error("Delete note error:", e);
    }
}

function lockVault() {
    activeVaultPin = null;
    refreshVaultUI();
}

// ============================================================================
// 16. EVENT LISTENERS INITIALIZATION (ZERO INLINE SCRIPT HANDLERS)
// ============================================================================

function attachEventListeners() {
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Quick switch buttons on Dashboard
    document.querySelectorAll('.action-switch-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (target) switchTab(target);
        });
    });

    // Mobile Sidebar Drawer
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    if (btnMobileMenu) btnMobileMenu.addEventListener('click', openMobileSidebar);

    const btnCloseSidebar = document.getElementById('btn-sidebar-close');
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', closeMobileSidebar);

    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);

    // Theme Toggle Buttons
    document.querySelectorAll('.theme-toggle-btn, .theme-toggle-full-btn').forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });

    // Lock App Buttons
    const lockHandler = () => {
        lockVault();
        showPinModal(true);
    };
    const btnLockSidebar = document.getElementById('btn-lock-sidebar');
    const btnLockDesktop = document.getElementById('btn-lock-desktop');
    const btnLockMobile = document.getElementById('btn-lock-mobile');
    if (btnLockSidebar) btnLockSidebar.addEventListener('click', lockHandler);
    if (btnLockDesktop) btnLockDesktop.addEventListener('click', lockHandler);
    if (btnLockMobile) btnLockMobile.addEventListener('click', lockHandler);

    // Prayer controls
    const btnUpdatePrayers = document.getElementById('btn-update-prayers');
    if (btnUpdatePrayers) {
        btnUpdatePrayers.addEventListener('click', () => {
            const store = getStore();
            store.config.city = boundString(document.getElementById('cfg-city').value, 120) || "Karachi";
            store.config.country = boundString(document.getElementById('cfg-country').value, 120) || "Pakistan";
            saveStore(store);
            fetchPrayerTimes();
        });
    }

    const btnGps = document.getElementById('btn-gps');
    if (btnGps) {
        btnGps.addEventListener('click', () => {
            if (!navigator.geolocation) return alert("Geolocation is not supported by your browser.");
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=1`);
                    const json = await res.json();
                    if (json.code === 200) {
                        cachedTimings = json.data.timings;
                        renderPrayers();
                        alert("Prayer times updated from GPS coordinates!");
                    }
                } catch (e) {
                    alert("Unable to fetch prayer times via GPS.");
                }
            }, () => {
                alert("Location permission denied.");
            });
        });
    }

    const btnResetQadha = document.getElementById('btn-reset-qadha');
    if (btnResetQadha) {
        btnResetQadha.addEventListener('click', () => {
            if (confirm("Reset all persistent Qadha counters to 0?")) {
                const store = getStore();
                store.qadha = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };
                saveStore(store);
            }
        });
    }

    // University Assignments
    const btnAddAssign = document.getElementById('btn-add-assignment');
    if (btnAddAssign) btnAddAssign.addEventListener('click', addAssignment);

    // Pomodoro Timer
    const btnPomoStart = document.getElementById('btn-pomo-start');
    const btnPomoPause = document.getElementById('btn-pomo-pause');
    const btnPomoReset = document.getElementById('btn-pomo-reset');
    if (btnPomoStart) btnPomoStart.addEventListener('click', startPomodoro);
    if (btnPomoPause) btnPomoPause.addEventListener('click', pausePomodoro);
    if (btnPomoReset) btnPomoReset.addEventListener('click', resetPomodoro);

    // Self-Learning
    const btnAddBook = document.getElementById('btn-add-book');
    if (btnAddBook) btnAddBook.addEventListener('click', addBook);

    // Gym Sets & Rest Stopwatch
    const inGymEx = document.getElementById('in-gym-exercise');
    if (inGymEx) {
        inGymEx.addEventListener('input', (e) => updateOverloadTip(e.target.value));
    }

    const btnLogGym = document.getElementById('btn-log-gym-set');
    if (btnLogGym) btnLogGym.addEventListener('click', logGymSet);

    document.querySelectorAll('.btn-rest-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const sec = parseInt(btn.getAttribute('data-seconds'), 10) || 90;
            startRestTimer(sec);
        });
    });

    const btnRestStop = document.getElementById('btn-rest-stop');
    if (btnRestStop) btnRestStop.addEventListener('click', stopRestTimer);

    // Nutrition & Water
    const btnAddMeal = document.getElementById('btn-add-meal');
    if (btnAddMeal) btnAddMeal.addEventListener('click', addMeal);

    // Daily Habits
    const btnAddTask = document.getElementById('btn-add-task');
    if (btnAddTask) btnAddTask.addEventListener('click', addHabit);

    // Private Vault
    const btnVaultSetup = document.getElementById('btn-vault-setup-save');
    if (btnVaultSetup) btnVaultSetup.addEventListener('click', setupNewPin);

    const btnVaultSaveNote = document.getElementById('btn-vault-save-note');
    if (btnVaultSaveNote) btnVaultSaveNote.addEventListener('click', saveEncryptedNote);

    const btnVaultLockNow = document.getElementById('btn-vault-lock-now');
    if (btnVaultLockNow) btnVaultLockNow.addEventListener('click', lockVault);

    const btnRemovePin = document.getElementById('btn-remove-pin');
    if (btnRemovePin) btnRemovePin.addEventListener('click', removePinProtection);

    // PIN Keypad Numbers
    document.querySelectorAll('.pin-key[data-digit]').forEach(key => {
        key.addEventListener('click', () => {
            const digit = key.getAttribute('data-digit');
            handlePinInput(digit);
        });
    });

    const btnPinClear = document.getElementById('btn-pin-clear');
    if (btnPinClear) {
        btnPinClear.addEventListener('click', () => {
            enteredPinDigits = "";
            updatePinDots();
        });
    }

    const btnPinDel = document.getElementById('btn-pin-del');
    if (btnPinDel) {
        btnPinDel.addEventListener('click', () => {
            if (enteredPinDigits.length > 0) {
                enteredPinDigits = enteredPinDigits.slice(0, -1);
                updatePinDots();
            }
        });
    }

    // Backup & Restore
    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) btnExportJson.addEventListener('click', exportJsonBackup);

    const inImportFile = document.getElementById('in-import-file');
    if (inImportFile) {
        inImportFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) importJsonBackup(file);
        });
    }

    // Factory Purge Modal
    const btnTriggerPurge = document.getElementById('btn-trigger-purge');
    if (btnTriggerPurge) btnTriggerPurge.addEventListener('click', triggerFactoryPurge);

    const btnPurgeCancel = document.getElementById('btn-purge-cancel');
    if (btnPurgeCancel) btnPurgeCancel.addEventListener('click', cancelFactoryPurge);

    const btnPurgeConfirm = document.getElementById('btn-purge-confirm');
    if (btnPurgeConfirm) btnPurgeConfirm.addEventListener('click', confirmFactoryPurge);

    // Keyboard support for modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMobileSidebar();
            cancelFactoryPurge();
            if (!isAppLocked) hidePinModal();
        }
        // Physical numeric keys for PIN keypad
        const pinModal = document.getElementById('pin-modal');
        if (pinModal && pinModal.style.display === 'flex') {
            if (/^[0-9]$/.test(e.key)) {
                handlePinInput(e.key);
            } else if (e.key === 'Backspace') {
                if (enteredPinDigits.length > 0) {
                    enteredPinDigits = enteredPinDigits.slice(0, -1);
                    updatePinDots();
                }
            }
        }
    });
}

// ============================================================================
// 17. APP INITIALIZATION LIFECYCLE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme (Minimalist light default, dark mode toggle)
    initTheme();

    // 2. Load Store and populate initial values
    const store = getStore();

    const cityInput = document.getElementById('cfg-city');
    const countryInput = document.getElementById('cfg-country');
    if (cityInput) cityInput.value = store.config.city || "Karachi";
    if (countryInput) countryInput.value = store.config.country || "Pakistan";

    // 3. Format Gregorian Date
    const opts = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const txtGregorian = document.getElementById('txt-gregorian');
    if (txtGregorian) txtGregorian.textContent = new Date().toLocaleDateString(undefined, opts);

    // 4. Attach all hardened event listeners
    attachEventListeners();

    // 5. Initialize UI views and renderers
    fetchPrayerTimes();
    refreshAllViews();
    renderPomodoro();
    updateRestDisplay();

    // 6. Periodic prayer countdown updater (every 30 seconds)
    setInterval(updatePrayerCountdown, 30000);

    // 7. Check if PIN screen lock is active
    if (isPinConfigured()) {
        showPinModal(true);
    }
});