import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../web/src/framework/core/fsm.js';

test('FSM: initial, enter/exit đúng thứ tự', () => {
  const log = [];
  const fsm = new StateMachine({
    states: {
      patrol: { enter: () => log.push('enter:patrol'), exit: () => log.push('exit:patrol') },
      chase: { enter: () => log.push('enter:chase'), exit: () => log.push('exit:chase') },
    },
    initial: 'patrol',
  });
  assert.equal(fsm.name, 'patrol');
  fsm.set('chase');
  assert.deepEqual(log, ['enter:patrol', 'exit:patrol', 'enter:chase']);
});

test('FSM: update chạy hook trạng thái hiện tại, time tăng', () => {
  let ticks = 0;
  const fsm = new StateMachine({
    states: { idle: { update: (_ctx, dt, f) => { ticks += dt; assert.ok(f.time >= 0); } } },
    initial: 'idle',
  });
  fsm.update(0.5); fsm.update(0.25);
  assert.equal(ticks, 0.75);
  assert.ok(fsm.time >= 0.75);
});

test('FSM: guard can chặn chuyển, trùng tên không chuyển lại', () => {
  const fsm = new StateMachine({
    ctx: { locked: true },
    states: {
      a: {}, b: { can: (ctx) => !ctx.locked },
    },
    initial: 'a',
  });
  assert.equal(fsm.set('b'), false);
  assert.equal(fsm.name, 'a');
  assert.equal(fsm.set('a'), false); // trùng tên, không force
  assert.equal(fsm.set('a', true), true); // force vẫn chuyển
  fsm.ctx.locked = false;
  assert.equal(fsm.set('b'), true);
});

test('FSM: onChange + trạng thái không tồn tại', () => {
  const seen = [];
  const fsm = new StateMachine({
    states: { a: {}, b: {} },
    initial: 'a',
    onChange: (to, from) => seen.push(`${from}->${to}`),
  });
  assert.equal(fsm.set('zzz'), false);
  fsm.set('b');
  assert.deepEqual(seen, ['null->a', 'a->b']); // initial cũng báo onChange (null->a)
});
