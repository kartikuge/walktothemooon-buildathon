export type ActivityValidationErrors = {
  dailyMiles?: string;
  commuteMiles?: string;
  commuteDays?: string;
  sessions?: Record<string, { name?: string; miles?: string; days?: string }>;
  general?: string;
};

export function validateActivityProfile(data: {
  dailyMiles: string;
  commuteMiles: string;
  commuteDays: number[];
  sessions: { id: string; name: string; miles: string; days: number[] }[];
}) {
  const errors: ActivityValidationErrors = { sessions: {} };
  let isValid = true;

  if (data.dailyMiles.trim() === "") {
    errors.dailyMiles = "Required";
    isValid = false;
  } else {
    const dailyNum = Number(data.dailyMiles);
    if (isNaN(dailyNum)) {
      errors.dailyMiles = "Must be a number";
      isValid = false;
    } else if (dailyNum < 0 || dailyNum > 200) {
      errors.dailyMiles = "Must be between 0 and 200";
      isValid = false;
    }
  }

  if (data.commuteMiles.trim() === "") {
    errors.commuteMiles = "Required";
    isValid = false;
  } else {
    const commuteNum = Number(data.commuteMiles);
    if (isNaN(commuteNum)) {
      errors.commuteMiles = "Must be a number";
      isValid = false;
    } else if (commuteNum < 0 || commuteNum > 100) {
      errors.commuteMiles = "Must be between 0 and 100";
      isValid = false;
    } else if (commuteNum > 0 && data.commuteDays.length === 0) {
      errors.commuteDays = "Select days if commute miles > 0";
      isValid = false;
    }
  }

  if (data.sessions.length > 20) {
    errors.general = "Maximum 20 sessions allowed";
    isValid = false;
  }

  data.sessions.forEach(session => {
    const sessionErrs: { name?: string; miles?: string; days?: string } = {};
    const nameTrimmed = session.name.trim();
    if (nameTrimmed.length < 1 || nameTrimmed.length > 80) {
      sessionErrs.name = "1-80 characters";
      isValid = false;
    }
    
    if (session.miles.trim() === "") {
      sessionErrs.miles = "Required";
      isValid = false;
    } else {
      const sMiles = Number(session.miles);
      if (isNaN(sMiles) || sMiles < 0.01 || sMiles > 200) {
        sessionErrs.miles = ">= 0.01 and <= 200";
        isValid = false;
      }
    }

    if (session.days.length === 0) {
      sessionErrs.days = "Select at least 1 day";
      isValid = false;
    }

    if (Object.keys(sessionErrs).length > 0) {
      errors.sessions![session.id] = sessionErrs;
    }
  });

  return { isValid, errors };
}
