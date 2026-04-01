// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: signal;
// === 1. Parse Shortcut Input ===
let input = args.shortcutParameter ?? `x::["9AM","10AM","11AM","12PM","1PM"]@@cpu::[25,30,null,35,31]@@memory::[58,60,63,59,64]@@ymin::0@@ymax::100`;
let chunks = input.split("@@");

let xLabels = [];
let seriesList = [];
let yMinOverride = null;
let yMaxOverride = null;

for (let chunk of chunks) {
  let [key, value] = chunk.split("::");
  let lower = key.trim().toLowerCase();

  try {
    let parsed = JSON.parse(value);
    if (lower === "x") xLabels = parsed;
    else if (lower === "ymin") yMinOverride = parsed;
    else if (lower === "ymax") yMaxOverride = parsed;
    else seriesList.push({ label: key.trim(), data: parsed });
  } catch (e) {
    // If it's not valid JSON, try treating as plain number
    if (lower === "ymin") yMinOverride = Number(value);
    else if (lower === "ymax") yMaxOverride = Number(value);
    else console.warn(`Skipping invalid input: ${chunk}`);
  }
}

if (xLabels.length === 0) {
  let maxLen = Math.max(...seriesList.map(s => s.data.length));
  xLabels = Array.from({ length: maxLen }, (_, i) => (i + 1).toString());
}

// === 2. Canvas Setup ===
const width = 500;
const height = 950;
const title = "System Metrics";
const scale = Device.screenScale();

const titleHeight = 30;
const legendHeight = 20 * seriesList.length + 10;
const marginTop = titleHeight + legendHeight + 20;
const marginBottom = 50;
const marginLeft = 50;
const marginRight = 20;

const graphWidth = width - marginLeft - marginRight;
const graphHeight = height - marginTop - marginBottom;

// Colors
const bgColor = new Color("#000000");
const axisColor = new Color("#888");
const gridColor = new Color("#222");
const labelColor = new Color("#ffffff");

const colorPalette = [
  new Color("#0a84ff"), new Color("#30d158"),
  new Color("#ff453a"), new Color("#ffd60a"),
  new Color("#bf5af2")
];

// Init canvas
let ctx = new DrawContext();
ctx.size = new Size(width * scale, height * scale);
ctx.opaque = true;
ctx.setFillColor(bgColor);
ctx.fillRect(new Rect(0, 0, width * scale, height * scale));
ctx.setLineWidth(1 * scale);
ctx.setFont(Font.systemFont(10 * scale));

function sp(x, y) {
  return new Point(x * scale, y * scale);
}

// === 3. Y Range ===
let allValues = seriesList.flatMap(s => s.data).filter(n => n != null);
let dataMin = Math.min(...allValues);
let dataMax = Math.max(...allValues);

let minVal = yMinOverride ?? dataMin;
let maxVal = yMaxOverride ?? dataMax;

let range = maxVal - minVal || 1;
let stepX = xLabels.length > 1 ? graphWidth / (xLabels.length - 1) : 0;

// === 4. Title + Legend ===
const titleX = marginLeft;
const legendTextX = marginLeft + 20;
const dotX = legendTextX - 10;

ctx.setFont(Font.boldSystemFont(18 * scale));
ctx.setTextColor(labelColor);
ctx.drawText(title, sp(titleX, 10));

ctx.setFont(Font.systemFont(11 * scale));
seriesList.forEach((series, i) => {
  let color = colorPalette[i % colorPalette.length];
  let y = titleHeight + i * 18 + 12;
  const dotSize = 3;
  const dotOffsetY = 7;

  ctx.setFillColor(color);
  ctx.fillEllipse(
    new Rect(dotX * scale, (y + dotOffsetY - dotSize / 2) * scale, dotSize * scale, dotSize * scale)
  );
  ctx.setTextColor(color);
  ctx.drawText(series.label, sp(legendTextX, y));
});

// === 5. Axes ===
ctx.setFillColor(axisColor);
ctx.fillRect(new Rect((marginLeft - 1) * scale, marginTop * scale, 2, graphHeight * scale));
ctx.fillRect(new Rect(marginLeft * scale, (height - marginBottom) * scale - 1, graphWidth * scale, 2));

// Grid + Y Labels
ctx.setTextColor(labelColor);
const ySteps = 4;
for (let i = 0; i <= ySteps; i++) {
  let val = maxVal - (i * range) / ySteps;
  let y = marginTop + (i * graphHeight) / ySteps;
  ctx.setFillColor(gridColor);
  ctx.fillRect(new Rect(marginLeft * scale, y * scale - 1, graphWidth * scale, 1));
  ctx.drawText(val.toFixed(0), sp(marginLeft - 40, y - 6));
}

// === 6. Plot Data ===
seriesList.forEach((series, index) => {
  let color = colorPalette[index % colorPalette.length];
  ctx.setFillColor(color);
  ctx.setTextColor(color);
  let data = series.data;

  // Connect line dots
  for (let i = 1; i < data.length; i++) {
    if (data[i] == null || data[i - 1] == null) continue;

    let x1 = xLabels.length > 1
      ? marginLeft + (i - 1) * stepX
      : marginLeft + graphWidth / 2;

    let y1 = marginTop + ((maxVal - Math.min(Math.max(data[i - 1], minVal), maxVal)) / range) * graphHeight;

    let x2 = xLabels.length > 1
      ? marginLeft + i * stepX
      : marginLeft + graphWidth / 2;

    let y2 = marginTop + ((maxVal - Math.min(Math.max(data[i], minVal), maxVal)) / range) * graphHeight;

    let dx = x2 - x1, dy = y2 - y1;
    let segments = Math.floor(Math.sqrt(dx * dx + dy * dy) / 4);
    for (let j = 0; j <= segments; j++) {
      let t = j / segments;
      let x = x1 + dx * t;
      let y = y1 + dy * t;
      ctx.fillEllipse(new Rect((x - 1.5) * scale, (y - 1.5) * scale, 3 * scale, 3 * scale));
    }
  }

  // Individual data points
  const pointSize = 6;
  for (let i = 0; i < data.length; i++) {
    if (data[i] == null) continue;

    let x = xLabels.length > 1
      ? marginLeft + i * stepX
      : marginLeft + graphWidth / 2;

    let clamped = Math.min(Math.max(data[i], minVal), maxVal);
    let y = marginTop + ((maxVal - clamped) / range) * graphHeight;

    ctx.fillEllipse(new Rect((x - pointSize / 2) * scale, (y - pointSize / 2) * scale, pointSize * scale, pointSize * scale));
  }
});

// === 7. X Axis Labels (Sparse) ===
ctx.setTextColor(labelColor);
const maxLabels = 10;
const interval = Math.ceil(xLabels.length / maxLabels);

for (let i = 0; i < xLabels.length; i++) {
  if (i % interval !== 0) continue;

  let x = xLabels.length > 1
    ? marginLeft + i * stepX
    : marginLeft + graphWidth / 2;

  let y = height - marginBottom;
  ctx.drawText(xLabels[i], sp(x - 10, y + 5));
}

// === 8. Show Image ===
let img = ctx.getImage();
let base64 = Data.fromPNG(img).toBase64String();

let wv = new WebView();
let html = `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      html, body {
        margin: 0;
        background-color: black;
        padding: 0;
        width: 100vw;
        height: 200vh;
      }
      img {
        width: 100vw;
        height: 92vh;
        object-fit: contain;
        display: block;
      }
    </style>
  </head>
  <body>
    <img src="data:image/png;base64,${base64}" />
  </body>
</html>
`;

await wv.loadHTML(html);
await wv.present(false);
if (args.shortcutParameter) {
  Safari.open("shortcuts://run-shortcut?name=App%20Returner");
}