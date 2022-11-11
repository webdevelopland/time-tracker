import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subscription, zip } from 'rxjs';

import * as Proto from 'src/proto';
import {
  timestampToTime,
  timestampToDate,
  timestampToDays,
  timestampToTimeDate,
  round, cround,
  calculate,
} from '@/core/functions';
import { LoadingService, FirebaseService, NotificationService } from '@/core/services';
import { Activity, Week, Day, Six, Hour } from './activity.interface';

class Milestone {
  id: string;
  started: string;
  ended: string;
  duration: string;
  tracked: string;
  rate: number;
  usd: number;
  crypto: number;
  label: string;
}

const HOUR: number = 1000 * 60 * 60;
const MINUTE: number = 1000 * 60;

@Component({
  selector: 'page-milestone',
  templateUrl: './milestone.component.html',
  styleUrls: ['./milestone.component.scss'],
})
export class MilestoneComponent implements OnDestroy {
  id: string;
  isCurrent: boolean;
  isRatesError: boolean = false;
  price: number;
  protoMilestone: Proto.Milestone;
  invoice: Proto.Invoice;
  milestone = new Milestone();
  settings: Proto.Settings;
  activity: Activity;
  getSub = new Subscription();

  constructor(
    private matDialog: MatDialog,
    private activatedRoute: ActivatedRoute,
    public loadingService: LoadingService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
  ) {
    this.id = this.activatedRoute.snapshot.params['id'];
    this.loadingService.isLoading = true;
    this.load();
  }

  load(): void {
    this.getSub = zip(
      this.firebaseService.getSettings(),
      this.getMilestone(),
    ).subscribe(data => {
      this.getSub.unsubscribe();
      this.loadSettings(data[0]);
      this.loadMilestone(data[1]);
      if (this.isCurrent) {
        this.calculate();
      } else {
        this.getSub = this.firebaseService.getInvoice(this.id).subscribe(invoice => {
          this.getSub.unsubscribe();
          this.invoice = invoice;
          this.calculate();
        });
      }
    });
  }

  getMilestone(): Observable<Proto.Milestone> {
    this.isCurrent = this.id === 'current';
    if (this.isCurrent) {
      return this.firebaseService.getMilestone();
    } else {
      return this.firebaseService.getEndedMilestone(this.id);
    }
  }

  loadMilestone(milestone: Proto.Milestone): void {
    this.protoMilestone = milestone;
  }

  loadSettings(settings: Proto.Settings): void {
    this.settings = settings;
    this.milestone.label = this.settings.getCryptocurrency();
  }

  readMilestone(price: number): void {
    this.price = Math.round(price);
    this.milestone.started = timestampToTimeDate(this.protoMilestone.getStartedMs());
    if (!this.isCurrent) {
      const duration = this.protoMilestone.getEndedMs() - this.protoMilestone.getStartedMs();
      this.milestone.duration = timestampToDays(duration);
      this.milestone.ended = timestampToTimeDate(this.protoMilestone.getEndedMs());
      this.milestone.rate = this.invoice.getRate();
      const tracked: number = this.invoice.getDurationMs();
      this.milestone.tracked = timestampToTime(tracked);
      const hours: number = tracked / HOUR;
      this.milestone.usd = Math.round(this.invoice.getRate() * hours);
      this.createHours(this.protoMilestone.getStartedMs(), this.protoMilestone.getEndedMs());
    } else {
      this.milestone.duration = timestampToDays(Date.now() - this.protoMilestone.getStartedMs());
      const tracked: number = this.countTrackedTime();
      const hours: number = tracked / HOUR;
      this.milestone.usd = Math.round(this.settings.getRate() * hours);
      this.milestone.crypto = cround(this.settings.getRate() * hours / price, this.milestone.label);
      this.milestone.ended = '-';
      this.milestone.rate = this.settings.getRate();
      this.createHours(this.protoMilestone.getStartedMs(), Date.now());
    }
  }

  calculate(): void {
    this.loadingService.isLoading = true;
    this.isRatesError = false;
    calculate(this.settings.getCryptocurrency()).subscribe(price => {
      this.readMilestone(price);
      this.loadingService.isLoading = false;
    }, () => {
      this.notificationService.error('Invalid cryptocurrency rates');
      this.readMilestone(1);
      this.isRatesError = true;
      this.loadingService.isLoading = false;
    });
  }

  countTrackedTime(): number {
    let tracked: number = 0;
    for (const bubble of this.protoMilestone.getBubbleList()) {
      bubble.getSessionList().forEach(session => {
        tracked += session.getEndedMs() - session.getStartedMs();
      });
    }
    this.milestone.tracked = timestampToTime(tracked);
    return tracked;
  }

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
    for (const bubble of this.protoMilestone.getBubbleList()) {
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
    this.activity = { weeks: [] };
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
        week.hrs = timestampToTime(week.hours);
        week.usd = week.hours / HOUR * 40;
        week.usd = round(week.usd, 2);
        this.activity.weeks.push(week);

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
    return timestampToTime(hour.duration);
  }

  getDay(day: Day): string {
    let duration = 0;
    for (const six of day.quarters) {
      for (const hour of six.hours) {
        duration += hour.duration;
      }
    }
    return timestampToTime(duration) + ' hrs';
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
  }
}
