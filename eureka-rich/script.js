// iOS Safari Zoom Overrides
document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
document.addEventListener('touchstart', function(event) {
    if (event.touches.length > 1) event.preventDefault();
}, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
}, { passive: false });

// ── Data Loading ──
let historyData = {};
let dataLoaded = false;

fetch('sources.json')
    .then(r => r.json())
    .then(data => { 
        historyData = data; 
        dataLoaded = true; 
        Object.values(data).forEach(item => {
            if (item.image) {
                const img = new Image();
                img.src = item.image;
            }
        });
    })
    .catch(err => { console.warn('sources.json failed to load:', err); dataLoaded = true; });

// ── Game State ──
let totalPence = 0, gps = 0, timer = 30, isPaused = true, isResolving = false;
let nuggetMult = 1.0, status = 'digger', maxTimer = 30, skillProgress = 0;
let inJail = false, jailTimer = 0, preJailGps = 0, preJailMult = 0;
let jailCount = 0, strangerSpawned = false;
let jailFromRebellion = false;
let seenEvents = new Set();
let exCosts = { raid: 48000, patrol: 120000, tax: 48000, bill: 120000 };
let timerFlashed = false;

// ── Random Event System ──
let randomEventTimer = Math.random() * 15 + 30;

// ── Origin Modifiers ──
let playerOrigin = '';
let gpsMultiplier = 1.0;

// Audio
const bgMusic = new Audio('audio/background.mp3'); bgMusic.loop = true; bgMusic.volume = 0.4; bgMusic.disableRemotePlayback = true; 
const victoryMusic = new Audio('audio/victory.mp3'); victoryMusic.volume = 0.6; victoryMusic.disableRemotePlayback = true;
const jailMusic = new Audio('audio/jail.mp3'); jailMusic.loop = true; jailMusic.volume = 0.5; jailMusic.disableRemotePlayback = true;
const lossAudio = new Audio('audio/loss.mp3'); lossAudio.volume = 0.6; lossAudio.disableRemotePlayback = true;
const popAudio = new Audio('audio/pop.mp3'); popAudio.volume = 0.7; popAudio.disableRemotePlayback = true;
const tapAudio = new Audio('audio/tap.mp3'); tapAudio.volume = 0.4; tapAudio.disableRemotePlayback = true;
const warAudio = new Audio('audio/war.mp3'); warAudio.volume = 0.6; warAudio.disableRemotePlayback = true; warAudio.loop = true;

// Seamless looping fix for mobile
function setupSeamlessLoop(audioElement) {
    audioElement.addEventListener('timeupdate', function() {
        if (this.duration && this.currentTime >= this.duration - 0.25) {
            this.currentTime = 0;
            this.play().catch(()=>{});
        }
    });
}
setupSeamlessLoop(bgMusic);
setupSeamlessLoop(jailMusic);
setupSeamlessLoop(warAudio);

let musicMuted = false;

function playAudioFade(outAudio, inAudio) {
    if (musicMuted) return;
    if (inAudio) {
        inAudio.currentTime = 0;
        inAudio.volume = 0;
        inAudio.play().catch(()=>{});
    }
    let ticks = 0;
    let fader = setInterval(() => {
        ticks++;
        if (outAudio && outAudio.volume > 0) outAudio.volume = Math.max(0, outAudio.volume - 0.05);
        if (inAudio) {
            let target = 0.5;
            if (inAudio === bgMusic) target = 0.4;
            if (inAudio === victoryMusic || inAudio === warAudio) target = 0.6;
            inAudio.volume = Math.min(target, inAudio.volume + 0.05);
        }
        if (ticks > 12) {
            clearInterval(fader);
            if (outAudio) { outAudio.pause(); outAudio.volume = (outAudio === bgMusic ? 0.4 : 0.5); }
        }
    }, 40);
}

function startMusic() { bgMusic.play().catch(() => {}); }

function toggleMute() {
    musicMuted = !musicMuted;
    [bgMusic, victoryMusic, jailMusic, lossAudio, popAudio, tapAudio, warAudio].forEach(a => a.muted = musicMuted);
    document.getElementById('mute-btn').innerText = musicMuted ? '🔇' : '🔊';
}

function selectOrigin(origin) {
    playerOrigin = origin;
    document.getElementById('intro-overlay').style.display = 'none';
    
    if (origin === 'britain') { totalPence += 1200; nuggetMult *= 0.5; }
    else if (origin === 'california') { skillProgress = 12.5; maxTimer = 25; timer = 25; }
    else if (origin === 'china') { nuggetMult *= 1.25; }
    else if (origin === 'local') { gpsMultiplier = 1.25; }

    startMusic();
    isPaused = false;
    update();
}

function triggerEvent(eventKey, callback) {
    if (seenEvents.has(eventKey)) { if (callback) callback(); return; }
    if (!dataLoaded) { setTimeout(() => triggerEvent(eventKey, callback), 300); return; }
    if (historyData[eventKey]) {
        seenEvents.add(eventKey);
        const wasPaused = isPaused;
        isPaused = true;
        const data = historyData[eventKey];
        showChoiceModal("HISTORICAL CONTEXT", data.info, "CONTINUE", () => {
            document.getElementById('custom-modal-overlay').style.display = 'none';
            isPaused = wasPaused;
            if (callback) callback();
        }, data);
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
    for(let i = 0; i < 8; i++) {
        const c = document.createElement('div');
        c.className = 'confetti'; c.style.left = x + 'px'; c.style.top = y + 'px';
        document.body.appendChild(c);
        const angle = Math.random() * Math.PI * 2, vel = 3 + Math.random() * 5;
        let px = x, py = y, op = 1;
        const anim = setInterval(() => {
            px += Math.cos(angle) * vel; py += Math.sin(angle) * vel + 2;
            op -= 0.04; c.style.left = px + 'px'; c.style.top = py + 'px'; c.style.opacity = op;
            if(op <= 0) { clearInterval(anim); c.remove(); }
        }, 20);
    }
}

function update() {
    document.getElementById('wealth-display').innerText = formatCurrency(totalPence);
    
    let actualGps = gps * gpsMultiplier;
    document.getElementById('gps-display').innerText = actualGps < 12 ? Math.floor(actualGps)+"d" : (actualGps/12).toFixed(1)+"s";
    document.getElementById('mult-display').innerText = nuggetMult.toFixed(1);

    if (!inJail) {
        document.getElementById('timer-count').innerText = Math.ceil(timer);
        document.getElementById('timer-label').innerText = "LICENSE CHECK IN:";
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

    // 1000s/s is 12000 pence. Calculate progress for each stat independently.
    let connectionsProgress = (actualGps / 12000) * 100;
    let efficiencyProgress = (nuggetMult / 1000) * 100;
    skillProgress = Math.min(100, Math.max(connectionsProgress, efficiencyProgress));
    
    document.getElementById('survey-fill').style.width = skillProgress + "%";

    // Win triggers if either Connections hits 12000 (1000s/s) OR Efficiency hits 1000.0x
    if ((actualGps >= 12000 || nuggetMult >= 1000) && !strangerSpawned && !inJail && !isPaused && !isResolving) {
        strangerSpawned = true;
        const ws = document.createElement('div');
        ws.className = 'welcome-stranger';
        ws.onpointerdown = (ev) => {
            ev.stopPropagation();
            createConfetti(ev.clientX, ev.clientY);
            ws.remove();
            triggerEvent('welcome_stranger', () => {
                isPaused = true; isResolving = true;
                playAudioFade(bgMusic, victoryMusic);
                showChoiceModal("MONUMENTAL STRIKE! THE VICTORIOUS ENDING", "You discovered the Welcome Stranger!!! 🎉🎉🎉 3cm below the surface, and a quick, out-of-the-blue mining trip led you to the biggest gold nugget EVER found. You are rich beyond what this game could/should measure (millions of AUD$) and spend the rest of your days in glory.\n\n Thanks for playing, I hope it was fun/A-worthy.", "PLAY AGAIN", () => location.reload());
            });
        };
        document.body.appendChild(ws);
    }

    for(let key in upgrades) {
        let btn = document.getElementById(upgrades[key].id);
        if(btn) {
            let actualCost = upgrades[key].cost;
            btn.innerText = `${upgrades[key].label} (${formatCurrency(actualCost)})`;
            btn.disabled = inJail || (totalPence < actualCost);
        }
    }
    if(status === 'digger' && document.getElementById('rebel-btn')) {
        document.getElementById('rebel-btn').disabled = inJail || (totalPence < 24000);
    }
    const licenseBtn = document.getElementById('buy-license');
    if (licenseBtn) licenseBtn.disabled = inJail || (totalPence < 360);

    const cb1 = document.getElementById('career-btn-1');
    const cb2 = document.getElementById('career-btn-2');
    if (cb1) cb1.disabled = inJail || (totalPence < (status === 'police' ? exCosts.raid : exCosts.tax));
    if (cb2) cb2.disabled = inJail || (totalPence < (status === 'police' ? exCosts.patrol : exCosts.bill));
}

function mine(e) {
    if(isPaused || isResolving) return;
    tapAudio.currentTime = 0;
    tapAudio.play().catch(() => {});
    
    triggerEvent('first_mine', () => {
        totalPence += nuggetMult;
        document.getElementById('rock').classList.add('rock-bounce');
        setTimeout(() => document.getElementById('rock').classList.remove('rock-bounce'), 100);
        update();
    });
}

setInterval(() => {
    if (isPaused || isResolving) return;
    const sn = document.createElement('div');
    sn.className = 'small-nugget';
    sn.style.top = (15 + Math.random() * 70) + "vh";
    sn.style.left = "-60px";
    sn.onpointerdown = (e) => {
        e.stopPropagation();
        popAudio.currentTime = 0; popAudio.play().catch(() => {});
        totalPence += ((gps * gpsMultiplier) * 10) + (nuggetMult * 20);
        createConfetti(e.clientX, e.clientY);
        sn.remove(); update();
    };
    document.body.appendChild(sn);
    setTimeout(() => { if(sn.parentNode) sn.remove(); }, 15000);
}, 15000);

function buyUpgrade(type) {
    if(inJail) return;
    let u = upgrades[type];
    if(totalPence >= u.cost) {
        triggerEvent('buy_' + type, () => {
            totalPence -= u.cost; gps += u.power; nuggetMult += u.mult;
            u.cost = Math.floor(u.cost * 1.5); update();
        });
    }
}

function buyLicense() {
    if(totalPence >= 360 && !inJail) {
        triggerEvent('buy_license', () => {
            totalPence -= 360; timer = maxTimer; timerFlashed = false; update();
        });
    }
}

const oathTarget = "WE SWEAR BY THE SOUTHERN CROSS TO STAND TRULY BY EACH OTHER AND FIGHT TO DEFEND OUR RIGHTS AND LIBERTIES.";

function startRebellion() {
    if(totalPence < 24000 || inJail) return;
    playAudioFade(bgMusic, warAudio);
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

    if(historyData['oath']) document.getElementById('oath-source').innerHTML = `Source: <a href="${historyData['oath'].link}" target="_blank">${historyData['oath'].source}</a>`;
    container.innerHTML = oathTarget.split('').map(char => `<span style="color: #555;">${char}</span>`).join('');

    input.value = '';
    
    // Delay focus slightly so the native mouse click doesn't steal it back
    setTimeout(() => input.focus(), 50); 
    
    // Ensure clicking anywhere on the modal or background returns focus to the input
    overlay.onpointerdown = () => setTimeout(() => input.focus(), 10);
    document.getElementById('oath-modal').onpointerdown = (e) => {
        e.stopPropagation();
        setTimeout(() => input.focus(), 10);
    };

    // Aggressively prevent the input from losing focus while the modal is open
    input.onblur = () => {
        if (overlay.style.display === 'flex' && confirmBtn.style.display === 'none') {
            input.focus();
        }
    };

    input.oninput = (e) => {
        const typed = input.value.toUpperCase();
        let matchLen = 0;
        for(let i = 0; i < typed.length; i++) {
            if(typed[i] === oathTarget[i]) matchLen++;
            else break; 
        }
        
        input.value = oathTarget.substring(0, matchLen);
        const spans = container.querySelectorAll('span');
        for(let i = 0; i < oathTarget.length; i++) {
            spans[i].style.color = i < matchLen ? '#ffd700' : '#555';
            spans[i].style.textShadow = i < matchLen ? '0 0 5px rgba(255, 215, 0, 0.5)' : 'none';
        }
        
        if(matchLen === oathTarget.length) {
            input.onblur = null; // Remove the focus lock so the user can proceed
            input.blur(); 
            input.oninput = null;
            confirmBtn.style.display = 'block';
            confirmBtn.onpointerdown = () => { overlay.style.display = 'none'; executeRebellionBattle(); };
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
    
    for(let i = 0; i < 45; i++) {
        const s = document.createElement('div'); s.className = 'waving-sword'; s.innerText = '⚔️';
        s.style.animationDelay = (Math.random() * -2) + 's';
        s.style.animationDuration = (1.2 + Math.random() * 1.5) + 's';
        s.style.fontSize = (40 + Math.random() * 35) + 'px';
        s.style.marginLeft = (Math.random() * 20 - 10) + 'px';
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
}

function sendToJail(reason, fromRebellion = false) {
    lossAudio.currentTime = 0; lossAudio.play().catch(() => {});
    
    if (!fromRebellion) {
        jailCount++;
        if (jailCount > 2) {
            isPaused = true; isResolving = true;
            showChoiceModal("HANGED AT DAWN", "You have been arrested three times on the Ballarat goldfields 💀\n\nThe colonial court, scared of your persistent defiance, has now sentenced you to be hanged! You neck was squeezed, you couldn't breathe, and you are now dead.\n\nA stupid fate for an individual miner trying to fight against an entire colony (or just a forgetful/broke one). Either way, this is where your story ends.", "RESTART", () => location.reload());
            return;
        }
    }

    isResolving = false; isPaused = true;
    inJail = true; jailTimer = 30; jailFromRebellion = fromRebellion;
    preJailGps = gps; preJailMult = nuggetMult;
    gps = 0; nuggetMult = 0.1; 

    document.body.classList.remove('battle-bg');
    document.getElementById('battle-layer').style.display = 'none';
    document.body.classList.add('body-jail');
    
    playAudioFade(fromRebellion ? warAudio : bgMusic, jailMusic);

    document.getElementById('timer-banner').classList.add('jail-bg');
    document.querySelector('.ledger-box').classList.add('jail-bg');
    document.getElementById('rock').classList.add('jail-bg');
    document.getElementById('shop-panel').classList.add('shop-disabled');
    document.getElementById('career-title').innerText = "Status: IN JAIL (" + reason + ")";
    document.getElementById('career-title').style.color = "#ff4444";
    document.getElementById('rock').innerText = '🔒';

    const msg = fromRebellion
        ? `Reason: ${reason}\n\n Waking up at dawn on the 3rd of December 1854. The sun, and hundreds of British troops are crowding your vision. It's Sunday, but they still decided to attack :( so you and your 'sworn comrades' are now, with resistence, dragged before the Melbourne courts. HIGH TREASON against THE Crown, historically punishable by death, is a fate looking all too plausible to you.\n\nBut hey, thousands of citizens are defending you, shocked (🤨), by the actions of the government. The public defiance is overwhelming and even fortelling...?\n\nWait for the outcome.`
        : `Reason: ${reason}\n\nYou have been locked up for 30 seconds. While serving your time:\n\n• Efficiency reduced to 0.1x\n• Connections halted\n• Mining skill frozen\n• Shop closed`;

    showChoiceModal("ARRESTED!", msg, "SERVE SENTENCE", () => {
        if (!fromRebellion) {
            triggerEvent('jail', () => { document.getElementById('custom-modal-overlay').style.display = 'none'; isPaused = false; });
        } else {
            document.getElementById('custom-modal-overlay').style.display = 'none'; isPaused = false;
        }
    });

    update();
}

function triggerSetFree() {
    jailFromRebellion = false; inJail = false; isPaused = true;
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.body.classList.add('glitch-effect');
    
    playAudioFade(jailMusic, victoryMusic);

    const flash = document.createElement('div');
    flash.id = 'freedom-flash';
    flash.innerHTML = `⚖️<br><br>NOT GUILTY<br><br>DA PEOPLE<br>HAVE SPOKEN<br><br>ALL CHARGES<br>NOW DROPPED<br><br>⚖️?`;
    document.body.appendChild(flash);

    setTimeout(() => {
        document.body.classList.remove('glitch-effect');
        flash.remove();
        playAudioFade(victoryMusic, bgMusic);

        triggerEvent('set_free', () => {
            releaseFromJail();
            setupPathwayChoice();
        });
    }, 3000);
}

function releaseFromJail() {
    inJail = false; gps = preJailGps; nuggetMult = preJailMult; timer = maxTimer; timerFlashed = false;
    document.body.classList.remove('body-jail');
    
    if(jailMusic.volume > 0) playAudioFade(jailMusic, bgMusic);

    document.getElementById('timer-banner').classList.remove('jail-bg');
    document.querySelector('.ledger-box').classList.remove('jail-bg');
    document.getElementById('rock').classList.remove('jail-bg');
    document.getElementById('shop-panel').classList.remove('shop-disabled');
    document.getElementById('career-title').innerText = "Status: " + status.charAt(0).toUpperCase() + status.slice(1);
    document.getElementById('career-title').style.color = "#00aaff";
    document.getElementById('rock').innerText = '🪙';
    update();
}

function showChoiceModal(title, text, btnText, action, optionalHistoryData = null) {
    document.getElementById('choice-box').innerHTML = '<button id="path-btn" style="width:100%; padding:15px; font-size: 14px; color: white;"></button>';
    document.getElementById('custom-modal-overlay').style.display = 'flex';
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    const mImg = document.getElementById('modal-img');
    const mSrc = document.getElementById('modal-source');

    if(optionalHistoryData) {
        if(optionalHistoryData.image) { mImg.src = optionalHistoryData.image; mImg.style.display = 'block'; }
        else { mImg.style.display = 'none'; }
        mSrc.innerHTML = optionalHistoryData.link ? `Source: <a href="${optionalHistoryData.link}" target="_blank">${optionalHistoryData.source}</a>` : "Source: " + (optionalHistoryData.source || '');
    } else { mImg.style.display = 'none'; mSrc.innerHTML = ""; }

    document.getElementById('choice-box').style.display = 'block';
    document.getElementById('modal-btn').style.display = 'none';
    const pBtn = document.getElementById('path-btn');
    pBtn.innerText = btnText; pBtn.onpointerdown = action;
    pBtn.style.background = (title === "VICTORY!" || title === "HISTORICAL CONTEXT" || title === "MONUMENTAL STRIKE!" || title === "A PEACEFUL RETURN") ? "#00aaff" : "#ff4444";
}

function setupPathwayChoice() {
    status = 'citizen';
    document.getElementById('custom-modal-overlay').style.display = 'flex';
    document.getElementById('modal-title').innerText = "CHOOSE YOUR PATH";
    document.getElementById('modal-img').style.display = 'none';
    document.getElementById('modal-source').innerHTML = '';
    document.getElementById('modal-btn').style.display = 'none';
    document.getElementById('choice-box').style.display = 'block';

    if (playerOrigin === 'china') {
        document.getElementById('modal-text').innerText = "The verdict is out, and you're a free man/woman. However, discriminatory, colonial laws strictly prevent you from the parliamentry office or the police force.\n\nSoo your options are limited. Do you risk returning home to your family, or become a Ballarat merchant?";
        document.getElementById('choice-box').innerHTML = `
            <button class="btn-police" onpointerdown="setCareer('merchant')" style="width:100%; padding:15px; margin-bottom:10px; font-size:14px; background: #ff8800; border: 1px solid #fff;">BECOME A MERCHANT (Balanced Stats)</button>
            <button class="btn-politician" onpointerdown="setCareer('home')" style="width:100%; padding:15px; font-size:14px; background: #555; color: #fff; border: 1px solid #fff;">RETURN HOME (Peaceful Life)</button>
        `;
    } else {
        document.getElementById('modal-text').innerText = "The verdict.. you are now free! The victory spreads across the colony. Your brave actions will be remembered in history, in democracy, and even in year 9 classrooms.\n\nYou're a little bit famous, little bit respected, but pretty poor. How will you work for your colony, and your hungry stomach?";
        document.getElementById('choice-box').innerHTML = `
            <button class="btn-police" onpointerdown="setCareer('police')" style="width:100%; padding:15px; margin-bottom:10px; font-size:14px;">POLICE FORCE (Efficiency)</button>
            <button class="btn-politician" onpointerdown="setCareer('politician')" style="width:100%; padding:15px; font-size:14px;">PARLIAMENT (Connections)</button>
        `;
    }
}

function setCareer(type) {
    if (type === 'home') {
        document.getElementById('custom-modal-overlay').style.display = 'none';
        isPaused = true; isResolving = true;
        playAudioFade(bgMusic, victoryMusic);
        showChoiceModal("THE PEACEFUL ENDING", "You chose to return home to your family in China :) They're happy to see you and with your gold, you start a small, pickaxe business, escaping poverty. You're not a cool politician, brutal policeman, or finder to the biggest gold nugge to exist but that's okay! You lived the rest of your life humbley, peacefully and in peace.\n\nYour journey to Ballarat has finished here.", "PLAY AGAIN", () => location.reload());
        return;
    }

    status = type; maxTimer = (type === 'police') ? 45 : 30; timer = maxTimer;
    document.getElementById('career-title').innerText = "Status: " + type.toUpperCase();
    document.getElementById('custom-modal-overlay').style.display = 'none';
    const shop = document.getElementById('shop-ui');
    if(document.getElementById('rebel-btn')) document.getElementById('rebel-btn').remove();
    
    const b1 = document.createElement('button'); const b2 = document.createElement('button');
    b1.id = 'career-btn-1'; b2.id = 'career-btn-2';

    if (type === 'merchant') {
        b1.style.gridColumn = 'span 1'; b1.style.background = '#ff8800'; b1.style.color = 'white';
        b1.innerText = `TRADE GOODS (${formatCurrency(Math.floor(exCosts.tax))})`;
        b1.onpointerdown = () => { if(totalPence >= Math.floor(exCosts.tax) && !inJail) triggerEvent('trade_goods', () => { totalPence -= Math.floor(exCosts.tax); gps += 400; nuggetMult += 20; exCosts.tax = Math.floor(exCosts.tax * 1.5); b1.innerText = `TRADE GOODS (${formatCurrency(Math.floor(exCosts.tax))})`; update(); }); };
        b2.style.gridColumn = 'span 1'; b2.style.background = '#ff8800'; b2.style.color = 'white';
        b2.innerText = `EXPAND MARKET (${formatCurrency(Math.floor(exCosts.bill))})`;
        b2.onpointerdown = () => { if(totalPence >= Math.floor(exCosts.bill) && !inJail) triggerEvent('expand_market', () => { totalPence -= Math.floor(exCosts.bill); gps += 1200; nuggetMult += 80; exCosts.bill = Math.floor(exCosts.bill * 1.5); b2.innerText = `EXPAND MARKET (${formatCurrency(Math.floor(exCosts.bill))})`; update(); }); };
    } else if(type === 'police') {
        b1.className = 'btn-police'; b1.style.gridColumn = 'span 1'; b1.innerText = `RAID CLAIM (${formatCurrency(exCosts.raid)})`;
        b1.onpointerdown = () => { if(totalPence >= exCosts.raid && !inJail) triggerEvent('police_raid', () => { totalPence -= exCosts.raid; nuggetMult += 80; exCosts.raid = Math.floor(exCosts.raid * 1.5); b1.innerText = `RAID CLAIM (${formatCurrency(exCosts.raid)})`; update(); }); };
        b2.className = 'btn-police'; b2.style.gridColumn = 'span 1'; b2.innerText = `BORDER PATROL (${formatCurrency(exCosts.patrol)})`;
        b2.onpointerdown = () => { if(totalPence >= exCosts.patrol && !inJail) triggerEvent('police_patrol', () => { totalPence -= exCosts.patrol; nuggetMult += 300; exCosts.patrol = Math.floor(exCosts.patrol * 1.5); b2.innerText = `BORDER PATROL (${formatCurrency(exCosts.patrol)})`; update(); }); };
    } else {
        b1.className = 'btn-politician'; b1.style.gridColumn = 'span 1'; b1.innerText = `TAX REFORM (${formatCurrency(exCosts.tax)})`;
        b1.onpointerdown = () => { if(totalPence >= exCosts.tax && !inJail) triggerEvent('pol_tax', () => { totalPence -= exCosts.tax; gps += 1200; exCosts.tax = Math.floor(exCosts.tax * 1.5); b1.innerText = `TAX REFORM (${formatCurrency(exCosts.tax)})`; update(); }); };
        b2.className = 'btn-politician'; b2.style.gridColumn = 'span 1'; b2.innerText = `PASS BILL (${formatCurrency(exCosts.bill)})`;
        b2.onpointerdown = () => { if(totalPence >= exCosts.bill && !inJail) triggerEvent('pol_bill', () => { totalPence -= exCosts.bill; gps += 3500; exCosts.bill = Math.floor(exCosts.bill * 1.5); b2.innerText = `PASS BILL (${formatCurrency(exCosts.bill)})`; update(); }); };
    }
    shop.appendChild(b1); shop.appendChild(b2);
    isPaused = false; update();
    if (!inJail && bgMusic.paused) bgMusic.play().catch(() => {});
}

setInterval(() => {
    if(!isPaused && !isResolving) {
        totalPence += ((gps * gpsMultiplier) / 10);
        
        if (inJail) {
            jailTimer -= 0.1;
            if (jailFromRebellion && jailTimer <= 25) triggerSetFree();
            else if (!jailFromRebellion && jailTimer <= 0) releaseFromJail();
        } else {
            timer -= 0.1; 
            if(timer <= 0) sendToJail("Like many, the failure to spend/forget-to-spend the insane cost of a license (~$1,400 AUD)");
            
            randomEventTimer -= 0.1;
            if (randomEventTimer <= 0) {
                randomEventTimer = Math.random() * 15 + 30;
                let availableEvents = Object.keys(historyData).filter(key => {
                    let evtData = historyData[key];
                    return evtData.event_type === "random" && (evtData.target_career === status || evtData.target_career === "all") && !seenEvents.has(key);
                });

                if (availableEvents.length > 0) {
                    const evt = availableEvents[Math.floor(Math.random() * availableEvents.length)];
                    triggerEvent(evt, () => {
                        let eff = historyData[evt].effect;
                        if (eff) {
                            if (eff.type === 'wealth_pct') totalPence = Math.max(0, totalPence * eff.value);
                            else if (eff.type === 'wealth_flat') totalPence = Math.max(0, totalPence + eff.value);
                            else if (eff.type === 'timer_add') timer = Math.max(0.1, timer + eff.value);
                        }
                        update();
                    });
                }
            }
        }
        update();
    }
}, 100);

document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) e.preventDefault();
    if (e.key === 'F12') e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && (e.key === 'i' || e.key === 'I')) e.preventDefault();
});
