import { test } from 'node:test';
import assert from 'node:assert';
import { planByEndDate, planByDailyMiles } from './planner.ts';

test('planByEndDate calculates correct active days and miles', () => {
  // 14 days, 2 rest days per week (Sat=6, Sun=0)
  // Mon-Sun x 2 = 10 active days.
  const start = new Date(2024,0,1); // Monday
  const end = new Date(2024,0,14); // Sunday
  const restDays = [0, 6];
  
  const result = planByEndDate(100, start, end, restDays);
  assert.strictEqual(result.activeDays, 10);
  assert.strictEqual(result.milesPerDay, 10);
});

test('planByDailyMiles calculates correct finish date', () => {
  const start = new Date(2024,0,1); // Monday
  const restDays = [0, 6]; // Sat, Sun
  
  // 10 active days needed.
  // Mon, Tue, Wed, Thu, Fri (5)
  // Mon, Tue, Wed, Thu, Fri (5)
  // 10th active day is the second Friday: 2024-01-12.
  const result = planByDailyMiles(100, start, 10, restDays);
  assert.strictEqual(result.activeDays, 10);
  assert.strictEqual(result.finishDate.getDate(), 12);
});

test('local dates survive daylight saving time', () => {
  assert.strictEqual(planByEndDate(60,new Date(2026,2,6),new Date(2026,2,16),[0,6]).activeDays,7);
});
test('weekend starts and invalid input are handled', () => {
  const result=planByDailyMiles(10,new Date(2026,8,19),10,[0,6]);
  assert.strictEqual(result.finishDate.getDate(),21);
  assert.ok(planByDailyMiles(10,new Date(),0,[0,6]).error);
  assert.ok(planByDailyMiles(10,new Date(),1e-300,[0,6]).error);
  assert.ok(planByEndDate(10,new Date("bad"),new Date(),[0,6]).error);
  assert.ok(planByEndDate(10,new Date(2026,8,19),new Date(2026,8,20),[0,6]).error);
});
test('both planner directions agree across start weekdays', () => {
  for(let offset=0;offset<7;offset++) for(let days=1;days<=30;days++) {
    const start=new Date(2026,2,1+offset);
    const finish=planByDailyMiles(days*5,start,5,[0,6]);
    assert.strictEqual(planByEndDate(days*5,start,finish.finishDate,[0,6]).activeDays,days);
  }
});
