// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: golf-ball;
while (true) {
  let question = new Alert();
  question.title = "✨🔮 Magic 8 Ball ✨🔮"
  question.addTextField()
  question.addAction("Ponder")
  question.addCancelAction("Cancel")
  let result = await question.present();
  if (result === -1) {
    return;
}
  let res = ["Yes", "Of course", "YESSS", "No way", "Better luck next time bud", "You're on thin ice pal"]

let rand = Math.floor(Math.random() * res.length)
answer = (res[rand])

let anshow = new Alert();
anshow.title = "✨🔮 Magic 8 Ball ✨🔮"
anshow.message = "\n" + answer
anshow.addAction("Again")
anshow.addCancelAction("Done")

let again = await anshow.present();
if (again === -1) { break;
 }
}
Script.complete()