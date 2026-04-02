// ── Global Anti-Zoom iOS Nuke ──
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 500 && e.target.tagName !== 'INPUT') {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

// ── Reset viewport scale on any touch (nuclear zoom fix) ──
const _metaViewport = document.querySelector('meta[name=viewport]');
document.addEventListener('touchend', () => {
    _metaViewport && _metaViewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover');
}, { passive: true });

// ── Preload known early-trigger images immediately ──
const _preloadedImages = [];
['images/first_mine.jpg', 'images/gold_license.jpg', 'images/tin_pan.jpg',
 'images/pickaxe.jpg', 'images/rebellion.jpg', 'images/jail.png'].forEach(src => {
    const img = new Image(); img.src = src; _preloadedImages.push(img);
});

// ── Data Loading ──
let historyData = {};
let dataLoaded = false;

fetch('sources.json')
    .then(r => r.json())
    .then(data => {
        historyData = data;
        dataLoaded = true;
        Object.values(data).forEach(item => {
            if (item.image && item.image !== '') {
                const img = new Image();
                img.src = item.image;
                _preloadedImages.push(img);
            }
        });
    })
    .catch(err => { console.warn('sources.json failed to load:', err); dataLoaded = true; });

// ── Game State ──
let totalPence = 0, gps = 0, timer = 30, isPaused = true, isResolving = false;
let nuggetMult = 1.0, status = 'digger', maxTimer = 30, skillProgress = 0;
let skillProgressBonus = 0;
let inJail = false, jailTimer = 0, preJailGps = 0, preJailMult = 0;
let jailCount = 0, strangerSpawned = false;
let jailFromRebellion = false;
let seenEvents = new Set();
let exCosts = { raid: 48000, patrol: 120000, tax: 48000, bill: 120000 };
let timerFlashed = false;
let postRebellion = false;
let playerOrigin = null;
let _gameWasPausedBeforeHide = true;
let gpsMultiplier = 1.0;
let isResetting = false; // Kill switch to prevent auto-saves during reset

// Welcome Stranger skill-max tracking
let _skillMaxTriggered = false;

// ── Streaming Audio ──
const bgMusic      = new Audio('audio/background.mp3'); bgMusic.volume  = 0.4;
const victoryMusic = new Audio('audio/victory.mp3');    victoryMusic.volume = 0.6;
const jailMusic    = new Audio('audio/jail.mp3');       jailMusic.volume = 0.5;
const lossAudio    = new Audio('audio/loss.mp3');       lossAudio.volume = 0.6;
const tapAudio     = new Audio('audio/tap.mp3');        tapAudio.volume  = 1.0;
const popAudio     = new Audio('audio/pop.mp3');        popAudio.volume  = 1.0;
const warAudio     = new Audio('audio/war.mp3');        warAudio.volume  = 0.6;
const eventAudio   = new Audio('audio/event.mp3');      eventAudio.volume = 0.7;

bgMusic.loop   = true;
jailMusic.loop = true;
warAudio.loop  = true;

const allAudio = [bgMusic, victoryMusic, jailMusic, lossAudio, tapAudio, popAudio, warAudio, eventAudio];
let musicMuted = false;
let _audioUnlocked = false;

// ── Web Audio API Engine ──
let _audioCtx = null;
let _tapBuffer = null;
let _popBuffer = null;

function initWebAudio() {
    if (_audioUnlocked) return;
    _audioUnlocked = true;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
        _audioCtx = new AudioContextClass();

        const silentBuf = _audioCtx.createBuffer(1, 1, 22050);
        const silentSrc = _audioCtx.createBufferSource();
        silentSrc.buffer = silentBuf;
        silentSrc.connect(_audioCtx.destination);
        silentSrc.start(0);
        if (_audioCtx.state === 'suspended') _audioCtx.resume();

        fetch('audio/tap.mp3')
            .then(r => r.arrayBuffer())
            .then(arr => _audioCtx.decodeAudioData(arr, buf => _tapBuffer = buf))
            .catch(e => console.warn('Tap audio load failed', e));

        fetch('audio/pop.mp3')
            .then(r => r.arrayBuffer())
            .then(arr => _audioCtx.decodeAudioData(arr, buf => _popBuffer = buf))
            .catch(e => console.warn('Pop audio load failed', e));
    }

    bgMusic.muted = musicMuted;
    bgMusic.play().catch(() => {});
}

document.addEventListener('touchstart', initWebAudio, { once: true, passive: true });
document.addEventListener('click',      initWebAudio, { once: true, passive: true });

function _playBuf(buf, vol) {
    if (!buf || !_audioCtx || musicMuted) return;
    try {
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        const src  = _audioCtx.createBufferSource();
        src.buffer = buf;
        const gain = _audioCtx.createGain();
        gain.gain.value = vol;
        src.connect(gain);
        gain.connect(_audioCtx.destination);
        src.start(0);
    } catch (e) {}
}

function playTap() {
    if (musicMuted) return;
    if (_tapBuffer && _audioCtx) {
        _playBuf(_tapBuffer, 1.0);
    } else {
        tapAudio.currentTime = 0; tapAudio.play().catch(() => {});
    }
}

function playPop() {
    if (musicMuted) return;
    if (_popBuffer && _audioCtx) {
        _playBuf(_popBuffer, 1.2);
    } else {
        popAudio.currentTime = 0; popAudio.play().catch(() => {});
    }
}

function toggleMute() {
    musicMuted = !musicMuted;
    allAudio.forEach(a => a.muted = musicMuted);
    document.getElementById('mute-btn').innerText = musicMuted ? '🔇' : '🔊';
}

// ── Visibility Change ──
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        _gameWasPausedBeforeHide = isPaused;
        isPaused = true;
        bgMusic.pause();
        warAudio.pause();
        jailMusic.pause();
        saveGame();
    } else {
        isPaused = _gameWasPausedBeforeHide;
        if (!musicMuted && !isPaused) {
            if (inJail) jailMusic.play().catch(() => {});
            else bgMusic.play().catch(() => {});
        }
    }
});

// ── Random Event System ──
let randomEventTimer = Math.random() * 15 + 30;

// ── Outcome style lookup ──
const _outcomeStyles = {
    good:    { borderColor: '#00cc66', titleColor: '#00cc66', icon: '✅' },
    bad:     { borderColor: '#ff4444', titleColor: '#ff4444', icon: '❌' },
    neutral: { borderColor: '#ff8800', titleColor: '#ff8800', icon: '⚠️' }
};

function triggerEvent(eventKey, callback, isRandom = false) {
    if (seenEvents.has(eventKey)) { if (callback) callback(); return; }
    if (!dataLoaded) { setTimeout(() => triggerEvent(eventKey, callback, isRandom), 300); return; }

    if (historyData[eventKey]) {
        seenEvents.add(eventKey);
        const wasPaused = isPaused;
        isPaused = true;
        const data = historyData[eventKey];

        if (isRandom && !musicMuted) {
            eventAudio.currentTime = 0;
            eventAudio.play().catch(() => {});
        }

        let buttons = [];

        if (isRandom && data.choices) {
            buttons = data.choices.map(choice => ({
                text: choice.btn_text,
                color: choice.color || "#00aaff",
                action: (e) => {
                    playTap();
                    if (choice.effect.type === 'wealth_pct') {
                        totalPence = Math.max(0, totalPence * choice.effect.value);
                    } else if (choice.effect.type === 'wealth_flat') {
                        totalPence = Math.max(0, totalPence + choice.effect.value);
                    } else if (choice.effect.type === 'connections_pct') {
                        gps = Math.max(0, gps * choice.effect.value);
                    } else if (choice.effect.type === 'timer_add') {
                        const newTimer = timer + choice.effect.value;
                        if (newTimer <= 0) {
                            timer = 0;
                            update();
                            document.getElementById('custom-modal-overlay').style.display = 'none';
                            isPaused = wasPaused;
                            sendToJail("The delay cost you your remaining license time");
                            return;
                        }
                        timer = newTimer;
                    }

                    update();
                    document.getElementById('custom-modal-overlay').style.display = 'none';

                    if (choice.outcome_text) {
                        const outcomeType = choice.outcome_type || 'neutral';
                        const outcomeStyle = _outcomeStyles[outcomeType] || _outcomeStyles.neutral;

                        showChoiceModal(
                            outcomeStyle.icon + " OUTCOME",
                            choice.outcome_text,
                            [{
                                text: "CONTINUE",
                                color: "#00aaff",
                                action: () => {
                                    document.getElementById('custom-modal-overlay').style.display = 'none';
                                    isPaused = wasPaused;
                                    if (!inJail && bgMusic.paused && !musicMuted && !postRebellion && !jailFromRebellion) bgMusic.play().catch(() => {});
                                    if (callback) callback();
                                }
                            }],
                            data,
                            0,
                            outcomeStyle
                        );
                    } else {
                        isPaused = wasPaused;
                        if (!inJail && bgMusic.paused && !musicMuted && !postRebellion && !jailFromRebellion) bgMusic.play().catch(() => {});
                        if (callback) callback();
                    }
                }
            }));
        } else {
            buttons = [{
                text: "CONTINUE",
                color: "#00aaff",
                action: (e) => {
                    playTap();
                    document.getElementById('custom-modal-overlay').style.display = 'none';
                    isPaused = wasPaused;
                    if (!inJail && bgMusic.paused && !musicMuted && !postRebellion && !jailFromRebellion) bgMusic.play().catch(() => {});
                    if (callback) callback();
                }
            }];
        }

        showChoiceModal(data.title || "HISTORICAL CONTEXT", data.info, buttons, data, isRandom ? 900 : 0);
    } else {
        if (callback) callback();
    }
}

const upgrades = {
    pan:      { cost: 120,   power: 5,    mult: 1.0,   label: 'Tin Pan',          id: 'buy-pan' },
    pickaxe:  { cost: 180,   power: 10,   mult: 2.0,   label: 'Pickaxe',          id: 'buy-pickaxe' },
    cradle:   { cost: 720,   power: 45,   mult: 6.0,   label: 'Cradle',           id: 'buy-cradle' },
    puddling: { cost: 10800, power: 800,  mult: 40.0,  label: 'Puddling Machine', id: 'buy-puddling' }
};

function formatCurrency(p) {
    p = Math.floor(p);
    if (p < 12) return p + "d";
    if (p < 240) return (p / 12).toFixed(1) + "s";
    return "£" + (p / 240).toFixed(2);
}

function createConfetti(x, y) {
    for (let i = 0; i < 8; i++) {
        const c = document.createElement('div');
        c.className = 'confetti'; c.style.left = x + 'px'; c.style.top = y + 'px';
        document.body.appendChild(c);
        const angle = Math.random() * Math.PI * 2, vel = 3 + Math.random() * 5;
        let px = x, py = y, op = 1;
        const anim = setInterval(() => {
            px += Math.cos(angle) * vel; py += Math.sin(angle) * vel + 2;
            op -= 0.04; c.style.left = px + 'px'; c.style.top = py + 'px'; c.style.opacity = op;
            if (op <= 0) { clearInterval(anim); c.remove(); }
        }, 20);
    }
}

let _updateScheduled = false;
function scheduleUpdate() {
    if (_updateScheduled) return;
    _updateScheduled = true;
    requestAnimationFrame(() => {
        _updateScheduled = false;
        update();
    });
}

function update() {
    document.getElementById('wealth-display').innerText = formatCurrency(totalPence);

    let actualGps = gps * gpsMultiplier;
    document.getElementById('gps-display').innerText = actualGps < 12 ? Math.floor(actualGps) + "d" : (actualGps / 12).toFixed(1) + "s";
    document.getElementById('mult-display').innerText = nuggetMult.toFixed(1);

    if (!inJail) {
        document.getElementById('timer-count').innerText = Math.ceil(timer);
        if (!postRebellion) {
            document.getElementById('timer-label').innerText = "LICENSE CHECK IN:";
        } else {
            if (status === 'politician') document.getElementById('timer-label').innerText = "VOTE IN:";
            else if (status === 'police') document.getElementById('timer-label').innerText = "PATROL IN:";
            else if (status === 'merchant') document.getElementById('timer-label').innerText = "SELL IN:";
        }
    } else {
        document.getElementById('timer-count').innerText = Math.ceil(jailTimer);
        document.getElementById('timer-label').innerText = "SENTENCE REMAINING:";
    }

    const timerBanner = document.getElementById('timer-banner');
    if (!inJail && timer <= 10 && !timerFlashed) {
        timerFlashed = true;
        timerBanner.classList.add('timer-urgent');
        setTimeout(() => timerBanner.classList.remove('timer-urgent'), 900);
    } else if (inJail || timer > 10) {
        timerFlashed = false;
    }

    let connectionsProgress = (actualGps / 12000) * 100;
    let efficiencyProgress = (nuggetMult / 1000) * 100;
    skillProgress = Math.min(100, Math.max(connectionsProgress, efficiencyProgress) + skillProgressBonus);

    document.getElementById('survey-fill').style.width = skillProgress + "%";

    if (skillProgress >= 100 && !_skillMaxTriggered && !isPaused && !isResolving && !inJail) {
        _skillMaxTriggered = true;
        document.getElementById('survey-fill').classList.add('skill-maxed');
        const label = document.getElementById('stranger-label');
        if (label) label.classList.add('stranger-label-active');
    }

    if ((actualGps >= 12000 || nuggetMult >= 1000) && !strangerSpawned && !inJail && !isPaused && !isResolving) {
        strangerSpawned = true;
        bgMusic.pause();
        if (!musicMuted) { victoryMusic.currentTime = 0; victoryMusic.play().catch(() => {}); }

        isPaused = true;
        isResolving = true;

        const toast = document.createElement('div');
        toast.id = 'skill-max-toast';
        toast.innerHTML = '⭐ MINING SKILL MAXED!<br><span style="font-size:10px; color:#ccc; font-weight:normal;">The Welcome Stranger awaits...</span>';
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
            spawnWelcomeStranger();
        }, 2600);
    }

    for (let key in upgrades) {
        let btn = document.getElementById(upgrades[key].id);
        if (btn) {
            let actualCost = upgrades[key].cost;
            btn.innerText = `${upgrades[key].label} (${formatCurrency(actualCost)})`;
            btn.disabled = inJail || (totalPence < actualCost);
        }
    }
    if (status === 'digger' && document.getElementById('rebel-btn')) {
        document.getElementById('rebel-btn').disabled = inJail || (totalPence < 24000);
    }
    
    const licenseBtn = document.getElementById('buy-license');
    if (licenseBtn) {
        licenseBtn.disabled = inJail || (totalPence < 360);
        if (postRebellion) {
            if (status === 'politician') licenseBtn.innerText = "VOTE (£1.5)";
            else if (status === 'police') licenseBtn.innerText = "PATROL (£1.5)";
            else if (status === 'merchant') licenseBtn.innerText = "SELL (£1.5)";
        } else {
            licenseBtn.innerText = "Renew License (£1.5)";
        }
    }

    const cb1 = document.getElementById('career-btn-1');
    const cb2 = document.getElementById('career-btn-2');
    if (cb1) cb1.disabled = inJail || (totalPence < (status === 'police' ? exCosts.raid : exCosts.tax));
    if (cb2) cb2.disabled = inJail || (totalPence < (status === 'police' ? exCosts.patrol : exCosts.bill));
}

function spawnWelcomeStranger() {
    const ws = document.createElement('div');
    ws.id = 'welcome-stranger-widget';
    ws.innerHTML = `
        <span class="ws-nugget">💰</span>
        <div class="ws-title">THE WELCOME STRANGER</div>
        <div class="ws-subtitle">72kg — Australia's largest gold nugget ever found<br>Your mining skill unlocked it</div>
        <div class="ws-cta">TAP TO CLAIM YOUR FORTUNE!</div>
    `;

    function claimStranger(clientX, clientY) {
        ws.remove();
        for (let i = 0; i < 5; i++) {
            setTimeout(() => createConfetti(clientX, clientY), i * 80);
        }
        triggerEvent('welcome_stranger', () => {
            isPaused = true; isResolving = true;
            showChoiceModal(
                "MONUMENTAL STRIKE! THE VICTORIOUS ENDING",
                "You discovered the Welcome Stranger 🎉🎉🎉\n\nJust 3cm below the surface — a single mining trip led you to the biggest gold nugget EVER found: 72kg of pure gold, worth ~£10,000 (~$4,000,000 AUD today).\n\nYou are rich beyond anything this game can measure. Your mining skill, honed through every pick swing and cradle rock, is what made it possible.\n\nYou spend the rest of your days in glory.\n\nThanks for playing — hope it was fun/A-worthy :)",
                [{ text: "PLAY AGAIN", color: "#00aaff", action: () => resetGame(true) }]
            );
        });
    }

    ws.addEventListener('touchstart', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        claimStranger(ev.touches[0].clientX, ev.touches[0].clientY);
    }, { passive: false });

    ws.addEventListener('pointerdown', (ev) => {
        if (ev.pointerType === 'touch') return; 
        ev.stopPropagation();
        claimStranger(ev.clientX, ev.clientY);
    });

    document.body.appendChild(ws);
}

const rock = document.getElementById('rock');
let _bounceTimeout = null;

function mine(e) {
    if (isPaused || isResolving) return;
    playTap();

    triggerEvent('first_mine', () => {
        totalPence += nuggetMult;

        rock.classList.add('rock-bounce');
        clearTimeout(_bounceTimeout);
        _bounceTimeout = setTimeout(() => {
            rock.classList.remove('rock-bounce');
        }, 80);

        scheduleUpdate();
    });
}

rock.addEventListener('touchstart', (e) => { e.preventDefault(); mine(e); }, { passive: false });
rock.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') mine(e); });

setInterval(() => {
    if (isPaused || isResolving) return;
    const sn = document.createElement('div');
    sn.className = 'small-nugget';
    sn.style.top = (15 + Math.random() * 70) + "vh";
    sn.style.left = "-60px";
    sn.onpointerdown = (e) => {
        e.stopPropagation();
        playPop();
        totalPence += ((gps * gpsMultiplier) * 10) + (nuggetMult * 20);
        createConfetti(e.clientX, e.clientY);
        sn.remove(); update();
    };
    document.body.appendChild(sn);
    setTimeout(() => { if (sn.parentNode) sn.remove(); }, 15000);
}, 15000);

function selectOrigin(origin) {
    if (document.getElementById('intro-overlay').style.display === 'none') return;

    playTap();
    playerOrigin = origin;
    document.getElementById('intro-overlay').style.display = 'none';

    if (origin === 'britain') { totalPence += 1200; nuggetMult *= 0.5; }
    else if (origin === 'california') { maxTimer = 25; timer = 25; skillProgressBonus = 12.5; }
    else if (origin === 'china') { nuggetMult *= 1.5; }
    else if (origin === 'local') { gpsMultiplier = 1.25; }

    if (!musicMuted && bgMusic.paused) bgMusic.play().catch(() => {});

    isPaused = false;
    update();
}

function buyUpgrade(type) {
    if (inJail) return;
    let u = upgrades[type];
    if (totalPence >= u.cost) {
        playTap();
        triggerEvent('buy_' + type, () => {
            totalPence -= u.cost; gps += u.power; nuggetMult += u.mult;
            u.cost = Math.floor(u.cost * 1.5); update();
            saveGame();
        });
    }
}

function buyLicense() {
    if (totalPence >= 360 && !inJail) {
        playTap();
        if (!postRebellion) {
            triggerEvent('buy_license', () => {
                totalPence -= 360; timer = maxTimer; timerFlashed = false; update();
                saveGame();
            });
        } else {
            totalPence -= 360; timer = maxTimer; timerFlashed = false; update();
            saveGame();
        }
    }
}

const oathTarget = "WE SWEAR BY THE SOUTHERN CROSS TO STAND TRULY BY EACH OTHER AND FIGHT TO DEFEND OUR RIGHTS AND LIBERTIES";

function startRebellion() {
    if (totalPence < 24000 || inJail) return;
    playTap();
    bgMusic.pause();
    if (!musicMuted) { warAudio.currentTime = 0; warAudio.play().catch(() => {}); }

    triggerEvent('rebellion', () => {
        showOathModal();
    });
}

function showOathModal() {
    isPaused = true; isResolving = true;
    const overlay = document.getElementById('oath-modal-overlay');
    const container = document.getElementById('oath-text-container');
    const input = document.getElementById('oath-input');
    const confirmBtn = document.getElementById('oath-confirm-btn');

    overlay.style.display = 'flex';
    confirmBtn.style.display = 'none';

    if (historyData['oath']) document.getElementById('oath-source').innerHTML =
        `Source: <a href="${historyData['oath'].link}" target="_blank">${historyData['oath'].source}</a>`;
    container.innerHTML = oathTarget.split('').map(char => `<span style="color: #555;">${char}</span>`).join('');

    input.value = '';
    input.readOnly = false;
    overlay.getBoundingClientRect();
    input.focus();
    
    setTimeout(() => {
        input.focus();
    }, 100);

    input.oninput = (e) => {
        const typed = input.value.toUpperCase();
        let matchLen = 0;
        for (let i = 0; i < typed.length; i++) {
            if (typed[i] === oathTarget[i]) matchLen++;
            else break;
        }
        input.value = oathTarget.substring(0, matchLen);
        const spans = container.querySelectorAll('span');
        for (let i = 0; i < oathTarget.length; i++) {
            spans[i].style.color = i < matchLen ? '#ffd700' : '#555';
            spans[i].style.textShadow = i < matchLen ? '0 0 5px rgba(255, 215, 0, 0.5)' : 'none';
        }
        if (matchLen === oathTarget.length) {
            input.oninput = null;
            input.blur();
            confirmBtn.style.display = 'block';
            confirmBtn.onpointerdown = () => {
                playTap();
                overlay.style.display = 'none';
                executeRebellionBattle();
            };
        }
    };
}

function executeRebellionBattle() {
    totalPence -= 24000; update();
    isResolving = true; isPaused = true;
    document.body.classList.add('battle-bg');

    const bl = document.getElementById('battle-layer');
    bl.style.display = 'flex'; bl.innerHTML = '';
    void bl.offsetWidth; bl.classList.add('active');

    for (let i = 0; i < 15; i++) {
        const s = document.createElement('div'); s.className = 'waving-sword'; s.innerText = '⚔️';
        s.style.position = 'absolute';
        s.style.left = ((i / 15) * 100) + '%';
        s.style.bottom = '10px';
        s.style.animationDelay = (Math.random() * -2) + 's';
        s.style.animationDuration = (1.2 + Math.random() * 1.5) + 's';
        s.style.fontSize = (40 + Math.random() * 35) + 'px';
        bl.appendChild(s);
    }

    setTimeout(() => {
        document.getElementById('eureka-flag').classList.add('raised');
        setTimeout(() => {
            bl.classList.remove('active');
            setTimeout(() => {
                bl.style.display = 'none';
                document.getElementById('eureka-flag').classList.remove('raised');
                sendToJail("Rebellion Crushed", true);
            }, 800);
        }, 6000);
    }, 500);
    saveGame();
}

function sendToJail(reason, fromRebellion = false) {
    bgMusic.pause();
    warAudio.pause();
    warAudio.currentTime = 0;
    if (!musicMuted) {
        lossAudio.currentTime = 0; lossAudio.play().catch(() => {});
        jailMusic.currentTime = 0; jailMusic.play().catch(() => {});
    }

    if (!fromRebellion) {
        jailCount++;
        if (jailCount > 2) {
            isPaused = true; isResolving = true;
            jailMusic.pause();
            jailMusic.currentTime = 0;
            showChoiceModal("HANGED AT DAWN", "You have been arrested three times on the Ballarat goldfields 💀\n\nThe courts, scared of your persistent defiance, has now sentenced you to be hanged! You neck was squeezed, you couldn't breathe, and you are now dead.\n\nA stupid fate for an individual miner trying to fight against an entire colony (or just a forgetful/broke one). Either way, this is where your story ends.", [{ text: "RESTART", color: "#ff4444", action: () => resetGame(true) }]);
            return;
        }
    }

    isResolving = false; isPaused = true;
    inJail = true; jailTimer = 15; jailFromRebellion = fromRebellion;
    preJailGps = gps; preJailMult = nuggetMult;
    gps = 0; nuggetMult = 0.1;

    document.body.classList.remove('battle-bg');
    document.getElementById('battle-layer').style.display = 'none';
    document.body.classList.add('body-jail');

    document.getElementById('timer-banner').classList.add('jail-bg');
    document.querySelector('.ledger-box').classList.add('jail-bg');
    document.getElementById('rock').classList.add('jail-bg');
    document.getElementById('shop-panel').classList.add('shop-disabled');
    document.getElementById('career-title').innerText = "Status: IN JAIL (" + reason + ")";
    document.getElementById('career-title').style.color = "#ff4444";

    const msg = fromRebellion
        ? `Reason: ${reason}\n\n Waking up at dawn on the 3rd of December 1854. The sun, and hundreds of British troops are crowding your vision. It's Sunday, but they still decided to attack :( so you and your 'sworn comrades' are now, with resistence, dragged before the Melbourne courts. HIGH TREASON against THE Crown, historically punishable by death, is a fate looking all too plausible to you.\n\nBut hey, thousands of citizens are defending you, shocked (🤨), by the actions of the government. The public defiance is overwhelming and even fortelling...?\n\nWait for the outcome.`
        : `Reason: ${reason}\n\nYou have been jailed for 15 seconds. While you're imprisoned:\n\n• Efficiency reduced to 0.1x\n• Connections halted\n• Mining skill frozen\n• Shop closed`;

    showChoiceModal("ARRESTED!", msg, [{
        text: "SERVE SENTENCE",
        color: "#ff4444",
        action: () => {
            if (!fromRebellion) {
                triggerEvent('jail', () => { document.getElementById('custom-modal-overlay').style.display = 'none'; isPaused = false; });
            } else {
                document.getElementById('custom-modal-overlay').style.display = 'none'; isPaused = false;
            }
        }
    }]);

    update();
    saveGame();
}

function triggerSetFree() {
    jailFromRebellion = false; inJail = false; isPaused = true;
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.body.classList.add('glitch-effect');

    jailMusic.pause();
    jailMusic.currentTime = 0;
    if (!musicMuted) { victoryMusic.currentTime = 0; victoryMusic.play().catch(() => {}); }

    const flash = document.createElement('div');
    flash.id = 'freedom-flash';
    flash.innerHTML = `⚖️<br><br>NOT GUILTY<br><br>DA PEOPLE<br>HAVE SPOKEN<br><br>ALL CHARGES<br>NOW DROPPED<br><br>⚖️?`;
    document.body.appendChild(flash);

    setTimeout(() => {
        document.body.classList.remove('glitch-effect');
        flash.remove();

        triggerEvent('set_free', () => {
            releaseFromJail();
            setupPathwayChoice();
        });
    }, 3000);
}

function releaseFromJail() {
    inJail = false; gps = preJailGps; nuggetMult = preJailMult; timer = maxTimer; timerFlashed = false;
    document.body.classList.remove('body-jail');

    jailMusic.pause();
    jailMusic.currentTime = 0;

    if (!musicMuted && !isPaused) {
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => {});
    }

    document.getElementById('timer-banner').classList.remove('jail-bg');
    document.querySelector('.ledger-box').classList.remove('jail-bg');
    document.getElementById('rock').classList.remove('jail-bg');
    document.getElementById('shop-panel').classList.remove('shop-disabled');
    document.getElementById('career-title').innerText = "Status: " + status.charAt(0).toUpperCase() + status.slice(1);
    document.getElementById('career-title').style.color = "#00aaff";
    update();
}

function showChoiceModal(title, text, buttons, optionalHistoryData = null, buttonDelay = 0, style = {}) {
    isPaused = true;
    const choiceBox = document.getElementById('choice-box');
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');

    choiceBox.innerHTML = '';
    choiceBox.style.display = 'flex';

    modal.style.borderColor = style.borderColor || '#ffd700';
    modalTitle.style.color  = style.titleColor  || '#ffd700';
    modalTitle.innerText = title;

    document.getElementById('modal-text').innerText = text;
    const mImg = document.getElementById('modal-img');
    const mSrc = document.getElementById('modal-source');

    if (optionalHistoryData && optionalHistoryData.image) {
        mImg.src = optionalHistoryData.image;
        mImg.style.display = 'block';
        mSrc.innerHTML = optionalHistoryData.link
            ? `Source: <a href="${optionalHistoryData.link}" target="_blank">${optionalHistoryData.source}</a>`
            : "Source: " + (optionalHistoryData.source || '');
    } else {
        mImg.style.display = 'none';
        mSrc.innerHTML = optionalHistoryData
            ? (optionalHistoryData.link
                ? `Source: <a href="${optionalHistoryData.link}" target="_blank">${optionalHistoryData.source}</a>`
                : "Source: " + (optionalHistoryData.source || ''))
            : "";
    }

    if (buttonDelay > 0) {
        const sourceLink = mSrc.querySelector('a');
        if (sourceLink) {
            sourceLink.style.pointerEvents = 'none'; 
            sourceLink.style.opacity = '0.6'; 
            
            setTimeout(() => {
                sourceLink.style.pointerEvents = 'auto'; 
                sourceLink.style.opacity = '1'; 
            }, buttonDelay);
        }
    }

    document.getElementById('modal-btn').style.display = 'none';

    buttons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.innerText = btnConfig.text;
        btn.style.width = '100%';
        btn.style.padding = '15px';
        btn.style.fontSize = '14px';
        btn.style.color = 'white';
        btn.style.background = btnConfig.color || '#00aaff';
        btn.style.border = '1px solid #fff';

        btn.onpointerdown = (e) => {
            playTap();
            btnConfig.action(e);
        };

        if (buttonDelay > 0) {
            btn.disabled = true;
            setTimeout(() => { btn.disabled = false; }, buttonDelay);
        }

        choiceBox.appendChild(btn);
    });

    document.getElementById('custom-modal-overlay').style.display = 'flex';
}

function setupPathwayChoice() {
    status = 'citizen';
    let text, buttons;

    if (playerOrigin === 'china') {
        text = "The verdict is out, and you're a free man/woman. However, discriminatory, colonial laws strictly prevent you from the parliamentry office or the police force.\n\nSoo your options are limited. Do you risk returning home to your family, or become a Ballarat merchant?";
        buttons = [
            { text: "BECOME A MERCHANT (Balanced Stats)", color: "#ff8800", action: () => setCareer('merchant') },
            { text: "RETURN HOME (Peaceful Life)", color: "#555", action: () => setCareer('home') }
        ];
    } else {
        text = "The verdict.. you are now free! The victory spreads across the colony. Thanks to the newly established Miner's Right, the brutal license checks are gone forever.\n\nYou're famous, respected, but pretty broke. How will you work for your colony, and your hungry stomach?";
        buttons = [
            { text: "POLICE FORCE (Efficiency)", color: "#0044ff", action: () => setCareer('police') },
            { text: "PARLIAMENT (Connections)", color: "#00cc66", action: () => setCareer('politician') }
        ];
    }

    showChoiceModal("CHOOSE YOUR PATH", text, buttons);
}

function buildCareerUI(type) {
    const shop = document.getElementById('shop-ui');
    if (document.getElementById('rebel-btn')) document.getElementById('rebel-btn').remove();
    if (document.getElementById('career-btn-1')) document.getElementById('career-btn-1').remove();
    if (document.getElementById('career-btn-2')) document.getElementById('career-btn-2').remove();

    const b1 = document.createElement('button'); const b2 = document.createElement('button');
    b1.id = 'career-btn-1'; b2.id = 'career-btn-2';

    if (type === 'merchant') {
        b1.style.gridColumn = 'span 1'; b1.style.background = '#ff8800'; b1.style.color = 'white';
        b1.innerText = `TRADE GOODS (${formatCurrency(Math.floor(exCosts.tax))})`;
        b1.onpointerdown = () => { if (totalPence >= Math.floor(exCosts.tax) && !inJail) { playTap(); triggerEvent('trade_goods', () => { totalPence -= Math.floor(exCosts.tax); gps += 400; nuggetMult += 20; exCosts.tax = Math.floor(exCosts.tax * 1.5); b1.innerText = `TRADE GOODS (${formatCurrency(Math.floor(exCosts.tax))})`; update(); }); } };
        b2.style.gridColumn = 'span 1'; b2.style.background = '#ff8800'; b2.style.color = 'white';
        b2.innerText = `EXPAND MARKET (${formatCurrency(Math.floor(exCosts.bill))})`;
        b2.onpointerdown = () => { if (totalPence >= Math.floor(exCosts.bill) && !inJail) { playTap(); triggerEvent('expand_market', () => { totalPence -= Math.floor(exCosts.bill); gps += 1200; nuggetMult += 80; exCosts.bill = Math.floor(exCosts.bill * 1.5); b2.innerText = `EXPAND MARKET (${formatCurrency(Math.floor(exCosts.bill))})`; update(); }); } };
    } else if (type === 'police') {
        b1.className = 'btn-police'; b1.style.gridColumn = 'span 1'; b1.innerText = `RAID CLAIM (${formatCurrency(exCosts.raid)})`;
        b1.onpointerdown = () => { if (totalPence >= exCosts.raid && !inJail) { playTap(); triggerEvent('police_raid', () => { totalPence -= exCosts.raid; nuggetMult += 80; exCosts.raid = Math.floor(exCosts.raid * 1.5); b1.innerText = `RAID CLAIM (${formatCurrency(exCosts.raid)})`; update(); }); } };
        b2.className = 'btn-police'; b2.style.gridColumn = 'span 1'; b2.innerText = `BORDER PATROL (${formatCurrency(exCosts.patrol)})`;
        b2.onpointerdown = () => { if (totalPence >= exCosts.patrol && !inJail) { playTap(); triggerEvent('police_patrol', () => { totalPence -= exCosts.patrol; nuggetMult += 300; exCosts.patrol = Math.floor(exCosts.patrol * 1.5); b2.innerText = `BORDER PATROL (${formatCurrency(exCosts.patrol)})`; update(); }); } };
    } else {
        b1.className = 'btn-politician'; b1.style.gridColumn = 'span 1'; b1.innerText = `TAX REFORM (${formatCurrency(exCosts.tax)})`;
        b1.onpointerdown = () => { if (totalPence >= exCosts.tax && !inJail) { playTap(); triggerEvent('pol_tax', () => { totalPence -= exCosts.tax; gps += 1200; exCosts.tax = Math.floor(exCosts.tax * 1.5); b1.innerText = `TAX REFORM (${formatCurrency(exCosts.tax)})`; update(); }); } };
        b2.className = 'btn-politician'; b2.style.gridColumn = 'span 1'; b2.innerText = `PASS BILL (${formatCurrency(exCosts.bill)})`;
        b2.onpointerdown = () => { if (totalPence >= exCosts.bill && !inJail) { playTap(); triggerEvent('pol_bill', () => { totalPence -= exCosts.bill; gps += 3500; exCosts.bill = Math.floor(exCosts.bill * 1.5); b2.innerText = `PASS BILL (${formatCurrency(exCosts.bill)})`; update(); }); } };
    }
    shop.appendChild(b1); shop.appendChild(b2);
}

function setCareer(type) {
    playTap();

    if (type === 'home') {
        document.getElementById('custom-modal-overlay').style.display = 'none';
        isPaused = true; isResolving = true;
        bgMusic.pause();
        if (!musicMuted) { victoryMusic.currentTime = 0; victoryMusic.play().catch(() => {}); }
        showChoiceModal("THE PEACEFUL ENDING", "You chose to return home to your family in China :) They're happy to see you and with your gold, you start a small, pickaxe business, escaping poverty. You're not a cool politician, brutal policeman, or finder to the biggest gold nugget to exist but that's okay! You lived the rest of your humble life in peace, but still always wondering what could've been.\n\nYour journey to Ballarat has finished here.", [{ text: "PLAY AGAIN", color: "#00aaff", action: () => resetGame(true) }]);
        return;
    }

    status = type; maxTimer = 30; timer = maxTimer;
    document.getElementById('career-title').innerText = "Status: " + type.toUpperCase();
    document.getElementById('custom-modal-overlay').style.display = 'none';

    postRebellion = true;

    buildCareerUI(type);

    isPaused = false; update();
    if (!inJail && bgMusic.paused && !musicMuted) bgMusic.play().catch(() => {});
    saveGame();
}

// ── Save / Load System ──
function resetGame(force = false) {
    // If 'force' is true (e.g., clicking "TRY AGAIN" on a game over screen), bypass the prompt
    if (force) {
        isResetting = true; // Block incoming saves
        localStorage.removeItem('eurekaRichSave');
        location.reload();
        return;
    }

    // Capture the current pause state so we can restore it if they cancel
    const wasPaused = isPaused;
    
    // Use the game's native modal system for the warning
    showChoiceModal(
        "RESET PROGRESS?",
        "Are you sure you want to completely reset your game?\n\nAll your wealth, upgrades, and history will be permanently lost.",
        [
            { 
                text: "YES, RESET EVERYTHING", 
                color: "#ff4444", 
                action: () => {
                    playTap();
                    isResetting = true; // Block incoming saves
                    localStorage.removeItem('eurekaRichSave');
                    location.reload();
                } 
            },
            { 
                text: "CANCEL", 
                color: "#555", 
                action: () => {
                    playTap();
                    document.getElementById('custom-modal-overlay').style.display = 'none';
                    isPaused = wasPaused;
                    
                    // Safely resume background music if applicable
                    if (!isPaused && !inJail && bgMusic.paused && !musicMuted && !postRebellion && !jailFromRebellion) {
                        bgMusic.play().catch(() => {});
                    }
                } 
            }
        ],
        null, // No history data image needed
        0,    // No button delay
        { borderColor: '#ff4444', titleColor: '#ff4444' } // Styles the modal red to indicate danger
    );
}

function saveGame() {
    if (!playerOrigin || isResolving || isResetting) return;

    const upgradeCosts = {};
    for (let key in upgrades) {
        upgradeCosts[key] = upgrades[key].cost;
    }

    const saveData = {
        totalPence, gps, timer, nuggetMult, status, maxTimer,
        skillProgressBonus, inJail, jailTimer, preJailGps, preJailMult,
        jailCount, strangerSpawned, jailFromRebellion,
        seenEvents: Array.from(seenEvents),
        exCosts, timerFlashed, postRebellion, playerOrigin, gpsMultiplier,
        _skillMaxTriggered, upgradeCosts
    };
    localStorage.setItem('eurekaRichSave', JSON.stringify(saveData));
}

function loadGame() {
    const savedString = localStorage.getItem('eurekaRichSave');
    if (savedString) {
        try {
            const saveData = JSON.parse(savedString);
            totalPence = saveData.totalPence ?? 0;
            gps = saveData.gps ?? 0;
            timer = saveData.timer ?? 30;
            nuggetMult = saveData.nuggetMult ?? 1.0;
            status = saveData.status ?? 'digger';
            maxTimer = saveData.maxTimer ?? 30;
            skillProgressBonus = saveData.skillProgressBonus ?? 0;
            inJail = saveData.inJail ?? false;
            jailTimer = saveData.jailTimer ?? 0;
            preJailGps = saveData.preJailGps ?? 0;
            preJailMult = saveData.preJailMult ?? 0;
            jailCount = saveData.jailCount ?? 0;
            strangerSpawned = saveData.strangerSpawned ?? false;
            jailFromRebellion = saveData.jailFromRebellion ?? false;
            seenEvents = new Set(saveData.seenEvents || []);
            exCosts = saveData.exCosts ?? { raid: 48000, patrol: 120000, tax: 48000, bill: 120000 };
            timerFlashed = saveData.timerFlashed ?? false;
            postRebellion = saveData.postRebellion ?? false;
            playerOrigin = saveData.playerOrigin ?? null;
            gpsMultiplier = saveData.gpsMultiplier ?? 1.0;
            _skillMaxTriggered = saveData._skillMaxTriggered ?? false;

            if (saveData.upgradeCosts) {
                for (let key in saveData.upgradeCosts) {
                    if(upgrades[key]) upgrades[key].cost = saveData.upgradeCosts[key];
                }
            }

            if (playerOrigin) {
                document.getElementById('intro-overlay').style.display = 'none';
                isPaused = false;
                
                if (postRebellion) {
                    document.getElementById('career-title').innerText = "Status: " + status.toUpperCase();
                    buildCareerUI(status);
                }
            }

            if (inJail) {
                document.body.classList.add('body-jail');
                document.getElementById('timer-banner').classList.add('jail-bg');
                document.querySelector('.ledger-box').classList.add('jail-bg');
                document.getElementById('rock').classList.add('jail-bg');
                document.getElementById('shop-panel').classList.add('shop-disabled');
                document.getElementById('career-title').innerText = "Status: IN JAIL";
                document.getElementById('career-title').style.color = "#ff4444";
            }

            update();
            return true;
        } catch (e) {
            console.error("Failed to load save", e);
            return false;
        }
    }
    return false;
}

// Automatically load game on page initialization
loadGame();

// ── Main Game Loop ──
setInterval(() => {
    if (!isPaused && !isResolving) {
        totalPence += ((gps * gpsMultiplier) / 10);

        if (inJail) {
            jailTimer -= 0.1;
            if (jailFromRebellion && jailTimer <= 10) triggerSetFree();
            else if (!jailFromRebellion && jailTimer <= 0) releaseFromJail();
        } else {
            if (!postRebellion) {
                timer -= 0.1;
                if (timer <= 0) sendToJail("The failure to spend the insane cost of a license (~$1,400 AUD)");
            } else {
                timer -= 0.1;
                if (timer <= 0) {
                    let reason = "Failure to perform your duties!";
                    if (status === 'politician') reason = "You missed a crucial parliamentary vote!";
                    else if (status === 'police') reason = "You neglected your border patrol duties!";
                    else if (status === 'merchant') reason = "You failed to sell your stock in time!";
                    sendToJail(reason);
                }
            }

            randomEventTimer -= 0.1;
            if (randomEventTimer <= 0) {
                randomEventTimer = Math.random() * 15 + 30;

                let availableEvents = Object.keys(historyData).filter(key => {
                    let evtData = historyData[key];
                    const careerMatch = evtData.target_career === status
                        || evtData.target_career === "all"
                        || (Array.isArray(evtData.target_career) && evtData.target_career.includes(status));
                    return evtData.event_type === "random" && careerMatch && !seenEvents.has(key);
                });

                if (availableEvents.length > 0) {
                    const evt = availableEvents[Math.floor(Math.random() * availableEvents.length)];
                    triggerEvent(evt, () => {}, true);
                }
            }
        }
        scheduleUpdate();
    }
}, 100);

// Background Save Loop
setInterval(saveGame, 10000);

document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) e.preventDefault();
    if (e.key === 'F12') e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && (e.key === 'i' || e.key === 'I')) e.preventDefault();
});
