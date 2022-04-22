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
        this.loadingService.isLoading = false;
        this.readMilestone();
      } else {
        this.getSub = this.firebaseService.getInvoice(this.id).subscribe(invoice => {
          this.getSub.unsubscribe();
          this.invoice = invoice;
          this.loadingService.isLoading = false;
          this.readMilestone();
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
  }

  readMilestone(): void {
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
      this.milestone.ended = '-';
      this.milestone.rate = this.settings.getRate();
      this.createHours(this.protoMilestone.getStartedMs(), Date.now());
    }
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
          const hourEnded: number = hour.started + HOUR;
          if (hour.started <= start && start < hourEnded) {
            if (hourEnded <= session.getEndedMs()) {
              hour.duration = hourEnded - start;
              start = hourEnded;
            } else {
              hour.duration = session.getEndedMs() - start;
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
    for (const hour of hours) {
      quarter.hours.push(hour);
      if (hour.isQuarterEnd) {
        day.quarters.push({ hours: quarter.hours });
        quarter.hours = [];
      }
      if (hour.isDayEnd) {
        const date = new Date(hour.started);
        day.label = date.toLocaleDateString('en-US', { weekday: 'long' });
        day.date = timestampToDate(hour.started);
        week.days.push(day);
        day = new Day();
      }
      if (hour.isWeekend || hour.isLast) {
        this.activity.weeks.push(week);
        week = new Week();
      }
      hour.progress = hour.duration / HOUR;
    }
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
  }
}
