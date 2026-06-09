import os from "os";
import fs from "fs";
import path from "path";

// Set DATA_DIR before any test module is imported so storage.ts picks up the temp path.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quiz-test-"));
process.env.DATA_DIR = tmpDir;

process.on("exit", () => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});
