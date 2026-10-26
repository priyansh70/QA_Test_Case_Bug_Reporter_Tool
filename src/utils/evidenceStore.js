const fs = require('fs/promises');
const path = require('path');

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

// Screenshots live on disk (not in MongoDB) and are only served through authenticated endpoints.
function evidenceRoot() {
  return process.env.EVIDENCE_DIR || path.join(__dirname, '..', '..', 'data', 'evidence');
}

/**
 * Decodes and validates a screenshot data URL (PNG or JPEG only, checked by magic bytes).
 * Returns { buffer, mimeType, ext } or throws an Error with `status` 400/413.
 */
function decodeScreenshot(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) {
    throw Object.assign(new Error('Screenshot must be a base64 PNG or JPEG data URL.'), { status: 400 });
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    throw Object.assign(new Error('Screenshot is empty.'), { status: 400 });
  }
  if (buffer.length > MAX_SCREENSHOT_BYTES) {
    throw Object.assign(new Error('Screenshot exceeds the 5 MB limit.'), { status: 413 });
  }
  const isPng = buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const mimeType = match[1];
  if ((mimeType === 'image/png' && !isPng) || (mimeType === 'image/jpeg' && !isJpeg)) {
    throw Object.assign(new Error('Screenshot content does not match its declared image type.'), { status: 400 });
  }
  return { buffer, mimeType, ext: mimeType === 'image/png' ? 'png' : 'jpg' };
}

function filePath(sessionId, fileName) {
  if (!SAFE_ID.test(sessionId) || !/^[A-Za-z0-9_-]+\.(png|jpg)$/.test(fileName)) {
    throw new Error('Invalid evidence path.');
  }
  return path.join(evidenceRoot(), sessionId, fileName);
}

async function saveScreenshot(sessionId, bugId, { buffer, ext }) {
  const fileName = `${bugId}.${ext}`;
  const target = filePath(sessionId, fileName);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return fileName;
}

async function readScreenshot(sessionId, fileName) {
  return fs.readFile(filePath(sessionId, fileName));
}

async function deleteSessionEvidence(sessionId) {
  if (!SAFE_ID.test(sessionId)) throw new Error('Invalid evidence path.');
  await fs.rm(path.join(evidenceRoot(), sessionId), { recursive: true, force: true });
}

async function deleteScreenshot(sessionId, fileName) {
  await fs.rm(filePath(sessionId, fileName), { force: true });
}

module.exports = {
  deleteScreenshot,
  deleteSessionEvidence,
  decodeScreenshot,
  saveScreenshot,
  readScreenshot,
};
