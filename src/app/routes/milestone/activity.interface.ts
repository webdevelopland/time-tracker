export interface Activity {
  weeks: Week[];
}

export class Week {
  days: Day[] = [];
}

export class Day {
  label: string;
  date: string;
  quarters: Six[] = [];
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
}
