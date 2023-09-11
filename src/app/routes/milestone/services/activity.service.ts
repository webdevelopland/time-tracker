import { Injectable } from '@angular/core';

import {
  timestampToDuration,
  timestampToDate,
  round,
  addZero,
  MINUTE, HOUR,
} from '@/core/functions';
import { Week, Day, Six, Hour } from '../activity.interface';
import { StateService } from './state.service';

@Injectable()
export class ActivityService {
  constructor(
    private state: StateService,
  ) {}

  createHours(started: number, ended: number): void {
    let ms: number;
    const hours: Hour[] = [];
    const startedDate = new Date(started);
    ms = started -
      startedDate.getHours() * HOUR -
      startedDate.getMinutes() * MINUTE -
      startedDate.getSeconds() * 1000 -
      startedDate.getMilliseconds();
    for (let i = 0; i < 9999; i++) {
      const hour = new Hour();
      hour.started = ms;
      hours.push(hour);

      const currentDate = new Date(ms);
      if (
        currentDate.getHours() === 5 ||
        currentDate.getHours() === 11 ||
        currentDate.getHours() === 17 ||
        currentDate.getHours() === 23
      ) {
        hour.isQuarterEnd = true;
      }
      if (currentDate.getHours() === 23) {
        hour.isDayEnd = true;
      }
      if (currentDate.getDay() === 0 && currentDate.getHours() === 23) {
        hour.isWeekend = true;
      }
      if (ms >= ended && currentDate.getHours() === 23) {
        hour.isLast = true;
        break;
      }
      ms += HOUR;
    }
    this.applySessions(hours);
    this.createActivity(hours);
  }

  applySessions(hours: Hour[]): void {
    let i = 0;
    for (const bubble of this.state.pm.getBubbleList()) {
      this.state.bubbles.push({
        label: addZero(++i),
        url: '/bubble/' + this.state.id + '/' + i,
      });
      bubble.getSessionList().forEach(session => {
        let start: number = session.getStartedMs();
        for (const hour of hours) {
          if (!hour.duration) {
            hour.duration = 0;
          }
          const hourEnded: number = hour.started + HOUR;
          if (hour.started <= start && start < hourEnded) {
            if (hourEnded <= session.getEndedMs()) {
              hour.duration += hourEnded - start;
              start = hourEnded;
            } else {
              hour.duration += session.getEndedMs() - start;
              break;
            }
          }
        }
      });
    }
  }

  createActivity(hours: Hour[]): void {
    this.state.activity = { weeks: [] };
    let week = new Week();
    let day = new Day();
    const quarter: Six = { hours: [] };
    week.hours = 0;
    week.usd = 0;
    for (const hour of hours) {
      hour.hrs = this.getHour(hour);
      quarter.hours.push(hour);
      week.hours += hour.duration;
      if (hour.isQuarterEnd) {
        day.quarters.push({ hours: quarter.hours });
        quarter.hours = [];
      }
      if (hour.isDayEnd) {
        const date = new Date(hour.started);
        day.label = date.toLocaleDateString('en-US', { weekday: 'long' });
        day.date = timestampToDate(hour.started);
        day.hrs = this.getDay(day);
        week.days.push(day);
        day = new Day();
      }
      if (hour.isWeekend || hour.isLast) {
        week.hrs = timestampToDuration(week.hours);
        week.usd = week.hours / HOUR * 40;
        week.usd = round(week.usd, 2);
        this.state.activity.weeks.push(week);

        week = new Week();
        week.hours = 0;
        week.usd = 0;
      }

      const progress = hour.duration / HOUR;
      if (progress > 0) {
        hour.progress = 0.2 + progress;
        if (hour.progress > 1) {
          hour.progress = 1;
        }
      } else {
        hour.progress = 0;
      }
    }
  }

  getHour(hour: Hour): string {
    return timestampToDuration(hour.duration);
  }

  getDay(day: Day): string {
    let duration = 0;
    for (const six of day.quarters) {
      for (const hour of six.hours) {
        duration += hour.duration;
      }
    }
    return timestampToDuration(duration) + ' hrs';
  }
}
