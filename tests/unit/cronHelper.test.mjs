import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule, closeLoader } from './load.mjs';

test('Cron Helper validation and humanization', async (t) => {
  const cronHelper = await loadModule('/src/utils/cronHelper.ts');

  // Test 1: User's exact gibberish input from screenshot
  const gibberish = 'qiodjqoidjqiodjqdjqid';
  const res1 = cronHelper.validateAndParseCron(gibberish);
  assert.equal(res1.isValid, false, 'Gibberish string should be marked invalid');
  assert.match(res1.error, /Expected 5 fields/, 'Should clearly report field count mismatch');

  // Test 2: The combined broken string from the user's screenshot
  const brokenMiddle = '0 2 * *qqdieqjeqiodjeqdjeqdjqdjqdjqodjqodjqodjqdoejqdoiqejdoiqjdoqidjqoidjqiod 0';
  const res2 = cronHelper.validateAndParseCron(brokenMiddle);
  assert.equal(res2.isValid, false, 'Token with gibberish in field should be marked invalid');

  // Test 3: Standard weekly Sunday cron
  const sunday = '0 2 * * 0';
  const res3 = cronHelper.validateAndParseCron(sunday);
  assert.equal(res3.isValid, true, '0 2 * * 0 should be valid');
  assert.match(res3.humanDescription, /Sunday at 02:00 AM/i, 'Should describe Sunday 2am');

  // Test 4: Daily at 2am
  const daily = '0 2 * * *';
  const res4 = cronHelper.validateAndParseCron(daily);
  assert.equal(res4.isValid, true, '0 2 * * * should be valid');
  assert.match(res4.humanDescription, /Runs daily at 02:00 AM/i, 'Should describe Daily 2am');

  // Test 5: Rapid polling 15m
  const m15 = '*/15 * * * *';
  const res5 = cronHelper.validateAndParseCron(m15);
  assert.equal(res5.isValid, true, '*/15 * * * * should be valid');
  assert.match(res5.humanDescription, /every 15 minutes/i, 'Should describe every 15 min');

  // Test 6: Weekdays at 2am
  const weekdays = '0 2 * * 1-5';
  const res6 = cronHelper.validateAndParseCron(weekdays);
  assert.equal(res6.isValid, true, '0 2 * * 1-5 should be valid');
  assert.match(res6.humanDescription, /weekday/i, 'Should describe weekdays');

  // Test 7: Out of range minute
  const badMin = '60 2 * * *';
  const res7 = cronHelper.validateAndParseCron(badMin);
  assert.equal(res7.isValid, false, 'Minute 60 should be invalid');
  assert.match(res7.error, /out of bounds/i, 'Should report out of bounds minute');

  // Test 8: Out of range hour
  const badHr = '0 25 * * *';
  const res8 = cronHelper.validateAndParseCron(badHr);
  assert.equal(res8.isValid, false, 'Hour 25 should be invalid');
  assert.match(res8.error, /out of bounds/i, 'Should report out of bounds hour');

  await closeLoader();
});
