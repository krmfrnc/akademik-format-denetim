const fs = require("fs");
const path = require("path");

const dotNext = path.join(process.cwd(), ".next");
const exportDetailPath = path.join(dotNext, "export-detail.json");

console.log("[postbuild] Checking export-detail.json...");
console.log("[postbuild] .next exists:", fs.existsSync(dotNext));

if (!fs.existsSync(exportDetailPath)) {
  fs.writeFileSync(exportDetailPath, JSON.stringify({ version: 1 }));
  console.log("[postbuild] Created export-detail.json");
} else {
  console.log("[postbuild] export-detail.json already exists");
}

const files = fs.readdirSync(dotNext);
const traceFiles = files.filter((f) => f.includes("trace") || f.includes("export") || f.includes("standalone"));
console.log("[postbuild] Trace-related files in .next:", traceFiles.join(", "));
