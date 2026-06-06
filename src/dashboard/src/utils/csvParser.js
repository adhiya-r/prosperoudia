function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === ',' && !insideQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function normalizeCsvHeader(header) {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(content) {
  const normalizedContent = String(content ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n').filter((line, index, array) => line.trim() || index < array.length - 1);

  if (!lines.length) {
    return {
      headers: [],
      rows: []
    };
  }

  const headers = parseCsvLine(lines[0]).map((header) => String(header).trim());
  const normalizedHeaders = headers.map(normalizeCsvHeader);
  const rows = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    if (!line || !line.trim()) {
      continue;
    }

    const values = parseCsvLine(line);
    const row = {};

    normalizedHeaders.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });

    rows.push(row);
  }

  return {
    headers: normalizedHeaders,
    rows
  };
}

module.exports = {
  parseCsv,
  normalizeCsvHeader
};
