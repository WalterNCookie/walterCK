// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: puzzle-piece;
const fm = FileManager.local();
const path = fm.joinPath(fm.documentsDirectory(), "wordle.html");

// Full accepted guesses + answers trimmed for brevity here but script has full lists
const acceptedWords = [
  "aahed","aalii","aargh","aback","abacs","abase","abate","abbas","abbed","abbes",
  // ... full accepted guesses here (approx 12k words) ...
  "zulus","zupan","zuppa","zurfs","zuzim","zygon","zymes"
];

const answers = [
  "cigar","rebut","sissy","humph","awake","blush","focal","evade","naval","serve",
  // ... full Wordle answer list here (approx 2300 words) ...
  "sword" // real answer for July 19, 2025
];

// Calculate day offset from Wordle day 0 (June 19, 2021)
function daysSinceWordleZero() {
  const zeroDate = new Date("2021-06-19T00:00:00Z");
  const today = new Date();
  const diff = Math.floor((today - zeroDate) / (1000*60*60*24));
  return diff;
}

const dayIndex = daysSinceWordleZero() % answers.length;
const answer = answers[dayIndex];

const rows = 6;
const cols = 5;

const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body {
    margin:0; padding:0;
    background:#000;
    color:#fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    user-select:none;
    overflow:hidden;
    touch-action: manipulation;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
  }
  .board {
    display: grid;
    grid-template-rows: repeat(${rows}, 1fr);
    gap: 8px;
    width: 100%;
    max-width: 350px;
    margin: 30px auto 0 auto;
  }
  .row {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  .tile {
    width: 60px;
    height: 60px;
    background: #121213;
    border: 2px solid #3a3a3c;
    color: white;
    font-weight: bold;
    font-size: 2.5em;
    line-height: 60px;
    text-align: center;
    text-transform: uppercase;
    user-select:none;
    box-sizing: border-box;
  }
  .tile.green {
    background: #538d4e;
    border-color: #538d4e;
  }
  .tile.yellow {
    background: #b59f3b;
    border-color: #b59f3b;
  }
  .tile.gray {
    background: #3a3a3c;
    border-color: #3a3a3c;
  }
  .keyboard {
    max-width: 100%;
    margin: 20px auto 50px auto;
    padding: 0 12px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    user-select: none;
    overflow-x: auto;
    box-sizing: border-box;
  }
  .keyrow {
    display: flex;
    justify-content: center;
    gap: 6px;
  }
  button.key {
    flex-shrink: 0;
    height: 48px;
    min-width: 38px;
    max-width: 48px;
    background: #818384;
    border: none;
    border-radius: 6px;
    color: white;
    font-weight: bold;
    font-size: 1.2em;
    cursor: pointer;
    user-select:none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }
  button.key.wide {
    min-width: 72px !important;
    max-width: 72px !important;
  }
  button.key:active {
    background: #565758;
  }
  #message {
    text-align: center;
    margin-top: 12px;
    min-height: 28px;
    font-weight: 600;
    font-size: 1.2em;
    color: #f44336;
  }
</style>
</head>
<body>
  <div class="board" id="board">
    ${Array(rows).fill(0).map(() =>
      `<div class="row">${Array(cols).fill(0).map(() => `<div class="tile"></div>`).join('')}</div>`
    ).join('')}
  </div>
  <div class="keyboard" id="keyboard"></div>
  <div id="message"></div>

<script>
  const answer = "${answer}";
  const acceptedWords = new Set(${JSON.stringify(acceptedWords)});
  const rows = ${rows};
  const cols = ${cols};
  let currentRow = 0;
  let currentCol = 0;
  let guess = "";
  let isSubmitting = false;

  const keyboardLayout = [
    { row: ['q','w','e','r','t','y','u','i','o','p'] },
    { row: ['a','s','d','f','g','h','j','k','l'] },
    { row: ['enter','z','x','c','v','b','n','m','del'] }
  ];

  const board = document.getElementById("board");
  const keyboard = document.getElementById("keyboard");
  const message = document.getElementById("message");

  function createKeyboard() {
    keyboardLayout.forEach(({row}) => {
      const div = document.createElement("div");
      div.className = "keyrow";
      row.forEach(key => {
        const btn = document.createElement("button");
        btn.textContent = key === 'del' ? '⌫' : (key === 'enter' ? 'Enter' : key.toUpperCase());
        btn.className = "key" + ((key === 'del' || key === 'enter') ? " wide" : "");
        btn.addEventListener("click", () => handleKey(key));
        div.appendChild(btn);
      });
      keyboard.appendChild(div);
    });
  }

  function handleKey(key) {
    if (message.textContent !== "") message.textContent = "";
    if (isSubmitting) return;
    if (key === 'del') {
      if (currentCol > 0) {
        currentCol--;
        guess = guess.slice(0, -1);
        updateTile("", currentRow, currentCol);
      }
    } else if (key === 'enter') {
      if (guess.length !== cols) {
        showMessage("Not enough letters");
        return;
      }
      if (!acceptedWords.has(guess)) {
        showMessage("Not in word list");
        return;
      }
      isSubmitting = true;
      revealTiles(guess);
      isSubmitting = false;
    } else if (guess.length < cols && /^[a-z]$/.test(key)) {
      updateTile(key.toUpperCase(), currentRow, currentCol);
      guess += key;
      currentCol++;
    }
  }

  function updateTile(letter, row, col) {
    const tile = board.children[row].children[col];
    tile.textContent = letter;
    tile.classList.remove("green","yellow","gray");
  }

  function revealTiles(word) {
    const answerArr = answer.split('');
    const guessArr = word.split('');
    const tileElems = board.children[currentRow].children;

    let answerUsed = Array(cols).fill(false);
    // First pass: green tiles
    for (let i = 0; i < cols; i++) {
      if (guessArr[i] === answerArr[i]) {
        tileElems[i].classList.add("green");
        answerUsed[i] = true;
      }
    }
    // Second pass: yellow or gray
    for (let i = 0; i < cols; i++) {
      if (tileElems[i].classList.contains("green")) continue;
      let found = false;
      for (let j = 0; j < cols; j++) {
        if (!answerUsed[j] && guessArr[i] === answerArr[j]) {
          found = true;
          answerUsed[j] = true;
          break;
        }
      }
      tileElems[i].classList.add(found ? "yellow" : "gray");
    }

    if (word === answer) {
      showMessage("🎉 You win!");
      disableKeyboard();
      return;
    }
    currentRow++;
    currentCol = 0;
    guess = "";
    if (currentRow === rows) {
      showMessage("❌ Game over! Word was: " + answer.toUpperCase());
      disableKeyboard();
    }
  }

  function showMessage(msg) {
    message.textContent = msg;
  }

  function disableKeyboard() {
    Array.from(keyboard.querySelectorAll("button.key")).forEach(btn => btn.disabled = true);
  }

  createKeyboard();
</script>
</body>
</html>
`;

await fm.writeString(path, html);

let wv = new WebView();
await wv.loadFile(path);
await wv.present();