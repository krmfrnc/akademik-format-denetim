const fs = require("fs");
const path = require("path");

const dotNext = path.join(process.cwd(), ".next");
const exportDetailPath = path.join(dotNext, "export-detail.json");

console.log("[postbuild] Checking export-detail.json...");
console.log("[postbuild] .next exists:", fs.existsSync(dotNext));

const exportDetail = {
  version: 1,
  pages: [],
  appRoutes: [],
  dynamicRoutes: [],
  notFoundRoutes: [],
};

if (!fs.existsSync(exportDetailPath)) {
  fs.writeFileSync(exportDetailPath, JSON.stringify(exportDetail, null, 2));
  console.log("[postbuild] Created export-detail.json with full structure");
} else {
  const existing = JSON.parse(fs.readFileSync(exportDetailPath, "utf8"));
  if (!existing.pages && !existing.appRoutes) {
    fs.writeFileSync(exportDetailPath, JSON.stringify(exportDetail, null, 2));
    console.log("[postbuild] Updated export-detail.json with full structure");
  } else {
    console.log("[postbuild] export-detail.json already has full structure");
  }
}
