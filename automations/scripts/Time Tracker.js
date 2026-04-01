// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: hourglass-half;
// TIME WIDGET

// DEVICE / STYLE
let width, barH, leftPadding, topPadding, bottomPadding, rightPadding, fontSize, labelFontSize, spacerSize, textBarGap

const now = new Date()
const hourNow = now.getHours()
const existentialMode = hourNow >= 19 || hourNow < 9
const deviceModel = Device.model()

// CHRISTMAS LOGIC
const isDecember = now.getMonth() === 11
const isChristmas = isDecember && now.getDate() === 25
const showChristmas = isDecember && now.getDate() <= 25
const compact = showChristmas 

// DEVICE DETECTION & SIZING
if (deviceModel === "iPhone") {
  width = 310
  barH = 3
  leftPadding = 16
  rightPadding = 12
  topPadding = compact ? 6 : 8
  bottomPadding = compact ? 6 : 8
  fontSize = 10
  labelFontSize = 10
  spacerSize = compact ? 5 : 8
  textBarGap = compact ? 1.5 : 2
} else { 
  // iPad 9 - Tightened vertical spacing to prevent clipping
  width = 280 
  barH = 3          // Thinner bars to save space
  leftPadding = 30  
  rightPadding = 24 
  topPadding = 10   // Reduced from 24
  bottomPadding = 10 // Reduced from 20
  fontSize = 11     // Slightly smaller font
  labelFontSize = 11
  spacerSize = compact ? 3 : 5 // Tightened gap between metrics
  textBarGap = 1    // Minimum gap between text and its bar
}

const w = new ListWidget()
w.backgroundColor = existentialMode ? new Color("#200000") : new Color("#000000")
w.setPadding(topPadding, leftPadding, bottomPadding, rightPadding)

// Reduced initial spacer
w.addSpacer(compact ? 2 : 4)

// Title
const titleRow = w.addStack()
titleRow.addSpacer()
const titleText = "⌛️  Time  🕐"
const title = titleRow.addText(titleText)
title.font = Font.boldSystemFont(14) // Slightly smaller title
title.textColor = new Color("#FF453A")
titleRow.addSpacer()
w.addSpacer(compact ? 2 : 4) // Reduced gap under title

// CORE TIME MATH
function getPeriodStats(start, end) {
  const tStart = start.getTime()
  const tEnd = end.getTime()
  const totalMs = tEnd - tStart
  const passedMs = Math.min(Math.max(now.getTime() - tStart, 0), totalMs)
  const percent = totalMs > 0 ? (passedMs / totalMs) * 100 : 0
  return { totalMs, passedMs, percent }
}

// PERIOD CALCULATIONS
const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
const sToday = getPeriodStats(startToday, endToday)

const day = now.getDay()
const distToMon = day === 0 ? 6 : day - 1
const startWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distToMon)
const endWeek = new Date(startWeek)
endWeek.setDate(startWeek.getDate() + 7)
const sWeek = getPeriodStats(startWeek, endWeek)

const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
const sMonth = getPeriodStats(startMonth, endMonth)

const startYear = new Date(now.getFullYear(), 0, 1)
const endYear = new Date(now.getFullYear() + 1, 0, 1)
const sYear = getPeriodStats(startYear, endYear)

const birth = new Date("2012-03-01T22:00:00+10:00")
const lifeExpectancyMs = 81.1 * 365.2425 * 86400000
const passedLifeMs = Math.max(0, now.getTime() - birth.getTime())
const lifePercent = Math.min((passedLifeMs / lifeExpectancyMs) * 100, 100)

const sLife = {
  totalMs: lifeExpectancyMs,
  passedMs: Math.min(passedLifeMs, lifeExpectancyMs),
  percent: lifePercent
}

const msIntoYear = (sLife.passedMs / sLife.totalMs) * sYear.totalMs
const compressedDate = new Date(startYear.getTime() + msIntoYear)
const lifeDateString = compressedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })

// RENDER ORDER
if (existentialMode) renderMetric(sLife, "This Life", new Color("#FF453A"), lifeDateString)

renderMetric(sToday, "Today", new Color("#0A84FF"))
renderMetric(sWeek, "This Week", new Color("#0A84FF"))
renderMetric(sMonth, "This Month", new Color("#0A84FF"))
renderMetric(sYear, "This Year", new Color("#0A84FF"))

if (!existentialMode) renderMetric(sLife, "This Life", new Color("#FF3B30"), lifeDateString)

if (showChristmas) {
  const christmas = new Date(now.getFullYear(), 11, 25)
  const startChristmas = new Date(christmas.getTime() - 25 * 86400000)
  const sChristmas = getPeriodStats(startChristmas, christmas)
  
  if (isChristmas) renderChristmasNow()
  else renderMetric(sChristmas, "Christmas", new Color("#34C759"))
}

// RENDERER
function renderMetric(stats, labelText, fillColor, lifeDisplay = null) {
  const parentStack = w.addStack()
  parentStack.layoutVertically()

  const textRow = parentStack.addStack()
  textRow.centerAlignContent()

  const label = textRow.addText(labelText)
  label.font = Font.systemFont(labelFontSize)
  label.textColor = existentialMode ? new Color("#8E8E93") : new Color("#D1D1D6")

  textRow.addSpacer()

  const mainValue = lifeDisplay ?? formatRemaining(labelText, stats.totalMs - stats.passedMs)
  const mainText = textRow.addText(mainValue)
  mainText.font = Font.systemFont(fontSize)
  mainText.textColor = new Color("#FFFFFF")

  const pct = textRow.addText(` (${stats.percent.toFixed(2)}%)`)
  pct.font = Font.systemFont(fontSize - 1)
  pct.textColor = new Color("#636366")

  parentStack.addSpacer(textBarGap)

  const barImg = parentStack.addImage(createProgress(width, barH, stats.totalMs, stats.passedMs, fillColor))
  barImg.imageSize = new Size(width, barH)

  w.addSpacer(spacerSize)
}

function renderChristmasNow() {
  const parentStack = w.addStack()
  parentStack.layoutVertically()
  const textRow = parentStack.addStack()
  textRow.addText("Christmas").font = Font.systemFont(labelFontSize)
  textRow.addSpacer()
  textRow.addText("🎉 NOW 🎉").font = Font.boldSystemFont(fontSize)
  parentStack.addSpacer(textBarGap)
  const barImg = parentStack.addImage(createProgress(width, barH, 1, 1, new Color("#34C759")))
  barImg.imageSize = new Size(width, barH)
  w.addSpacer(spacerSize)
}

function formatRemaining(type, ms) {
  const hrs = ms / 3600000
  if (type === "Today") {
    const h = Math.floor(hrs); const m = Math.floor((hrs - h) * 60)
    return `${h}h ${m}m`
  }
  const d = Math.floor(hrs / 24); const h = Math.floor(hrs % 24)
  return `${d}d ${h}h`
}

function createProgress(w, h, totalMs, passedMs, fillColor) {
  const ctx = new DrawContext()
  ctx.size = new Size(w, h)
  ctx.opaque = false
  ctx.respectScreenScale = true
  ctx.setFillColor(new Color("#2C2C2E"))
  const bgPath = new Path()
  bgPath.addRoundedRect(new Rect(0, 0, w, h), 2, 2)
  ctx.addPath(bgPath); ctx.fillPath()
  const ratio = Math.min(Math.max(passedMs / totalMs, 0), 1)
  const progW = w * ratio
  if (progW > 0) {
    ctx.setFillColor(fillColor)
    const fgPath = new Path()
    fgPath.addRoundedRect(new Rect(0, 0, progW, h), 2, 2)
    ctx.addPath(fgPath); ctx.fillPath()
  }
  return ctx.getImage()
}

Script.setWidget(w)
Script.complete()
w.presentMedium()
