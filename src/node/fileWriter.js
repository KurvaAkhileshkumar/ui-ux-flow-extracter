'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Writes an object as formatted JSON to a file.
 * Creates parent directories automatically.
 */
function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath)} (${sizeKB} KB)`);
}

/**
 * Copies a buffer (screenshot) to a file path.
 */
function writeBuffer(filePath, buffer) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, buffer);
  const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  📸 ${path.basename(filePath)} (${sizeKB} KB)`);
}

/**
 * Converts any string into a safe, lowercase filename (no spaces or special chars).
 */
function sanitiseFilename(name) {
  return (name || 'section')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'section';
}

module.exports = { ensureDir, writeJSON, writeBuffer, sanitiseFilename };
