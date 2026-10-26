const test = require('node:test');
const assert = require('node:assert/strict');
const { repairAndParseJson, parseAndFormatJson } = require('../src/ai/testCaseGenerator');

test('repairAndParseJson parses valid JSON correctly', () => {
  const input = JSON.stringify({
    feature: 'Login',
    sections: [
      {
        name: 'Auth',
        testCases: ['Verify valid login', 'Verify invalid login'],
      },
    ],
  });

  const parsed = repairAndParseJson(input);
  assert.ok(parsed);
  assert.equal(parsed.feature, 'Login');
  assert.equal(parsed.sections.length, 1);
  assert.equal(parsed.sections[0].testCases.length, 2);
});

test('repairAndParseJson strips markdown code blocks', () => {
  const input = '```json\n{"feature": "Login", "sections": [{"name": "UI", "testCases": ["Verify button"]}]}\n```';
  const parsed = repairAndParseJson(input);
  assert.ok(parsed);
  assert.equal(parsed.feature, 'Login');
  assert.equal(parsed.sections[0].testCases.length, 1);
});

test('repairAndParseJson recovers truncated JSON mid-testCase string', () => {
  const truncated = `{
  "feature": "Auto Reply",
  "sections": [
    {
      "name": "General",
      "testCases": [
        "Verify 1",
        "Verify 2"
      ]
    },
    {
      "name": "Advanced",
      "testCases": [
        "Verify 3",
        "Verify incomplete trailing`;

  const parsed = repairAndParseJson(truncated);
  assert.ok(parsed, 'Should successfully repair truncated JSON');
  assert.equal(parsed.feature, 'Auto Reply');
  assert.equal(parsed.sections.length, 2);
  assert.equal(parsed.sections[0].testCases.length, 2);
  assert.equal(parsed.sections[1].testCases.length, 1);
  assert.equal(parsed.sections[1].testCases[0], 'Verify 3');
});
