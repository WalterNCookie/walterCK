// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: brown; icon-glyph: stopwatch;
const iCloudFM = FileManager.iCloud();
const fileName = "reactionHighScore.txt";
const iCloudPath = iCloudFM.joinPath(iCloudFM.documentsDirectory(), fileName);

function getHighScore() {
  if (iCloudFM.fileExists(iCloudPath)) {
    let data = iCloudFM.readString(iCloudPath);
    let score = parseFloat(data);
    return isNaN(score) ? null : score;
  }
  return null;
}

function saveHighScore(score) {
  try {
    iCloudFM.writeString(iCloudPath, score.toString());
  } catch (e) {
    console.warn("Failed to write to iCloud:", e);
  }
}

async function runReactionTimer(highScore) {
  const webView = new WebView();

  const html = `
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>
      html, body {
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
        -webkit-text-size-adjust: none;
        touch-action: manipulation;
        overscroll-behavior: none;
        margin: 0; padding: 0;
        width: 100vw; height: 100vh;
        overflow: hidden;
        background: black;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        color: white;
        font-family: -apple-system, sans-serif;
        font-size: 40px;
        text-align: center;
        position: fixed;
        top: 0; left: 0;
        transition: background 0.2s;
      }
      #text { margin-top: 250px; }
    </style>
  </head>
  <body>
    <div id="text">Wait for Green...</div>
    <script>
      let canClick = false;
      let startTime = null;
      let reactionTime = null;
      let clicked = false;
      let tooEarly = false;
      window.reactionTime = null;
      window.highScore = ${highScore !== null ? highScore : 'null'};

      const textDiv = document.getElementById('text');
      let greenTimer = null;

      function resetGame() {
        if (greenTimer) clearTimeout(greenTimer);
        textDiv.style.marginTop = '250px';
        canClick = false;
        clicked = false;
        tooEarly = false;
        startTime = null;
        reactionTime = null;
        window.reactionTime = null;
        document.body.style.background = 'black';
        textDiv.innerHTML = 'Wait for Green...';

        const delay = Math.random() * 1000 + 2000;
        greenTimer = setTimeout(() => {
          document.body.style.background = 'green';
          requestAnimationFrame(() => {
            textDiv.innerHTML = 'CLICK NOW!';
            canClick = true;
            startTime = performance.now();
          });
        }, delay);
      }

      document.body.addEventListener("touchstart", () => {
        if (canClick) {
          reactionTime = performance.now() - startTime;
          document.body.style.background = 'blue';
          textDiv.style.marginTop = 'calc(50vh - 200px)';

          if(window.highScore === null || reactionTime < window.highScore) {
            window.highScore = reactionTime;
          }

textDiv.innerHTML = 'Clicked!<br>Score: ' + Math.round(reactionTime) + ' ms' +
  (window.highScore !== null ? '<br>High Score: ' + Math.round(window.highScore) + ' ms' : '') +
  '<br><br>Tap to try again';
            '<br><br>Tap to try again';

          canClick = false;
          clicked = true;
          tooEarly = false;
          window.reactionTime = reactionTime;
        } else if (!canClick && !clicked && !tooEarly) {
          if (greenTimer) clearTimeout(greenTimer);
          document.body.style.background = 'orange';
          textDiv.style.marginTop = '225px';
          textDiv.innerHTML = 'Too Early!<br>Tap to try again';
          tooEarly = true;
        } else {
          resetGame();
        }
      });

      // Preload to avoid rendering lag
      window.onload = resetGame;
    </script>
  </body>
  </html>
  `;

  await webView.loadHTML(html);
  await webView.present(false);

  let result = await webView.evaluateJavaScript(`
    (function() {
      let rt = window.reactionTime !== null ? Number(window.reactionTime) : null;
      let hs = window.highScore !== null ? Number(window.highScore) : null;
      return [rt, hs];
    })()
  `);
  return { currentTime: result[0], highScore: result[1] };
}

async function main() {
  let highScore = getHighScore();
  let { currentTime, highScore: updatedHighScore } = await runReactionTimer(highScore);

  if (updatedHighScore !== null) {
    if (highScore === null || updatedHighScore < highScore) {
      saveHighScore(updatedHighScore);

      let notif = new Notification();
      notif.title = "🔥 New High Score! 🔥";
   notif.body = `You crushed it: ${Math.round(updatedHighScore)} ms!`;
      notif.sound = "ping";
      notif.schedule();
    } else if (updatedHighScore !== highScore) {
      saveHighScore(updatedHighScore);
    }
  } else {
    console.log("No valid reaction time recorded.");
  }
}

await main();