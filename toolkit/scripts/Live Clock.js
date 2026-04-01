// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: clock;
let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        background-color: #110000;
        color: #FF0000;
        font-size: 100px;
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: flex-start; /* changed from center to flex-start */
        height: 100vh;
        margin: 0;
        padding-top: 25vh;
        padding-left: 2vh;
        padding-right: 2vh;
        font-family: 'Georgia', Times New Roman;
      }
    </style>
  </head>
  <body>
    <div id="clock">00:00:00</div>
    <script>
      function updateClock() {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour12: true });
        document.getElementById('clock').innerText = time;
      }
      setInterval(updateClock, 1000);
      updateClock();
      setTimeout(() => window.close(), 10000);
    </script>
  </body>
</html>
`;

let wv = new WebView();
await wv.loadHTML(html);
await wv.present(false);
if (args.shortcutParameter) {
  Safari.open("shortcuts://run-shortcut?name=App%20Returner");
}