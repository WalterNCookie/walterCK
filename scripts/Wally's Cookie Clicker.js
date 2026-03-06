// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: brown; icon-glyph: cookie-bite;
const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Cookie Clicker Ultimate</title>
  <style>
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #121212;
      color: #eee;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 75vh;
      user-select: none;
      overflow: hidden;
      -webkit-touch-callout: none; /* disable callout, iOS */
      -webkit-user-select: none;   /* disable selection, iOS */
      -webkit-text-size-adjust: none; /* disable font scaling, iOS */
      touch-action: manipulation; /* disables double-tap zoom */
    }
    #container {
      width: 360px;
      background: #1e1e1e;
      border-radius: 16px;
      box-shadow: 0 0 25px #ff9800;
      padding: 30px;
      text-align: center;
      font-size: 18px;
    }
    button {
      background: #ff9800;
      border: none;
      padding: 16px 32px;
      margin: 14px 0;
      color: #121212;
      font-weight: 900;
      font-size: 20px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.3s;
    }
    button:hover {
      background: #ffa726;
    }
    #cookie {
      font-size: 140px;
      cursor: pointer;
      margin: 30px 0;
    }
    #score {
      font-size: 32px;
      margin-top: 18px;
    }
    #powerUp {
      margin-top: 14px;
      font-style: italic;
      min-height: 30px;
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="menu">
      <h1>Cookie Clicker Ultimate</h1>
      <button id="startBtn">Start Game</button>
      <button id="instructionsBtn">Instructions</button>
    </div>

    <div id="game" style="display:none;">
      <div id="cookie">🍪</div>
      <div id="score">Score: 0</div>
      <div id="powerUp">Click the cookie!</div>
      <button id="backBtnGame">Back to Menu</button>
    </div>

    <div id="instructions" style="display:none;">
      <h2>Power-Ups Explained</h2>
      <ul style="text-align:left; padding-left: 20px;">
        <li><b>Double Points:</b> Doubles your current score.</li>
        <li><b>Steal Points:</b> Takes away 5 points.</li>
        <li><b>Bonus +10:</b> Adds 10 points.</li>
        <li><b>Boss Fight:</b> 50 points if you win, or lose 20 if you fail.</li>
        <li><b>No Effect:</b> Nada happens.</li>
      </ul>
      <button id="backBtnInstructions">Back to Menu</button>
    </div>
  </div>

  <script>
    const menu = document.getElementById('menu');
    const game = document.getElementById('game');
    const instructions = document.getElementById('instructions');

    const startBtn = document.getElementById('startBtn');
    const instructionsBtn = document.getElementById('instructionsBtn');
    const backBtnGame = document.getElementById('backBtnGame');
    const backBtnInstructions = document.getElementById('backBtnInstructions');

    const cookie = document.getElementById('cookie');
    const scoreDisplay = document.getElementById('score');
    const powerUpDisplay = document.getElementById('powerUp');

    let score = 0;
    const powers = [
      { name: "Double Points", effect: () => { score *= 2; } },
      { name: "Steal Points", effect: () => { score = Math.max(0, score - 5); } },
      { name: "Bonus +10", effect: () => { score += 10; } },
      { name: "Boss Fight", effect: () => {
          if (Math.random() > 0.5) score += 50;
          else score = Math.max(0, score - 20);
        }
      },
      { name: "No Effect", effect: () => {} }
    ];

    function showSection(section) {
      menu.style.display = 'none';
      game.style.display = 'none';
      instructions.style.display = 'none';
      section.style.display = 'block';
    }

    startBtn.onclick = () => {
      score = 0;
      updateScore();
      powerUpDisplay.textContent = "Click the cookie!";
      showSection(game);
    };

    instructionsBtn.onclick = () => showSection(instructions);
    backBtnGame.onclick = () => showSection(menu);
    backBtnInstructions.onclick = () => showSection(menu);

    function updateScore() {
      scoreDisplay.textContent = "Score: " + score;
    }

    cookie.onclick = () => {
      score += 1;
      const powerUp = powers[Math.floor(Math.random() * powers.length)];
      powerUp.effect();
      updateScore();
      powerUpDisplay.textContent = "Power-up: " + powerUp.name;
    };
  </script>
</body>
</html>`;

let webView = new WebView();
await webView.loadHTML(html);
await webView.present();

if (args.shortcutParameter) {
  Safari.open("shortcuts://run-shortcut?name=App%20Returner");
}