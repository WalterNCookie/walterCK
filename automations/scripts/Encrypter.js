// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: robot;
const CryptoJS = importModule('Encrypting Nonsense')

// Get input from Shortcuts
const input = args.shortcutParameter

if (!input || !input.mode || !input.text) {
  Script.setShortcutOutput("Error: Invalid input")
  Script.complete()
  return
}

// Shared key + IV
const password = "REDACTED"
const key = CryptoJS.SHA256(password)
const iv = CryptoJS.enc.Utf8.parse("initialvector123")

let output

if (input.mode.toLowerCase() === "encrypt") {

  const encrypted = CryptoJS.AES.encrypt(input.text, key, { iv: iv }).toString()
  output = encrypted

} else if (input.mode.toLowerCase() === "decrypt") {

  try {
    const bytes = CryptoJS.AES.decrypt(input.text, key, { iv: iv })
    output = bytes.toString(CryptoJS.enc.Utf8) || "Error: Decryption failed"
  } catch (e) {
    output = "Error: Decryption failed"
  }

} else {
  output = "Error: Mode must be 'encrypt' or 'decrypt'"
}

Script.setShortcutOutput(output)
Script.complete()