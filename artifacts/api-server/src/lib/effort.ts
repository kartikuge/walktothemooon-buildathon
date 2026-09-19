import type { ActivityProfile, MapEstimate } from "@workspace/api-zod";

const DAY=86400000;
const round=(n:number)=>Math.round(n*100)/100;
const up=(n:number)=>Math.ceil(n*100)/100;
function calendarDay(value:string) {
  const ms=Date.parse(`${value}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value) {
    throw Object.assign(new Error("Choose a valid calendar date."),{status:400});
  }
  return ms;
}

/** Baseline excludes explicit commutes and sessions, which follow their own schedules. */
export function activityWeek(profile: Pick<ActivityProfile,"dailyMiles"|"restDays"|"commuteMiles"|"commuteDays"|"sessions">): number[] {
  return Array.from({length:7},(_,day)=>round(
    (profile.restDays.includes(day)?0:profile.dailyMiles)+
    (profile.commuteDays.includes(day)?profile.commuteMiles:0)+
    profile.sessions.reduce((sum,s)=>sum+(s.days.includes(day)?s.miles:0),0),
  ));
}

function scheduledTotal(week:number[],startWeekday:number,days:number) {
  const whole=Math.floor(days/7),remainder=days%7;
  let total=whole*week.reduce((sum,n)=>sum+n,0);
  for(let i=0;i<remainder;i++) total+=week[(startWeekday+i)%7];
  return total;
}

export function calculateEffort(input:{
  totalMiles:number; today:string; endDate:string;
  participantCount?:number; profiles:ActivityProfile[];
}):MapEstimate {
  const {totalMiles,profiles}=input;
  const start=calendarDay(input.today),end=calendarDay(input.endDate);
  if(!Number.isFinite(totalMiles)||totalMiles<0||totalMiles>100000||!profiles.length) {
    throw Object.assign(new Error("Choose a valid distance and at least one participant."),{status:400});
  }
  const actualMemberCount=profiles.length;
  const count=input.participantCount??actualMemberCount;
  if(!Number.isInteger(count)||count<1||count>10000) {
    throw Object.assign(new Error("Choose between 1 and 10,000 participants."),{status:400});
  }
  const calendarDays=Math.max(0,Math.floor((end-start)/DAY)+1);
  const startWeekday=new Date(start).getUTCDay();
  const schedule=Array.from({length:7},()=>0);
  for(const profile of profiles) activityWeek(profile).forEach((n,i)=>{schedule[i]+=n;});
  // A what-if participant count uses the mean of the actual group's saved schedules.
  const scenario=count!==actualMemberCount;
  const factor=count/actualMemberCount;
  const groupWeek=schedule.map(n=>n*factor);
  const weeklyMiles=groupWeek.reduce((sum,n)=>sum+n,0);
  const configuredProfiles=profiles.filter(p=>p.configured).length;
  // Active-day equivalent uses the selected runner's rest days; never a personal obligation.
  const referenceDays=Array.from({length:7},(_,i)=>profiles[0].restDays.includes(i)?0:1);
  const activeDays=scheduledTotal(referenceDays,startWeekday,calendarDays);
  const projectedMilesByGoal=scheduledTotal(groupWeek,startWeekday,calendarDays);
  let daysToFinish:number|null=null,expectedFinishDate:string|null=null;
  if(totalMiles===0) {daysToFinish=0;expectedFinishDate=input.today;}
  else if(weeklyMiles>0) {
    const weeks=Math.max(0,Math.ceil(totalMiles/weeklyMiles)-1);
    let remaining=totalMiles-weeks*weeklyMiles,days=weeks*7;
    for(let i=0;i<7;i++) {
      remaining-=groupWeek[(startWeekday+i)%7];days++;
      if(remaining<=1e-8) break;
    }
    // Keep far-future estimates representable as normal ISO calendar dates.
    const finish=start+(days-1)*DAY;
    if(Number.isSafeInteger(days)&&Number.isFinite(finish)&&finish<=Date.UTC(9999,11,31)) {
      daysToFinish=days;expectedFinishDate=new Date(finish).toISOString().slice(0,10);
    }
  }
  const explanations=[
    "Equal-share figures are planning illustrations, not individual quotas. All logged miles enter one shared pool.",
    `${configuredProfiles} of ${actualMemberCount} actual participants have saved activity profiles; unconfigured profiles contribute zero planned miles.`,
    scenario ? `What-if scenario: ${count} people following the average schedule of the ${actualMemberCount} actual participant(s).` : "Projection uses the actual participants' saved weekly schedules.",
    "Daily baseline excludes commutes and dedicated sessions. Explicit commutes/sessions follow their selected days, even on baseline rest days.",
    "Active-day equivalent uses the selected runner's rest days. Plans do not automatically log miles.",
    "This estimate assumes planned miles are assigned to this Map. Miles cannot be credited to multiple Maps from the same run.",
  ];
  if(weeklyMiles===0&&totalMiles>0) explanations.push("Save an activity profile to calculate an expected finish date.");
  if(weeklyMiles>0&&expectedFinishDate===null) explanations.push("At this pace the finish date is outside the supported calendar range.");
  return {
    participantCount:count,actualMemberCount,configuredProfiles,scenario,calendarDays,activeDays,
    requiredPerPersonDay:calendarDays?up(totalMiles/count/calendarDays):null,
    requiredPerActiveDay:activeDays?up(totalMiles/count/activeDays):null,
    milesPerPerson:round(totalMiles/count),weeklyMiles:round(weeklyMiles),
    projectedMilesByGoal:round(projectedMilesByGoal),expectedFinishDate,daysToFinish,
    withinGoal:totalMiles===0?true:weeklyMiles>0?projectedMilesByGoal+1e-8>=totalMiles:null,
    explanation:explanations.join(" "),
  };
}