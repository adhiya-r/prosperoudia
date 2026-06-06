const fs = require('fs');
const path = require('path');

const importPattern = /@import\s+url\(['"](?<href>[^'"]+)['"]\);/g;

function resolveCssImportPath(projectRoot, href) {
  const normalizedHref = href.startsWith('/') ? href.slice(1) : href;

  return path.join(projectRoot, 'public', normalizedHref.replace(/^css\//, 'css/'));
}

function buildCssBundle(projectRoot) {
  const entryPath = path.join(projectRoot, 'public', 'css', 'main.css');
  const entryCss = fs.readFileSync(entryPath, 'utf8');
  const chunks = [];

  let match;

  while ((match = importPattern.exec(entryCss)) !== null) {
    const href = match.groups && match.groups.href ? match.groups.href : '';
    const importPath = resolveCssImportPath(projectRoot, href);

    chunks.push(fs.readFileSync(importPath, 'utf8'));
  }

  return chunks.join('\n\n');
}

module.exports = {
  buildCssBundle
};
