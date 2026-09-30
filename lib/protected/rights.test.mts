import test from 'node:test';
import assert from 'node:assert/strict';
import { isFresh, isReason, rightOf } from './rights.ts';

const owners = new Set(['owner@example.com']);
const v = (email: string) => ({ email, userId: 'u', authTime: null });

test('the suite owner sees everything, in any agency', () => {
  assert.equal(rightOf(v('Owner@Example.com'), { agencyId: 'a1' }, owners, false), 'suite-owner');
  assert.equal(rightOf(v('owner@example.com'), {}, owners, false), 'suite-owner');
});

test('an agency admin sees their agency; a holder their own; nobody else anything', () => {
  assert.equal(rightOf(v('admin@agency.test'), { agencyId: 'a1' }, owners, true), 'agency-admin');
  assert.equal(rightOf(v('admin@agency.test'), { agencyId: null }, owners, true), null, 'no agency on the record, no agency right');
  assert.equal(rightOf(v('me@home.test'), { holders: ['ME@home.test'] }, owners, false), 'holder');
  assert.equal(rightOf(v('staff@agency.test'), { agencyId: 'a1', holders: ['me@home.test'] }, owners, false), null);
  assert.equal(rightOf(null, { agencyId: 'a1' }, owners, true), null);
  assert.equal(rightOf(v('owner@example.com'), {}, new Set(), false), null, 'no parameter read: nobody is the owner');
});

test('a full export needs a sign-in in the last 15 minutes and a listed reason', () => {
  const now = 1_800_000_000_000;
  assert.equal(isFresh(now / 1000 - 60, now), true);
  assert.equal(isFresh(now / 1000 - 16 * 60, now), false);
  assert.equal(isFresh(null, now), false);
  assert.equal(isReason('client-request'), true);
  assert.equal(isReason('because'), false);
});
