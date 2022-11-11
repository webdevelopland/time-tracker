export interface Activity {
  weeks: Week[];
}

export class Week {
  days: Day[] = [];
  hours: number; // 34.85
  hrs: string; // 34:41
  usd: number;
}

export class Day {
  label: string;
  date: string;
  quarters: Six[] = [];
  hrs: string; // 6:17 hrs
}

export interface Six {
  hours: Hour[];
}

export class Hour {
  started: number;
  duration: number = 0;
  progress: number = 0;
  isWeekend: boolean = false;
  isQuarterEnd: boolean = false;
  isDayEnd: boolean = false;
  isLast: boolean = false;
  hrs: string; // 0:34
}
