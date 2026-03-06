// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: flask;
let alert1 = new Alert();
alert1.title = ("What's your favourite colour?")
alert1.addTextField("Type here")
alert1.addAction("Submit")
let response = await alert1.present()
if (response === 0) {
  script.Complete();
}
let alert2 = new Alert();
alert2.title = ("Wow, me too!")
alert2.addTextField("That's so cool")
alert2.addAction("Submit")
alert2.addCancelAction("I did not ask")
let response2 = await alert2.present()
if (response2 === 0) { 
  let alert3 = new Alert();
  alert3.addCancelAction("Yaaaaaaay")
  alert3.title = "Yay 🎉"
  let response3 = await alert3.present()
}
else {
  let alert4 = new Alert();
  alert4.title = "Screw you 😭"
  alert4.addCancelAction(":(")
  response4 = await alert4.present()
}