/**
 * Pure helpers for exporting a generated test suite ({ feature, sections[{ name, testCases[] }] }).
 */

const getSections = (suite) => (Array.isArray(suite?.sections) ? suite.sections : []);
const getCases = (section) => (Array.isArray(section?.testCases) ? section.testCases : []);
const caseText = (tc) => (typeof tc === 'string' ? tc : tc?.title || '');
const fileSafeName = (suite) =>
  (suite?.feature || 'test-cases').toLowerCase().replace(/[^a-z0-9]/g, '-');

export function suiteToText(suite) {
  const body = getSections(suite)
    .map((sec) => {
      const lines = getCases(sec).map((tc, i) => `${i + 1}. ${caseText(tc)}`);
      return [`## ${sec.name}`, ...lines].join('\n');
    })
    .join('\n\n');
  return `# Feature: ${suite?.feature || 'Test Suite'}\n\n${body}\n`;
}

export function suiteToCsv(suite) {
  const rows = [];
  if (suite?.feature) rows.push(['Feature', suite.feature]);
  rows.push(['Section', 'Test Case ID', 'Test Case']);
  let id = 0;
  getSections(suite).forEach((sec) => {
    getCases(sec).forEach((tc) => {
      id += 1;
      rows.push([sec.name, `TC${id}`, caseText(tc)]);
    });
  });
  return rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadBlob(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const downloadSuiteJson = (suite) =>
  downloadBlob(JSON.stringify(suite, null, 2), 'application/json', `${fileSafeName(suite)}.json`);

// BOM prefix keeps Excel from mangling UTF-8
export const downloadSuiteCsv = (suite) =>
  downloadBlob(`﻿${suiteToCsv(suite)}`, 'text/csv;charset=utf-8;', `${fileSafeName(suite)}.csv`);
