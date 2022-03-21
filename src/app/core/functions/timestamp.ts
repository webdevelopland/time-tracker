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
  month: number;
  year: number;
}

function getTimestampTime(timestamp: number): TimestampTime {
  const date = new Date(timestamp);
  return {
    seconds: date.getSeconds(),
    minutes: date.getMinutes(),
    hours: Math.floor(timestamp / (1000 * 60 * 60)),
  };
}

function getTimestampDate(timestamp: number): TimestampDate {
  const date = new Date(timestamp);
  return {
    seconds: date.getSeconds(),
    minutes: date.getMinutes(),
    hours: date.getHours(),
    day: date.getDate(),
    month: date.getMonth() + 1,
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

// Date 25/07/2022
export function timestampToDate(timestamp: number): string {
  const date: TimestampDate = getTimestampDate(timestamp);
  let dateString: string = '';
  dateString += addZero(date.day);
  dateString += '/' + addZero(date.month);
  dateString += '/' + date.year;
  return dateString;
}

// Date 17:34 25/07/2022
export function timestampToTimeDate(timestamp: number): string {
  const date: TimestampDate = getTimestampDate(timestamp);
  let dateString: string = '';
  dateString += addZero(date.hours);
  dateString += ':' + addZero(date.minutes);
  dateString += ' ';
  dateString += addZero(date.day);
  dateString += '/' + addZero(date.month);
  dateString += '/' + date.year;
  return dateString;
}

export function timestampToDays(timestamp: number): string {
  const days: number = Math.floor(timestamp / (1000 * 60 * 60 * 24));
  let daysString: string;
  if (days > 1) {
    daysString = days + ' days';
  } else if (days === 1) {
    daysString = '1 day';
  } else {
    daysString = 'New';
  }
  return daysString;
}
