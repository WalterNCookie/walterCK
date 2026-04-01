// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: ticket-alt;
const fm = FileManager.local()
const path = fm.joinPath(fm.documentsDirectory(), "FreePass.txt")
const input = args.shortcutParameter

if (input === "Available" || input === "Used") {
  fm.writeString(path, input)
  Script.setShortcutOutput(`Status set to ${input}`)
} else {
  if (fm.fileExists(path)) {
    const content = fm.readString(path)
    Script.setShortcutOutput(content)
  } else {
    Script.setShortcutOutput("No status set yet.")
  }
}

Script.complete()