import { test } from "node:test";
import assert from "node:assert/strict";
import { activityWeek, calculateEffort } from "./effort.ts";

const profile = {
  userId:1,configured:true,homeCity:null,dailyMiles:2,restDays:[0,6],
  commuteMiles:1,commuteDays:[1,2,3,4,5],
  sessions:[{id:"run",name:"Long run",miles:5,days:[6]}],weeklyMiles:20,
};
test("baseline, commute and explicit sessions are additive without duplicating days",()=>{
  assert.deepEqual(activityWeek(profile),[0,3,3,3,3,3,5]);
  assert.deepEqual(activityWeek({...profile,commuteDays:[1,1]}),[0,3,2,2,2,2,5]);
});
test("ten person scenario scales saved schedule, not recorded miles",()=>{
  const r=calculateEffort({profiles:[profile],totalMiles:100,today:"2026-09-19",endDate:"2026-09-25",participantCount:10});
  assert.equal(r.weeklyMiles,200);assert.equal(r.projectedMilesByGoal,200);
  assert.equal(r.expectedFinishDate,"2026-09-22");
  assert.equal(r.daysToFinish,4);assert.equal(r.milesPerPerson,10);
  assert.equal(r.withinGoal,true);assert.equal(r.scenario,true);
});
test("team estimates sum real profiles and disclose unconfigured members",()=>{
  const r=calculateEffort({profiles:[profile,{...profile,userId:2,configured:false,dailyMiles:0,commuteMiles:0,sessions:[]}],totalMiles:25,today:"2026-09-19",endDate:"2026-09-25"});
  assert.equal(r.weeklyMiles,20);assert.equal(r.configuredProfiles,1);
  assert.equal(r.projectedMilesByGoal,20);assert.equal(r.withinGoal,false);
  assert.equal(r.expectedFinishDate,"2026-09-26");
});
test("zero pace, finished maps, past dates and invalid inputs",()=>{
  const zero={...profile,configured:false,dailyMiles:0,commuteMiles:0,sessions:[]};
  const r=calculateEffort({profiles:[zero],totalMiles:100,today:"2026-09-19",endDate:"2026-09-18"});
  assert.equal(r.calendarDays,0);assert.equal(r.requiredPerPersonDay,null);
  assert.equal(r.expectedFinishDate,null);assert.equal(r.withinGoal,null);
  assert.equal(calculateEffort({profiles:[zero],totalMiles:0,today:"2026-09-19",endDate:"2026-10-01"}).daysToFinish,0);
  assert.throws(()=>calculateEffort({profiles:[profile],totalMiles:100,today:"2026-02-30",endDate:"2026-10-01"}));
  assert.throws(()=>calculateEffort({profiles:[profile],participantCount:0,totalMiles:100,today:"2026-09-19",endDate:"2026-10-01"}));
});
test("calendar estimates do not lose a day at daylight savings transitions",()=>{
  const r=calculateEffort({profiles:[profile],totalMiles:100,today:"2026-03-06",endDate:"2026-03-16"});
  assert.equal(r.calendarDays,11);assert.equal(r.activeDays,7);
});