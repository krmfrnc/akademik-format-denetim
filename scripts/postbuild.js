const fs = require("fs");
const path = require("path");

const exportDetailPath = path.join(__dirname, "..", ".next", "export-detail.json");

if (!fs.existsSync(exportDetailPath)) {
  fs.writeFileSync(exportDetailPath, JSON.stringify({ version: 1 }));
  console.log("Created export-detail.json for Vercel deployment");
} else {
  console.log("export-detail.json already exists");
}
