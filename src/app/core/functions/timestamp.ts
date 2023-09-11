import { addZero } from './zero';

export const MINUTE: number = 1000 * 60;
export const HOUR: number = MINUTE * 60;
export const DAY: number = HOUR * 24;
export const WEEK: number = DAY * 7;

interface TimestampTime {
  seconds: number;
  minutes: number;
  hours: number;
}

interface TimestampDate {
  seconds: number;
  minutes: number;
  hours: number;
  day: number;
  month: string;
  year: number;
}

export function getTimestampDuration(timestamp: number): TimestampTime {
  const date = new Date(timestamp);
  return {
    seconds: date.getSeconds(),
    minutes: date.getMinutes(),
    hours: Math.floor(timestamp / HOUR),
  };
}

function getTimestampDate(timestamp: number): TimestampDate {
  const date = new Date(timestamp);
  return {
    seconds: date.getSeconds(),
    minutes: date.getMinutes(),
    hours: date.getHours(),
    day: date.getDate(),
    month: date.toLocaleString('en-us', { month: 'short' }),
    year: date.getFullYear(),
  };
}

// Duration 127:34
export function timestampToDuration(timestamp: number): string {
  const date: TimestampTime = getTimestampDuration(timestamp);
  let dateString: string = '';
  dateString += date.hours;
  dateString += ':' + addZero(date.minutes);
  return dateString;
}

// Duration 127:34:55
export function timestampToDurationFull(timestamp: number): string {
  const date: TimestampTime = getTimestampDuration(timestamp);
  let dateString: string = '';
  dateString += date.hours;
  dateString += ':' + addZero(date.minutes);
  dateString += ':' + addZero(date.seconds);
  return dateString;
}

// Time 17:34
export function timestampToTime(timestamp: number): string {
  const date: TimestampDate = getTimestampDate(timestamp);
  let dateString: string = '';
  dateString += date.hours;
  dateString += ':' + addZero(date.minutes);
  return dateString;
}

// Date 25/Aug/2022
export function timestampToDate(timestamp: number): string {
  const date: TimestampDate = getTimestampDate(timestamp);
  let dateString: string = '';
  dateString += addZero(date.day);
  dateString += '/' + date.month;
  dateString += '/' + date.year;
  return dateString;
}

// Date 17:34 25/Aug/2022
export function timestampToTimeDate(timestamp: number): string {
  const date: TimestampDate = getTimestampDate(timestamp);
  let dateString: string = '';
  dateString += addZero(date.hours);
  dateString += ':' + addZero(date.minutes);
  dateString += ' ';
  dateString += timestampToDate(timestamp);
  return dateString;
}

// Days 112d 8hrs
export function timestampToDays(timestamp: number): string {
  const days: number = Math.floor(timestamp / DAY);
  const hours: number = Math.floor(timestamp / HOUR - days * 24);
  let str = '';
  if (days > 0) {
    str += days + 'd ';
  }
  str += hours + 'hrs';
  return str;
}
