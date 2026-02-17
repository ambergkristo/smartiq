const fs = require("fs");
const path = require("path");

const requiredDirs = ["backend", "frontend"];
const missing = requiredDirs.filter((dir) => !fs.existsSync(path.join(process.cwd(), dir)));

if (missing.length > 0) {
  console.error(`Missing required directories: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("smartiq dev entrypoint ready. Add backend/frontend dev runners as services are scaffolded.");