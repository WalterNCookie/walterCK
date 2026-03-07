// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: tasks;
// --- CONFIGURATION ---
const GITHUB_TOKEN = "YOUR_NEW_TOKEN_HERE" 
const USER = "WalterNCookie"
const REPO = "WalterCK"
const FOLDER = "tools/scripts"

// Try to grab from both or default to Local if iCloud fails
const fm = FileManager.iCloud().isFileStoredIniCloud(FileManager.iCloud().documentsDirectory()) 
           ? FileManager.iCloud() 
           : FileManager.local()

const dir = fm.documentsDirectory()

async function githubRequest(method, url, body = null) {
  let req = new Request(url)
  req.method = method
  req.headers = {
    "Authorization": `Bearer ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json"
  }
  if (body) req.body = JSON.stringify(body)
  return await req.loadJSON()
}

function sanitizeCode(code) {
  return code.replace(/(const\s+API_KEY\s*=\s*")[^"]*"/g, '$1REDACTED"')
             .replace(/(const\s+password\s*=\s*")[^"]*"/g, '$1REDACTED"')
}

async function run() {
  // 1. Get ALL items and filter for JS or Scriptable 'Files'
  const allItems = fm.listContents(dir)
  const localFiles = allItems.filter(f => {
    return f.toLowerCase().endsWith(".js") || !f.includes(".")
  })

  const remoteBaseUrl = `https://api.github.com/repos/${USER}/${REPO}/contents/${FOLDER}`
  let remote = {}
  try {
    let remoteList = await githubRequest("GET", remoteBaseUrl)
    if (Array.isArray(remoteList)) {
      remoteList.forEach(file => { remote[file.name] = file })
    }
  } catch (e) {}

  for (let file of localFiles) {
    let path = fm.joinPath(dir, file)
    
    // Ensure file is downloaded if in iCloud
    if (fm.isFileStoredIniCloud(path)) {
      await fm.downloadFileFromiCloud(path)
    }

    // Handle Scriptable files that might not have .js extension locally
    let uploadName = file.endsWith(".js") ? file : file + ".js"
    let code = ""
    
    try {
      code = fm.readString(path)
    } catch(e) {
      // If it's a directory/package, skip it
      continue
    }

    if (!code || code.trim().length === 0) continue

    let sanitized = sanitizeCode(code)
    let contentEncoded = Data.fromString(sanitized).toBase64String()
    let remoteFile = remote[uploadName]
    
    await githubRequest(
      "PUT",
      `${remoteBaseUrl}/${encodeURIComponent(uploadName)}`,
      {
        message: `Sync: ${uploadName}`,
        content: contentEncoded,
        sha: remoteFile ? remoteFile.sha : undefined
      }
    )
  }

  // 3. Delete check
  for (let remoteName in remote) {
    const baseName = remoteName.replace(".js", "")
    if (!localFiles.includes(remoteName) && !localFiles.includes(baseName)) {
      await githubRequest(
        "DELETE",
        `${remoteBaseUrl}/${encodeURIComponent(remoteName)}`,
        {
          message: `Delete: ${remoteName}`,
          sha: remote[remoteName].sha
        }
      )
    }
  }
}

await run()
Script.complete()