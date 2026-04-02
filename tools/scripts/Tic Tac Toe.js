// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: dice;
// 💥 Tic Tac Toe – Walter Edition: Styled, Smart, Smooth

function makeHTML() {
return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background: #000;
      color: #fff;
      font-family: -apple-system;
      margin: 0;
      padding: 24px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .title {
      font-size: 28px;
      font-weight: bold;
      color: #f00;
      text-shadow: 0 0 10px #f00;
      margin-bottom: 8px;
    }

    .status {
      font-size: 20px;
      color: #f00;
      margin-bottom: 20px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      width: 90vw;
      max-width: 360px;
      aspect-ratio: 1;
      gap: 6px;
      user-select: none;
    }

    .cell {
      background: #111;
      border: 1px solid #333;
      color: #f00;
      font-size: 36px;
      font-weight: bold;
      display: flex;
      justify-content: center;
      align-items: center;
      aspect-ratio: 1;
      cursor: pointer;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .cell.win {
      border: 3px solid #f00;
      box-shadow: 0 0 12px #f00;
      background: #111;
    }

.btn {
  margin: 20px 0 16px;
  background: #222;
  border: 1px solid #444;
  padding: 10px 20px;
  color: #f00;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 14px;
  color: #aaa;
}

    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #333;
      border-radius: 24px;
      transition: 0.3s;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: red;
      border-radius: 50%;
      transition: 0.3s;
    }

    input:checked + .slider {
      background-color: #555;
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    .difficulty {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #aaa;
      font-size: 14px;
    }

    input[type=range] {
      -webkit-appearance: none;
      width: 200px;
      height: 8px;
      background: #222;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 8px;
    }

    input[type=range]:hover {
      background: #333;
    }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: #f00;
      border-radius: 50%;
      box-shadow: 0 0 10px #f00;
      margin-top: -6px;
    }

    input[type=range]:active::-webkit-slider-thumb {
      background: #ff4d4d;
    }
  </style>
</head>
<body>
  <div class="title">TIC TAC TOE</div>
  <div class="status" id="status">X's turn</div>
  <div class="grid" id="grid"></div>
<button class="btn" onclick="reset()">Reset</button>

<div class="controls">
  <label class="toggle">
    <span>Play vs CPU</span>
    <label class="switch">
      <input type="checkbox" id="cpuToggle" onchange="toggleCPU()">
      <span class="slider"></span>
    </label>
  </label>

  <div class="difficulty" id="difficultyContainer" style="display:none;">
    <label for="difficultySlider">Difficulty</label>
    <input type="range" id="difficultySlider" min="1" max="10" value="10" oninput="setDifficulty(this.value)" />
  </div>
</div>

  <script>
    let board = Array(9).fill(null)
    let currentPlayer = "X"
    let gameOver = false
    let winLine = []
    let vsCPU = false
    let difficulty = 10

    const grid = document.getElementById("grid")
    const status = document.getElementById("status")
    const cpuToggle = document.getElementById("cpuToggle")
    const difficultyContainer = document.getElementById("difficultyContainer")

    function draw() {
      grid.innerHTML = ""
      board.forEach((val, i) => {
        const cell = document.createElement("div")
        cell.className = "cell"
        if (winLine.includes(i)) cell.classList.add("win")
        cell.innerText = val ?? ""
        cell.onclick = () => move(i)
        grid.appendChild(cell)
      })

      const result = checkWinner(board)
      if (result) {
        status.innerText = result.symbol + " wins!"
        winLine = result.line
        gameOver = true
      } else if (board.every(c => c)) {
        status.innerText = "Draw!"
        gameOver = true
      } else {
        status.innerText = currentPlayer + "'s turn"
      }
    }

function move(i) {
  if (board[i] || gameOver) return
  board[i] = currentPlayer

  const result = checkWinner(board)
  if (result) {
    winLine = result.line
    gameOver = true
  } else if (board.every(c => c)) {
    gameOver = true
  } else {
    currentPlayer = currentPlayer === "X" ? "O" : "X"
  }

  draw()

  if (!gameOver && vsCPU && currentPlayer === "O") {
    setTimeout(() => {
      const rand = Math.random() * 10
      const best = minimax(board, "O")
      const options = board.map((v, i) => v ? null : i).filter(x => x !== null)
      const randomMove = options[Math.floor(Math.random() * options.length)]
      const moveIndex = rand < difficulty ? best.index : randomMove

      board[moveIndex] = "O"

      const cpuResult = checkWinner(board)
      if (cpuResult) {
        winLine = cpuResult.line
        gameOver = true
      } else if (board.every(c => c)) {
        gameOver = true
      } else {
        currentPlayer = "X"
      }

      draw()
    }, 200)
  }
}

    function cpuMove() {
      const rand = Math.random() * 10
      const best = minimax(board, "O")
      const randomMove = () => {
        let options = board.map((v, i) => v ? null : i).filter(x => x !== null)
        return options[Math.floor(Math.random() * options.length)]
      }

      const moveIndex = rand < difficulty ? best.index : randomMove()
      move(moveIndex)
    }

    function minimax(newBoard, player) {
      const availSpots = newBoard.map((v, i) => v ? null : i).filter(x => x !== null)
      const winner = checkWinner(newBoard)
      if (winner) return { score: winner.symbol === "X" ? -10 : 10 }
      if (availSpots.length === 0) return { score: 0 }

      let moves = []
      for (let i = 0; i < availSpots.length; i++) {
        let move = {}
        move.index = availSpots[i]
        newBoard[availSpots[i]] = player
        let result = minimax(newBoard, player === "O" ? "X" : "O")
        move.score = result.score
        newBoard[availSpots[i]] = null
        moves.push(move)
      }

      let bestMove
      if (player === "O") {
        let bestScore = -Infinity
        for (let move of moves) {
          if (move.score > bestScore) {
            bestScore = move.score
            bestMove = move
          }
        }
      } else {
        let bestScore = Infinity
        for (let move of moves) {
          if (move.score < bestScore) {
            bestScore = move.score
            bestMove = move
          }
        }
      }
      return bestMove
    }

    function checkWinner(b) {
      const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
      ]
      for (let [a, b_, c] of lines) {
        if (b[a] && b[a] === b[b_] && b[a] === b[c])
          return { symbol: b[a], line: [a, b_, c] }
      }
      return null
    }

    function reset() {
      board = Array(9).fill(null)
      currentPlayer = "X"
      gameOver = false
      winLine = []
      draw()
    }

    function toggleCPU() {
      vsCPU = cpuToggle.checked
      difficultyContainer.style.display = vsCPU ? "flex" : "none"
      reset()
    }

    function setDifficulty(val) {
      difficulty = parseInt(val)
    }

    draw()
  </script>
</body>
</html>
`
}

const fm = FileManager.local()
const path = fm.joinPath(fm.documentsDirectory(), "tic-tac-toe.html")
fm.writeString(path, makeHTML())

let wv = new WebView()
await wv.loadFile(path)
await wv.present()
if (args.shortcutParameter) {
  Safari.open("shortcuts://run-shortcut?name=App%20Returner");
}