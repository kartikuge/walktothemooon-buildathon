export type PlanByEndDateResult = {
  activeDays: number;
  milesPerDay: number;
  error?: string;
};

export type PlanByDailyMilesResult = {
  finishDate: Date;
  activeDays: number;
  error?: string;
};

function getActiveDaysInPeriod(start: Date, end: Date, restDays: number[]): number {
  const startMs = Date.UTC(start.getFullYear(),start.getMonth(),start.getDate());
  const endMs = Date.UTC(end.getFullYear(),end.getMonth(),end.getDate());
  if (endMs < startMs) return 0;
  
  const daysDiff = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  const wholeWeeks = Math.floor(daysDiff / 7);
  let activeDays = wholeWeeks * (7 - restDays.length);
  
  const remainingDays = daysDiff % 7;
  let currentDay = new Date(startMs + wholeWeeks * 7 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < remainingDays; i++) {
    if (!restDays.includes(currentDay.getUTCDay())) {
      activeDays++;
    }
    currentDay.setUTCDate(currentDay.getUTCDate() + 1);
  }
  
  return activeDays;
}

export function planByEndDate(
  totalMiles: number,
  startDate: Date,
  endDate: Date,
  restDays: number[]
): PlanByEndDateResult {
  restDays = [...new Set(restDays.filter(d=>Number.isInteger(d)&&d>=0&&d<=6))];
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return {activeDays:0,milesPerDay:0,error:"Choose valid dates"};
  }
  if (totalMiles <= 0 || !isFinite(totalMiles)) {
    return { activeDays: 0, milesPerDay: 0, error: 'Total miles must be a positive finite number' };
  }
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  if (end < start) {
    return { activeDays: 0, milesPerDay: 0, error: 'End date must be after or equal to start date' };
  }
  if (restDays.length >= 7) {
    return { activeDays: 0, milesPerDay: 0, error: 'Cannot rest every day of the week' };
  }
  
  const activeDays = getActiveDaysInPeriod(start, end, restDays);
  if (activeDays === 0) {
    return { activeDays: 0, milesPerDay: 0, error: 'No active days available in this period (all rest days)' };
  }
  
  return {
    activeDays,
    milesPerDay: Math.ceil(totalMiles / activeDays * 100) / 100
  };
}

export function planByDailyMiles(
  totalMiles: number,
  startDate: Date,
  dailyMiles: number,
  restDays: number[]
): PlanByDailyMilesResult {
  restDays = [...new Set(restDays.filter(d=>Number.isInteger(d)&&d>=0&&d<=6))];
  if (!Number.isFinite(startDate.getTime())) {
    return {finishDate:new Date(),activeDays:0,error:"Choose a valid start date"};
  }
  if (totalMiles <= 0 || !isFinite(totalMiles)) {
    return { finishDate: new Date(), activeDays: 0, error: 'Total miles must be positive' };
  }
  if (dailyMiles <= 0 || !isFinite(dailyMiles)) {
    return { finishDate: new Date(), activeDays: 0, error: 'Daily miles must be positive' };
  }
  if (restDays.length >= 7) {
    return { finishDate: new Date(), activeDays: 0, error: 'Cannot rest every day of the week' };
  }
  
  const activeDaysNeeded = Math.ceil(totalMiles / dailyMiles);
  if (!Number.isSafeInteger(activeDaysNeeded) || activeDaysNeeded > 1000000) {
    return {finishDate:new Date(),activeDays:0,error:"Increase daily miles to calculate a practical finish date"};
  }
  if (activeDaysNeeded === 0) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    return { finishDate: s, activeDays: 0 };
  }
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const activeDaysPerWeek = 7 - restDays.length;
  const wholeWeeks = Math.floor(activeDaysNeeded / activeDaysPerWeek);
  
  let current = new Date(start);
  let accumulated = 0;
  
  if (wholeWeeks > 0) {
    const safeWeeks = wholeWeeks - 1;
    current.setDate(current.getDate() + safeWeeks * 7);
    accumulated += safeWeeks * activeDaysPerWeek;
  }
  
  let safety = 0;
  while (accumulated < activeDaysNeeded && safety < 14) {
    if (!restDays.includes(current.getDay())) {
      accumulated++;
    }
    if (accumulated === activeDaysNeeded) {
      break; 
    }
    current.setDate(current.getDate() + 1);
    safety++;
  }
  
  return {
    finishDate: current,
    activeDays: activeDaysNeeded
  };
}
