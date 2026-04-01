// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: space-shuttle;
let html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
<style>
  body, html {
    margin: 0; padding: 0; overflow: hidden; background: #000;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
    -ms-touch-action: manipulation;
  }
  canvas {
    display: block;
    background: radial-gradient(ellipse at center, #111 0%, #000 100%);
  }
  .btn {
    position: absolute;
    bottom: 20px;
    width: 60px;
    height: 60px;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
    text-align: center;
    line-height: 60px;
    font-size: 30px;
    color: white;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  #left { left: 20px; }
  #right { left: 100px; }
  #shoot { right: 20px; }
  #startButton {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255,255,255,0.2);
    padding: 20px 40px;
    border-radius: 12px;
    font-size: 32px;
    color: white;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    display: none;
    z-index: 10;
  }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="left" class="btn">◀️</div>
<div id="right" class="btn">▶️</div>
<div id="shoot" class="btn">🔫</div>
<div id="startButton">START GAME</div>
<script>
window.requestAnimationFrame = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 16); };

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

let player = { x: 0, y: 0, w: 64, h: 64, speed: 8 };
let bullets = [], aliens = [], alienBullets = [];
let cols = 8, rows = 3, wave = 1, lives = 3, alienDir = 1, gameOver = false;
let canShoot = true;

function setup() {
  player.x = canvas.width / 2 - player.w / 2;
  player.y = canvas.height - 80;
  aliens = [];
  for (let r = 0; r < rows + wave; r++) {
    for (let c = 0; c < cols; c++) {
      aliens.push({ x: 80 + c * 80, y: 50 + r * 60, w: 48, h: 48 });
    }
  }
  lives = 3;
  wave = 1;
  alienDir = 1;
  bullets = [];
  alienBullets = [];
  gameOver = false;
  startButton.style.display = 'none';
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw player as green rectangle
  ctx.fillStyle = 'limegreen';
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Draw bullets as white rectangles
  ctx.fillStyle = 'white';
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  // Draw aliens as red rectangles
  ctx.fillStyle = 'red';
  aliens.forEach(a => {
    ctx.fillRect(a.x, a.y, a.w, a.h);
  });

  // Draw alien bullets as neon yellow rectangles
  ctx.fillStyle = '#fffb00';
  alienBullets.forEach(b => {
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  // Draw lives and wave text
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText('Lives: ' + lives + '  Wave: ' + wave, 20, 30);
}

function update() {
  bullets = bullets.filter(b => b.y > 0);
  bullets.forEach(b => b.y -= 12);

  alienBullets = alienBullets.filter(b => b.y < canvas.height);
  alienBullets.forEach(b => b.y += 4);

  aliens.forEach(a => a.x += alienDir * 3);
  let edge = aliens.some(a => a.x <= 0 || a.x + a.w >= canvas.width);
  if (edge) {
    alienDir *= -1;
    aliens.forEach(a => {
      a.y += 5;
      if (a.y + a.h >= player.y - 50) {
        gameOver = true;
      }
    });
  }

  bullets.forEach((b, bi) => {
    aliens.forEach((a, ai) => {
      if (
        b.x < a.x + a.w &&
        b.x + b.w > a.x &&
        b.y < a.y + a.h &&
        b.y + b.h > a.y
      ) {
        bullets.splice(bi, 1);
        aliens.splice(ai, 1);
      }
    });
  });

  alienBullets.forEach((b, bi) => {
    if (
      b.x < player.x + player.w &&
      b.x + b.w > player.x &&
      b.y < player.y + player.h &&
      b.y + b.h > player.y
    ) {
      alienBullets.splice(bi, 1);
      lives--;
      if (lives <= 0) gameOver = true;
    }
  });

  if (aliens.length == 0) {
    wave++;
    rows = 3 + wave;
    setup();
  }

  if (Math.random() < 0.03 && aliens.length) {
    let a = aliens[Math.floor(Math.random() * aliens.length)];
    alienBullets.push({
      x: a.x + a.w / 2 - 6,
      y: a.y + 20,
      w: 12,
      h: 24,
    });
  }
}

function loop() {
  if (!gameOver) {
    update();
    draw();
    requestAnimationFrame(loop);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'red';
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    startButton.style.display = 'block';
  }
}

function shoot() {
  if (canShoot && !gameOver) {
    bullets.push({ x: player.x + 26, y: player.y, w: 12, h: 24 });
    canShoot = false;
    setTimeout(() => {
      canShoot = true;
    }, 400);
  }
}

let touchLeft = false,
  touchRight = false;

document.getElementById('left').addEventListener('touchstart', () => {
  touchLeft = true;
});
document.getElementById('left').addEventListener('touchend', () => {
  touchLeft = false;
});
document.getElementById('right').addEventListener('touchstart', () => {
  touchRight = true;
});
document.getElementById('right').addEventListener('touchend', () => {
  touchRight = false;
});
document.getElementById('shoot').addEventListener('touchstart', () => {
  shoot();
});

function control() {
  if (touchLeft && player.x > 0) player.x -= player.speed;
  if (touchRight && player.x + player.w < canvas.width) player.x += player.speed;
  requestAnimationFrame(control);
}

const startButton = document.getElementById('startButton');
const shootBtn = document.getElementById('shoot');
shootBtn.style.pointerEvents = 'none'; // disable shooting before start
startButton.style.display = 'block'; // show start button on load
startButton.addEventListener('click', () => {
  startButton.style.display = 'none';
  shootBtn.style.pointerEvents = 'auto'; // enable shooting after start
  setup();
  loop();
  control();
});

// Disable text selection on buttons
const buttons = document.querySelectorAll('.btn, #startButton');
buttons.forEach((btn) => {
  btn.style.userSelect = 'none';
  btn.style.webkitUserSelect = 'none';
  btn.style.mozUserSelect = 'none';
  btn.style.msUserSelect = 'none';
});
</script>
</body>
</html>
`;

let wv = new WebView();
await wv.loadHTML(html);
await wv.present();