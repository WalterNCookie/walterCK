// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: comments;
// ==== INPUT SETUP ====
let convoRaw = ""

if (args.shortcutParameter && args.shortcutParameter.trim() !== "") {
  convoRaw = args.shortcutParameter
} else {
  console.log("Setting hardcoded input")
  convoRaw = "Other: Hey\nWalter: Hi\nOther: How are you?\nWalter: Good"
  args.plainTexts = ["Walter"]
  args.images = []
}

let yourName = "Walter"

// Clean encoding junk if any
let convo = convoRaw.replace(/â€™/g, "'")
                    .replace(/â€œ/g, '"')
                    .replace(/â€�/g, '"')
                    .replace(/â€“/g, "-")
                    .replace(/â€/g, "")

let pic = args.images.length > 0 ? args.images[0] : null
let base64 = pic ? Data.fromPNG(pic).toBase64String() : null

let lines = convo.trim().split("\n")

// ==== BUILD HTML ====
let html = `
<html>
  <head>
<style>
  html, body {
    height: 100%;
    margin: 0;
    padding: 14px;
    background: #000;
    font-family: -apple-system;
    font-size: 2900px;
    display: flex;
    flex-direction: column;
  }

  #container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: 100%;
  }

  .message-row {
    display: flex;
    margin: 6px 0;
    align-items: flex-end;
  }

  .message-row.mine {
    justify-content: flex-end;
  }

  .message-row.yours {
    justify-content: flex-start;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin-right: 6px;
  }

  .message-bubble {
    background: #3a3a3c;
    color: white;
    padding: 10px 16px;
    border-radius: 22px;
    max-width: 78%;
    font-size: 20px;
    line-height: 1.4;
    word-wrap: break-word;
  }

  .message-row.mine .message-bubble {
    background: #0b93f6;
  }
</style>
  </head>
  <body>
    <div id="container">
`

for (let line of lines) {
  let split = line.indexOf(":")
  if (split === -1) continue

  let sender = line.slice(0, split).trim()
  let message = line.slice(split + 1).trim()

  let isYou = sender.toLowerCase() === yourName.toLowerCase()
  let rowClass = isYou ? "mine" : "yours"
  let imageTag = !isYou && base64 ? `<img src="data:image/png;base64,${base64}" class="avatar">` : ""

html += `
  <div class="message-row ${rowClass}">
    ${!isYou ? imageTag : ""}
    <div class="message-bubble">${message}</div>
  </div>
`
}

html += `
    </div>
  </body>
</html>
`

// ==== OUTPUT ====
let fm = FileManager.local()
let path = fm.joinPath(fm.documentsDirectory(), "chat.html")
fm.writeString(path, html)
let webView = new WebView()
await webView.loadFile(path)
await webView.present(false)
if (args.shortcutParameter) {
  Safari.open("shortcuts://run-shortcut?name=App%20Returner");
}