// ================= STATE & PERSISTENCE =================
const TOTAL_LEVELS = 10; // 9 Levels + 1 Certificate Page

// Storage Keys
// Each user on this device gets a unique storage key
// Resulting Key: "ISL_PROGRESS_123" (where 123 is user_id)
const STORAGE_KEY = `ISL_PROGRESS_${CURRENT_USER_ID}`;

// Default State for New Users
const DEFAULT_STATE = {
    maxUnlocked: 1,
    scores: {},
    certGenerated: false,
    level3Stage: 0 // 0: Beginner, 1: Intermediate, 2: Advanced, 3: Completed
};

// Load State or Initialize New
let userState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_STATE;

// Extract variables for easy usage (sync back on save)
let maxUnlocked = userState.maxUnlocked;
let levelScores = userState.scores;
let certGenerated = userState.certGenerated;
let level3Stage = userState.level3Stage || 0;

// ================= DATA =================
let sentIndex = 0;
let textPollInterval = null;

let quizState = { set: 'beginner', score: 0, currentQuestionIndex: 0, questions: [], answered: false };
let matchGameState = { score: 0, moves: 0 };
let speedGameState = { score: 0, timer: 5, interval: null, questions: [], currentIdx: 0, active: false };
let memoryState = { cards: [], flipped: [], matchedPairs: 0, moves: 0, locked: false };
let sentenceGameState = { target: "", currentPool: [] };
let advQuizState = { score: 0, currentIdx: 0, questions: [] };

// ================= DATA (Expanded) =================
const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const numbers = "0123456789".split("");

// Expanded list of 50 common words
const commonWords = [
    "HELLO", "THANK YOU", "PLEASE", "YES", "NO", "HELP", "STOP", "GOOD", "BAD",
    "WATER", "FOOD", "DOCTOR", "HOSPITAL", "EMERGENCY", "SORRY", "FRIEND", "FAMILY",
    "NEED", "WANT", "COME", "GO", "WAIT", "HAPPY", "SAD", "PAIN", "MORE", "LESS",
    "WHERE", "WHAT", "WHY", "HOW", "MORNING", "NIGHT", "TODAY", "TOMORROW", "NOW",
    "AGAIN", "FINISH", "START", "UNDERSTAND", "DON'T UNDERSTAND", "CALL", "NAME", "AGE", "TIME", "HOME",
    "SCHOOL", "WORK", "MONEY", "LOVE", "PEACE"
];

const sentences = [

    { text: "I NEED HELP", signs: ["I", "NEED", "HELP"] },
    { text: "CALL A DOCTOR", signs: ["CALL", "DOCTOR"] },
    { text: "WHERE IS HOSPITAL", signs: ["WHERE", "HOSPITAL"] },
    { text: "PLEASE WAIT", signs: ["PLEASE", "WAIT"] },
    { text: "THANK YOU", signs: ["THANK", "YOU"] }
];

// ================= CORE HELPER FUNCTIONS =================
function saveProgress() {
    userState.maxUnlocked = maxUnlocked;
    userState.scores = levelScores;
    userState.certGenerated = certGenerated;
    userState.level3Stage = level3Stage;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userState));
    updateProgressUI();
}

function getSignImage(type, value) {
    // Return path to static image in flat directory
    // User confirmed images are A.jpg, 0.jpg, etc. in static/images/
    return `/static/images/${value}.jpg`;
}

function initLevels() {
    // Init Grids (Only for Practice Library now - Level 1)
    initPracticeLibrary();

    // Auto-navigate to latest level
    if (maxUnlocked > 1) switchLevel(maxUnlocked);
    else switchLevel(1);

    updateSentenceUI();
    updateProgressUI();
}

// function createFlipCard removed as it does not match the requested "Image Top, Text Bottom" layout for L1/L2.

function createCard(content, type, delay) {
    const div = document.createElement('div');
    div.className = 'card fade-in-up';
    div.style.animationDelay = `${delay}s`;
    let imgSrc = getSignImage(type, content);

    // Container for Image
    const mediaDiv = document.createElement('div');
    mediaDiv.className = 'card-media';

    // Image Element
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = content;
    img.loading = "lazy";

    // Fallback Logic: Hide img, show text box
    img.onerror = () => {
        img.style.display = "none";
        const fb = document.createElement('div');
        fb.className = 'fallback-sign';
        fb.innerText = content; // Show "A", "0", etc.
        mediaDiv.appendChild(fb);
    };

    mediaDiv.appendChild(img);

    // Title
    const contentDiv = document.createElement('div');
    contentDiv.className = 'card-content';
    contentDiv.innerHTML = `<div class="card-title">${content}</div>`;

    div.appendChild(mediaDiv);
    div.appendChild(contentDiv);

    // Interaction
    div.onclick = () => openModal(content, type, imgSrc);

    return div;
}

// ================= NAVIGATION =================
function switchLevel(lvl) {
    if (lvl > maxUnlocked) return;

    // Sidebar Update
    document.querySelectorAll('.level-item').forEach(el => el.classList.remove('active'));
    const nav = document.getElementById(`nav-lvl-${lvl}`);
    if (nav) nav.classList.add('active');

    // Section Update
    document.querySelectorAll('.level-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`level-${lvl}`).classList.add('active');

    currentLevel = lvl;

    

    if (lvl === 1) initPracticeLibrary();
    if (lvl === 2) stopPractice(); 
    if (lvl === 3) {
        showQuizStart();
        updateLevel3UI();
    }
    if (lvl === 4) updateSentenceUI();
    if (lvl === 5) initMatchGame();
    if (lvl === 6) document.getElementById('speedGameArea').style.opacity = '1';
    if (lvl === 7) initMemoryGame();
    if (lvl === 8) initSentenceGame();
    if (lvl === 9) initAdvQuiz();
    if (lvl === 10) initCertificate();
}

function completeLevel(lvl, score = 0) {
    // Save Score
    if (score > (levelScores[lvl] || 0)) {
        levelScores[lvl] = score;
    }

    if (lvl >= maxUnlocked && lvl < TOTAL_LEVELS) {
        maxUnlocked = lvl + 1;
        // Animation for sidebar unlock
        const nextNav = document.getElementById(`nav-lvl-${maxUnlocked}`);
        if (nextNav) {
            nextNav.classList.remove('locked');
            nextNav.style.animation = "unlock 0.5s ease";
        }
    }

    saveProgress();

    if (lvl < TOTAL_LEVELS) {
        switchLevel(lvl + 1);
    } else {
        alert("Course Completed! Redirecting to Certificate...");
        switchLevel(10);
    }
}

function updateProgressUI() {
    // Sidebar Completion Status
    for (let i = 1; i < TOTAL_LEVELS; i++) { // Level 13 is end
        const nav = document.getElementById(`nav-lvl-${i}`);
        if (!nav) continue;

        if (i < maxUnlocked) {
            nav.classList.add('completed');
            nav.classList.remove('locked');
        } else if (i === maxUnlocked) {
            nav.classList.remove('locked');
        } else {
            nav.classList.add('locked');
            nav.classList.remove('completed');
        }
    }


    let pct = ((maxUnlocked - 1) / (TOTAL_LEVELS - 1)) * 100;
    if (pct > 100) pct = 100;

    const fill = document.getElementById('totalProgress');
    const txt = document.getElementById('progressPercent');
    if (fill) fill.style.width = `${pct}%`;
    if (txt) txt.innerText = Math.round(pct);
}

function openModal(content, type, imgSrc) {
    const modal = document.getElementById('infoModal');
    document.getElementById('modalTitle').innerText = `${type}: ${content}`;
    document.getElementById('modalMeta').innerText = content;
    document.getElementById('modalContent').innerHTML = `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:contain">`;
    modal.style.display = "flex";
}
function closeModal() { document.getElementById('infoModal').style.display = "none"; }


function startPractice() {
    fetch("/start_webcam").then(() => {
        document.getElementById("videoStream").style.display = 'block';
        document.getElementById("videoStream").src = "/video_feed";
        document.getElementById("webcamPlaceholder").style.display = 'none';

        if (textPollInterval) clearInterval(textPollInterval);
        textPollInterval = setInterval(() => {
            fetch("/get_text").then(r => r.text()).then(t => {
                const target = document.getElementById('practiceTarget').value;
                const fb = document.getElementById('feedbackMsg');
                fb.innerHTML = `Target: ${target}<br>Detected: ${t}`;
                if (t.includes(target)) fb.innerHTML += " ✅";
            });
        }, 800);
    });
}
function stopPractice() {
    fetch("/stop_webcam");
    document.getElementById("videoStream").style.display = 'none';
    document.getElementById("webcamPlaceholder").style.display = 'flex';
    clearInterval(textPollInterval);
}

function updateLevel3UI() {
    const btnBeg = document.getElementById('btn-quiz-beginner');
    const btnInt = document.getElementById('btn-quiz-intermediate');
    const btnAdv = document.getElementById('btn-quiz-advanced');
    const btnNext = document.getElementById('btn-level3-next');

    // Reset basics
    if (btnBeg) btnBeg.disabled = false;
    if (btnInt) btnInt.disabled = true;
    if (btnAdv) btnAdv.disabled = true;
    if (btnNext) btnNext.disabled = true;

    // Logic: 0=Beg, 1=Int, 2=Adv, 3=Done
    if (level3Stage >= 1) {
        if (btnInt) {
            btnInt.disabled = false;
            btnBeg.classList.add('completed-stage');
            // We keep it enabled so they can practice again if they want, 
            // but visual cue 'completed-stage' shows they passed.
        }
    }
    if (level3Stage >= 2) {
        if (btnAdv) {
            btnAdv.disabled = false;
            btnInt.classList.add('completed-stage');
        }
    }
    if (level3Stage >= 3) {
        if (btnNext) btnNext.disabled = false;
        if (btnAdv) btnAdv.classList.add('completed-stage');
    }
}

function startQuiz(difficulty) {
    // Stage Check
    if (difficulty === 'intermediate' && level3Stage < 1) return;
    if (difficulty === 'advanced' && level3Stage < 2) return;

    quizState.set = difficulty;
    quizState.score = 0;
    quizState.currentQuestionIndex = 0;

    // Generate Questions
    let pool = difficulty === 'beginner' ? alphabets : (difficulty === 'intermediate' ? numbers : commonWords);
    quizState.questions = Array.from({ length: 10 }, () => {
        const correct = pool[Math.floor(Math.random() * pool.length)];
        let opts = [correct];
        while (opts.length < 4) {
            let r = pool[Math.floor(Math.random() * pool.length)];
            if (!opts.includes(r)) opts.push(r);
        }
        return { answer: correct, options: opts.sort(() => 0.5 - Math.random()) };
    });

    document.getElementById('quizStartScreen').classList.remove('active');
    document.getElementById('quizGameScreen').classList.add('active');
    loadQuizQuestion();
}

function loadQuizQuestion() {
    if (quizState.currentQuestionIndex >= 10) {
        showQuizResult();
        return;
    }
    const q = quizState.questions[quizState.currentQuestionIndex];
    document.getElementById('quizProgressText').innerText = `Question ${quizState.currentQuestionIndex + 1}/10`;
    document.getElementById('quizQuestionImg').src = getSignImage('Quiz', q.answer);

    const optsDiv = document.getElementById('quizOptions');
    optsDiv.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'quiz-option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkQuizAnswer(opt, q.answer, btn);
        optsDiv.appendChild(btn);
    });
    document.getElementById('btnNextQuestion').disabled = true;
}

function checkQuizAnswer(sel, cor, btn) {
    if (btn.classList.contains('correct') || btn.classList.contains('wrong')) return;

    if (sel === cor) {
        btn.classList.add('correct');
        quizState.score++;
    } else {
        btn.classList.add('wrong');
        const all = document.querySelectorAll('.quiz-option-btn');
        all.forEach(b => { if (b.innerText === cor) b.classList.add('correct'); });
    }
    document.getElementById('quizScoreDisplay').innerText = `Score: ${quizState.score}`;
    document.getElementById('btnNextQuestion').disabled = false;
    document.getElementById('quizProgressBarFill').style.width = `${((quizState.currentQuestionIndex + 1) / 10) * 100}%`;
}

function nextQuestion() {
    quizState.currentQuestionIndex++;
    loadQuizQuestion();
}

function showQuizResult() {
    document.getElementById('quizGameScreen').classList.remove('active');
    document.getElementById('quizResultScreen').classList.add('active');

    // Stats
    const total = 10;
    const score = quizState.score;
    const pct = (score / total) * 100;

    document.getElementById('finalScoreVal').innerText = score;
    document.getElementById('resCorrect').innerText = score;
    document.getElementById('resWrong').innerText = total - score;

    const msgEl = document.getElementById('resultMessage');
    const actionsDiv = document.querySelector('.result-actions');

    // Logic: Pass if >= 60%
    if (pct >= 60) {
        msgEl.innerText = "Great Job! Stage Passed.";
        msgEl.style.color = "#22c55e"; // Green

        // Progress Logic
        if (quizState.set === 'beginner' && level3Stage < 1) {
            level3Stage = 1;
        } else if (quizState.set === 'intermediate' && level3Stage < 2) {
            level3Stage = 2;
        } else if (quizState.set === 'advanced' && level3Stage < 3) {
            level3Stage = 3;
        }

        saveProgress();
        updateLevel3UI(); 

        actionsDiv.innerHTML = `
            <button class="btn btn-secondary" onclick="showQuizStart()">✅ Continue / Next Stage</button>
        `;

    } else {
        msgEl.innerText = "Minimum score not achieved (60%). Try Again.";
        msgEl.style.color = "#ef4444"; 

        actionsDiv.innerHTML = `
            <button class="btn btn-primary" onclick="startQuiz('${quizState.set}')">🔄 Retry Quiz</button>
            <button class="btn btn-secondary" onclick="showQuizStart()">⬅ Back to Menu</button>
        `;
    }
}
function showQuizStart() {
    document.getElementById('quizResultScreen').classList.remove('active');
    document.getElementById('quizStartScreen').classList.add('active');
}


function updateSentenceUI() {
    const s = sentences[sentIndex];
    if (!s) return;
    document.getElementById('sentText').innerText = s.text;
    document.getElementById('sentProgressText').innerText = `Sentence ${sentIndex + 1}/${sentences.length}`;
    document.getElementById('sentImage').src = getSignImage('Sent', s.signs[0]); // Just showing first sign as placeholder
    document.getElementById('sentProgressFill').style.width = `${((sentIndex + 1) / sentences.length) * 100}%`;

    const prev = document.getElementById('btnPrevSent');
    const next = document.getElementById('btnNextSent');
    prev.disabled = sentIndex === 0;
    next.innerText = sentIndex === sentences.length - 1 ? "Complete Level" : "Next ➡";
    next.onclick = sentIndex === sentences.length - 1 ? () => completeLevel(4, 100) : nextSentence;
}
function nextSentence() { if (sentIndex < sentences.length - 1) { sentIndex++; updateSentenceUI(); } }
function prevSentence() { if (sentIndex > 0) { sentIndex--; updateSentenceUI(); } }
function playSentenceAudio() { fetch(`/speak_sentence?text=${encodeURIComponent(sentences[sentIndex].text)}`); }


// ================= LEVEL 7: MATCH GAME =================
function initMatchGame() {
    matchGameState.score = 0;
    matchGameState.moves = 0;
    updateMatchScore();

    const signsCol = document.getElementById('game-signs');
    const wordsCol = document.getElementById('game-words');
    signsCol.innerHTML = ""; wordsCol.innerHTML = "";

    let pool = [...alphabets, ...numbers].sort(() => 0.5 - Math.random()).slice(0, 5);

    pool.forEach(item => {
        // Drop Zone
        const zone = document.createElement('div');
        zone.className = 'drop-zone card-media';
        zone.style.width = "120px"; zone.style.height = "120px";
        zone.style.border = "2px dashed #666"; zone.dataset.match = item;

        const img = document.createElement('img');
        img.src = getSignImage('Match', item);
        img.style.width = "100%"; img.style.height = "100%"; img.style.objectFit = "contain";
        zone.appendChild(img);

        zone.ondragover = e => e.preventDefault();
        zone.ondrop = e => {
            e.preventDefault();
            const data = e.dataTransfer.getData("text");
            if (data === zone.dataset.match) {
                zone.style.borderColor = "#22c55e";
                zone.innerHTML = `<div style="font-size:3rem; color:#22c55e;">✔</div>`;
                document.getElementById(`drag-${data}`).style.display = "none";
                matchGameState.score += 10;
                checkMatchWin();
            } else {
                zone.style.borderColor = "#ef4444";
                setTimeout(() => zone.style.borderColor = "#666", 500);
                matchGameState.score -= 2;
            }
            matchGameState.moves++;
            updateMatchScore();
        };
        signsCol.appendChild(zone);
    });

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    shuffled.forEach(item => {
        const word = document.createElement('div');
        word.id = `drag-${item}`;
        word.className = 'draggable-item btn btn-primary';
        word.innerText = item;
        word.draggable = true;
        word.ondragstart = e => e.dataTransfer.setData("text", item);
        word.style.margin = "10px";
        wordsCol.appendChild(word);
    });
}

function updateMatchScore() {
    document.getElementById('matchGameScore').innerText = matchGameState.score;
    document.getElementById('matchGameMoves').innerText = matchGameState.moves;
}

function checkMatchWin() {
    const remaining = document.querySelectorAll('.draggable-item[style*="display: none"]');
    if (remaining.length === 5) {
        setTimeout(() => completeLevel(5, matchGameState.score), 1000);
    }
}


// ================= LEVEL 8: SPEED RECOGNITION =================
function startSpeedGame() {
    speedGameState = { score: 0, currentIdx: 0, questions: [], active: true };
    document.getElementById('btnStartSpeed').style.display = 'none';

    // Generate 10 rounds
    for (let i = 0; i < 10; i++) {
        const ans = commonWords[Math.floor(Math.random() * commonWords.length)];
        let opts = [ans];
        while (opts.length < 4) {
            let r = commonWords[Math.floor(Math.random() * commonWords.length)];
            if (!opts.includes(r)) opts.push(r);
        }
        speedGameState.questions.push({ ans, opts: opts.sort(() => 0.5 - Math.random()) });
    }

    loadSpeedQuestion();
}

function loadSpeedQuestion() {
    if (!speedGameState.active) return;
    if (speedGameState.currentIdx >= 10) {
        endSpeedGame();
        return;
    }

    const q = speedGameState.questions[speedGameState.currentIdx];
    document.getElementById('speedMsgImg').src = getSignImage('Speed', q.ans);
    document.getElementById('speedScore').innerText = speedGameState.score;

    const optsDiv = document.getElementById('speedOptions');
    optsDiv.innerHTML = "";
    q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'speed-btn';
        btn.innerText = opt;
        btn.onclick = () => checkSpeedAnswer(opt, q.ans);
        optsDiv.appendChild(btn);
    });

    // Reset Timer
    speedGameState.timer = 5;
    document.getElementById('timeLeftDisplay').innerText = 5;
    const circle = document.getElementById('timerCircle');
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = 0;

    if (speedGameState.interval) clearInterval(speedGameState.interval);

    // Animate Timer
    setTimeout(() => {
        circle.style.transition = 'stroke-dashoffset 5s linear';
        circle.style.strokeDashoffset = 283;
    }, 50);

    speedGameState.interval = setInterval(() => {
        speedGameState.timer--;
        document.getElementById('timeLeftDisplay').innerText = speedGameState.timer;
        if (speedGameState.timer <= 0) {
            clearInterval(speedGameState.interval);
            speedGameState.currentIdx++;
            loadSpeedQuestion(); // Skip by timeout
        }
    }, 1000);
}

function checkSpeedAnswer(sel, cor) {
    clearInterval(speedGameState.interval);

    // Scoring logic
    if (sel === cor) {
        const bonus = speedGameState.timer > 3 ? 15 : 10;
        speedGameState.score += bonus;
    }

    speedGameState.currentIdx++;
    loadSpeedQuestion();
}

function endSpeedGame() {
    speedGameState.active = false;
    document.getElementById('speedMsgImg').src = "";
    document.getElementById('speedOptions').innerHTML = "<h3>Game Over! Score: " + speedGameState.score + "</h3>";
    document.getElementById('btnStartSpeed').style.display = 'block';
    if (speedGameState.score >= 50) completeLevel(6, speedGameState.score);
}


// ================= LEVEL 9: MEMORY GAME =================
function initMemoryGame() {
    const grid = document.getElementById('memoryGrid');
    grid.innerHTML = "";
    memoryState = { flipped: [], matchedPairs: 0, moves: 0, locked: false };
    document.getElementById('memMoves').innerText = 0;
    document.getElementById('memPairs').innerText = "0/6";

    // 6 pairs = 12 cards
    let items = [...alphabets].sort(() => 0.5 - Math.random()).slice(0, 6);
    let cards = [];
    items.forEach(item => {
        cards.push({ type: 'img', val: item });
        cards.push({ type: 'text', val: item });
    });
    cards.sort(() => 0.5 - Math.random());

    cards.forEach((card, idx) => {
        const el = document.createElement('div');
        el.className = 'memory-card';
        el.dataset.val = card.val;
        el.innerHTML = `
            <div class="memory-inner">
                <div class="memory-front">?</div>
                <div class="memory-back">
                    ${card.type === 'img' ? `<img src="${getSignImage('Mem', card.val)}">` : `<span>${card.val}</span>`}
                </div>
            </div>
        `;
        el.onclick = () => flipCard(el);
        grid.appendChild(el);
    });
}

function flipCard(card) {
    if (memoryState.locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    card.classList.add('flipped');
    memoryState.flipped.push(card);

    if (memoryState.flipped.length === 2) {
        memoryState.moves++;
        document.getElementById('memMoves').innerText = memoryState.moves;
        memoryState.locked = true;
        checkMemoryMatch();
    }
}

function checkMemoryMatch() {
    const [c1, c2] = memoryState.flipped;
    if (c1.dataset.val === c2.dataset.val) {
        c1.classList.add('matched');
        c2.classList.add('matched');
        memoryState.matchedPairs++;
        document.getElementById('memPairs').innerText = `${memoryState.matchedPairs}/6`;
        memoryState.flipped = [];
        memoryState.locked = false;
        if (memoryState.matchedPairs === 6) setTimeout(() => completeLevel(7, 100 - memoryState.moves), 1000);
    } else {
        setTimeout(() => {
            c1.classList.remove('flipped');
            c2.classList.remove('flipped');
            memoryState.flipped = [];
            memoryState.locked = false;
        }, 1000);
    }
}

// ================= LEVEL 10: PRACTICE LIBRARY =================
function initPracticeLibrary() {
    filterPractice('all');
}

function filterPractice(type) {
    const grid = document.getElementById('practiceGrid');
    grid.innerHTML = "";

    let items = [];
    if (type === 'all' || type === 'alpha') items.push(...alphabets.map(c => ({ c, t: 'Alphabet' })));
    if (type === 'all' || type === 'num') items.push(...numbers.map(c => ({ c, t: 'Number' })));
    if (type === 'all' || type === 'word') items.push(...commonWords.map(c => ({ c, t: 'Word' })));

    items.forEach(item => {
        grid.appendChild(createCard(item.c, item.t, 0));
    });

    // Mark buttons active
    document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
    // Simple mock logic for highlighting, just assume 'all' for now or match text
}


// ================= LEVEL 11: SENTENCE BUILDING =================
function initSentenceGame() {
    const target = sentences[Math.floor(Math.random() * sentences.length)];
    sentenceGameState.target = target;
    document.getElementById('targetSentText').innerText = `"${target.text}"`;

    const poolDiv = document.getElementById('sentPool');
    poolDiv.innerHTML = "";
    document.getElementById('sentDropZone').innerHTML = ""; // Clear drop zone

    // Create scrambled cards
    let parts = [...target.signs].sort(() => 0.5 - Math.random());
    parts.forEach(part => {
        const card = document.createElement('div');
        card.className = 'seq-card';
        card.draggable = true;
        card.dataset.val = part;
        card.innerHTML = `<img src="${getSignImage('Seq', part)}"><span>${part}</span>`;

        card.ondragstart = e => { e.dataTransfer.setData("text", part); e.dataTransfer.effectAllowed = "move"; };
        poolDiv.appendChild(card);
    });

    // Drop Zone Logic
    const zone = document.getElementById('sentDropZone');
    zone.ondragover = e => e.preventDefault();
    zone.ondrop = e => {
        e.preventDefault();
        const val = e.dataTransfer.getData("text");
        // Find the original card in pool (simplification)
        const cards = document.querySelectorAll('.seq-card');
        let draggedCard = null;
        cards.forEach(c => { if (c.dataset.val === val && c.parentElement === poolDiv) draggedCard = c; });

        if (draggedCard) {
            zone.appendChild(draggedCard);
        }
    };

    // Allow moving back to pool
    poolDiv.ondragover = e => e.preventDefault();
    poolDiv.ondrop = e => {
        e.preventDefault();
        const val = e.dataTransfer.getData("text");
        const cards = document.querySelectorAll('.seq-card');
        let draggedCard = null;
        cards.forEach(c => { if (c.dataset.val === val && c.parentElement === zone) draggedCard = c; });
        if (draggedCard) poolDiv.appendChild(draggedCard);
    }
}

function checkSentenceOrder() {
    const zone = document.getElementById('sentDropZone');
    const cards = zone.querySelectorAll('.seq-card');
    const userOrder = Array.from(cards).map(c => c.dataset.val);

    if (JSON.stringify(userOrder) === JSON.stringify(sentenceGameState.target.signs)) {
        alert("Correct! Great Job!");
        completeLevel(8, 100);
    } else {
        alert("Incorrect order. Try again!");
    }
}

// ================= LEVEL 12: ADVANCED QUIZ =================
function initAdvQuiz() {
    advQuizState.score = 0;
    advQuizState.currentIdx = 0;
    // Generate text-based options, Image question
    let pool = commonWords;
    advQuizState.questions = Array.from({ length: 10 }, () => {
        const ans = pool[Math.floor(Math.random() * pool.length)];
        let opts = [ans];
        while (opts.length < 4) {
            let r = pool[Math.floor(Math.random() * pool.length)];
            if (!opts.includes(r)) opts.push(r);
        }
        return { ans, opts: opts.sort(() => 0.5 - Math.random()) };
    });

    loadAdvQuestion();
}

function loadAdvQuestion() {
    if (advQuizState.currentIdx >= 10) {
        completeLevel(9, advQuizState.score * 10);
        return;
    }
    const q = advQuizState.questions[advQuizState.currentIdx];
    document.getElementById('advQuizProgress').innerText = `Question ${advQuizState.currentIdx + 1}/10`;
    document.getElementById('advQuizScore').innerText = `Score: ${advQuizState.score}`;
    document.getElementById('advQuizImg').src = getSignImage('Adv', q.ans);

    const grid = document.getElementById('advQuizOptions');
    grid.innerHTML = "";
    q.opts.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'quiz-option-btn';
        btn.innerText = opt;
        btn.onclick = () => {
            if (opt === q.ans) {
                btn.classList.add('correct');
                advQuizState.score++;
            } else {
                btn.classList.add('wrong');
            }
            document.getElementById('advQuizNextBtn').disabled = false;
        };
        grid.appendChild(btn);
    });
    document.getElementById('advQuizNextBtn').disabled = true;
}

function nextAdvQuestion() {
    advQuizState.currentIdx++;
    loadAdvQuestion();
}

// ================= LEVEL 13: CERTIFICATE =================
function initCertificate() {
    let total = Object.values(levelScores).reduce((a, b) => a + b, 0);
    document.getElementById('totalFinalScore').innerText = total;

    // RULE: If certificate already generated, do not allow generating again.
    // However, user can still see/download if the DOM was preserved, 
    // but here we are in a fresh view logic.
    // The requirement says: "Certificate must NOT be generated again for the same login session."
    // and "Learning must restart". 
    // If certGenerated is true, it means they looped back.
    if (certGenerated) {
        document.querySelector('.certificate-form').innerHTML = `
            <h3>Certificate Already Generated!</h3>
            <p>You have completed the course.</p>
            <p>Your previous score needs to be beaten to get a new one (Logic customizable).</p>
            <button class="btn btn-secondary" onclick="switchLevel(1)">Restart Learning ➡</button>
        `;
    }
}

function generateCertificate() {
    if (certGenerated) return; // Prevent double generation

    const name = document.getElementById('certNameInput').value;
    if (!name) { alert("Please enter your name!"); return; }

    // 1. Generate Content
    document.getElementById('certNameDisplay').innerText = name;
    document.getElementById('certScoreDisplay').innerText = document.getElementById('totalFinalScore').innerText;
    document.getElementById('certDate').innerText = new Date().toLocaleDateString();

    // 2. Mark as Generated & Reset Journey
    certGenerated = true; // Lock future generation
    // Keep scores? User said "Learning levels must RESET". Usually implies starting fresh.
    // "User should be able to re-learn from Level 1 again."
    maxUnlocked = 1;

    // Save strict state
    saveProgress();

    // 3. Print
    window.print();

    // 4. Force Reset View after print dialog closes (approximate)
    setTimeout(() => {
        alert("Certificate Generated! Your learning journey has been reset for practice.");
        location.reload(); // Refresh to enforce Level 1 state
    }, 1000);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', initLevels);
