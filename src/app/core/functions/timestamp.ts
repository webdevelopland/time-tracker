import { addZero } from './zero';

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

export function getTimestampTime(timestamp: number): TimestampTime {
  const date = new Date(timestamp);
  return {
    seconds: date.getSeconds(),
    minutes: date.getMinutes(),
    hours: Math.floor(timestamp / (1000 * 60 * 60)),
  };
}

export function getTimestampDate(timestamp: number): TimestampDate {
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

// Time 17:34
export function timestampToTime(timestamp: number): string {
  const date: TimestampTime = getTimestampTime(timestamp);
  let dateString: string = '';
  dateString += date.hours;
  dateString += ':' + addZero(date.minutes);
  return dateString;
}

// Time 17:34:55
export function timestampToFullTime(timestamp: number): string {
  const date: TimestampTime = getTimestampTime(timestamp);
  let dateString: string = '';
  dateString += date.hours;
  dateString += ':' + addZero(date.minutes);
  dateString += ':' + addZero(date.seconds);
  return dateString;
}

// Date 17:34
export function timestampToDateTime(timestamp: number): string {
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

export function timestampToDays(timestamp: number): string {
  const minutesFloat: number = timestamp / (1000 * 60);
  const hoursFloat: number = minutesFloat / 60;
  const daysFloat: number = hoursFloat / 24;
  const days: number = Math.floor(daysFloat);
  const hours: number = Math.floor(hoursFloat - days * 24);
  let str = '';
  if (days > 0) {
    str += days + 'd ';
  }
  str += hours + 'hrs';
  return str;
}
