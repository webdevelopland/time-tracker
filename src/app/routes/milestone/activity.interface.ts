import * as Proto from 'src/proto';

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

export class Milestone {
  id: string;
  started: string;
  ended: string;
  duration: string;
  tracked: string;
  rate: number;
  usd: number;
  left: number;
  crypto: number;
  label: string;
  status: number;
}

export interface Bubble {
  label: string;
  url: string;
}

export interface Invoice {
  label: string;
  url: string;
  proto: Proto.Invoice;
}
