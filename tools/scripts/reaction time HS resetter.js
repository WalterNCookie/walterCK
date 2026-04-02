// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: long-arrow-alt-left;
let alert = new Alert();
alert.title = "Reset Reaction Time High Score?";
alert.message = "This will delete your iCloud-stored high score.";
alert.addAction("Yes");
alert.addCancelAction("No");

let response = await alert.present();

if (response !== -1) {
  console.log("Action confirmed!");

  const iCloudFM = FileManager.iCloud();
  const fileName = "reactionHighScore.txt";
  const iCloudPath = iCloudFM.joinPath(iCloudFM.documentsDirectory(), fileName);

  if (iCloudFM.fileExists(iCloudPath)) {
    iCloudFM.remove(iCloudPath);
    console.log("✅ High score deleted from iCloud.");
  } else {
    console.log("ℹ️ No iCloud high score found.");
  }
}