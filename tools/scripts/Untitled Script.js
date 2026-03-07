// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
const fmICloud = FileManager.iCloud()
const fmLocal = FileManager.local()

const iCloudDir = fmICloud.documentsDirectory()
const localDir = fmLocal.documentsDirectory()

let iCloudCount = 0
let localCount = 0

console.log("📂 --- STORAGE DISCOVERY SCAN ---")

function scan(fm, path, label) {
  console.log(`\n🔍 Checking ${label} Storage:`)
  
  if (!fm.fileExists(path)) {
    console.log(`   ⚠️ ${label} directory is not accessible.`)
    return 0
  }
  
  let contents = fm.listContents(path)
  if (contents.length === 0) {
    console.log(`   Empty.`)
    return 0
  }

  contents.forEach((item, index) => {
    let fullPath = fm.joinPath(path, item)
    let isDir = fm.isDirectory(fullPath)
    let isDownloaded = fm.isFileDownloaded(fullPath)
    
    let type = isDir ? "[FOLDER]" : "[FILE]"
    let status = isDownloaded ? "✓" : "☁️ (Evicted)"
    
    console.log(`   ${index + 1}. ${type} ${item} ${status}`)
  })
  
  return contents.length
}

// 1. Scan iCloud
iCloudCount = scan(fmICloud, iCloudDir, "iCloud")

// 2. Scan Local
localCount = scan(fmLocal, localDir, "Local (On My iPhone)")

console.log("\n--- SUMMARY ---")
console.log(`Total iCloud items: ${iCloudCount}`)
console.log(`Total Local items:  ${localCount}`)
console.log(`Grand Total:        ${iCloudCount + localCount}`)
console.log("\n--- END OF SCAN ---")
