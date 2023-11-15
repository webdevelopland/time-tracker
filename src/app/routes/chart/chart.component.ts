import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, zip } from 'rxjs';
import Chart from 'chart.js/auto';

import * as Proto from 'src/proto';
import {
  timestampToDays,
  timestampToDate,
  timestampToDuration,
  getTimestampDuration,
  getStatus,
  HOUR, DAY
} from '@/core/functions';
import { LoadingService, FirebaseService, AuthService, NotificationService } from '@/core/services';

interface Point {
  x: number, y: number;
}

@Component({
  selector: 'page-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
})
export class ChartComponent implements OnDestroy {
  id: string;
  isCurrent: boolean;
  protoMilestone: Proto.Milestone;
  settings: Proto.Settings;
  chartLimit: Chart;
  chartTracked: Chart;
  step: string = '4';
  invoices: Proto.Invoice[];
  getSub = new Subscription();

  constructor(
    public loadingService: LoadingService,
    public activatedRoute: ActivatedRoute,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    public authService: AuthService,
  ) {
    this.loadingService.isLoading = false;
    this.id = this.activatedRoute.snapshot.params['id'];
    this.load();
  }

  load(): void {
    this.getSub = zip(
      this.firebaseService.getSettings(),
      this.getMilestone(),
      this.firebaseService.getInvoiceList()
    ).subscribe(data => {
      this.getSub.unsubscribe();
      if (!data || !data[0] || !data[1]) {
        this.notificationService.crash('Bad data from the DB');
      } else {
        this.loadSettings(data[0]);
        this.loadMilestone(data[1]);
        this.loadInvoices(data[2]);
        if (this.protoMilestone.getBubbleList().length > 0) {
          this.readTracked();
          this.readLimit();
        }
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

  loadInvoices(invoices: Proto.Invoice[]): void {
    this.invoices = invoices.filter(v => v.getMilestoneId() === this.protoMilestone.getId());
  }

  readTracked(cb?: Function): void {
    let tracked: number = 0;
    let ended: number;
    const points: Point[] = [{ x: this.protoMilestone.getStartedMs(), y: 0 }];
    this.protoMilestone.getBubbleList().forEach(bubble => {
      if (bubble.getSessionList().length === 0) {
        return;
      }
      tracked += this.getTrackedTime(bubble);
      ended = this.getLastSessionEnd(bubble);
      points.push({ x: ended, y: tracked });
    });
    if (cb) {
      ended = cb(points, ended, tracked);
    }
    this.drawChartTracked(
      points,
      this.protoMilestone.getStartedMs(),
      ended
    );
  }

  readLimit(cb?: Function): void {
    let max = 100;
    let tracked: number = 0;
    let ended: number;
    const points: Point[] = [{ x: this.protoMilestone.getStartedMs(), y: 0 }];
    this.protoMilestone.getBubbleList().forEach(bubble => {
      if (bubble.getSessionList().length === 0) {
        return;
      }
      tracked += this.getTrackedTime(bubble);
      ended = this.getLastSessionEnd(bubble);
      if (ended - this.protoMilestone.getStartedMs() > DAY) {
        max = this.addPoint(points, ended, max, tracked);
      }
    });
    const lastIndex = this.protoMilestone.getBubbleList().length - 1;
    const bubble = this.protoMilestone.getBubbleList()[lastIndex];
    ended = bubble.getEndedMs() || this.protoMilestone.getEndedMs() || Date.now();
    max = this.addPoint(points, ended, max, tracked);
    if (cb) {
      ended = cb(points, ended, tracked, max);
    }
    this.drawChartLimit(
      points,
      this.protoMilestone.getStartedMs(),
      ended,
      max
    );
  }

  addPoint(points: Point[], x: number, max: number, tracked: number): number {
    const status: number = getStatus(
      tracked,
      this.protoMilestone.getStartedMs(),
      x,
      this.getLimit(),
    );
    if (status > max) {
      max = Math.ceil(status + 10);
    }
    points.push({ x: x, y: status });
    return max;
  }

  getLimit(): number {
    if (this.isCurrent) {
      return this.settings.getLimit();
    } else {
      return this.invoices[this.invoices.length - 1].getSettings().getLimit();
    }
  }

  getTrackedTime(bubble: Proto.Bubble): number {
    let tracked: number = 0;
    bubble.getSessionList().forEach(session => {
      tracked += session.getEndedMs() - session.getStartedMs();
    });
    return tracked;
  }

  getLastSessionEnd(bubble: Proto.Bubble): number {
    return bubble.getSessionList()[bubble.getSessionList().length - 1].getEndedMs();
  }

  getDataset(title: string, points: Point[]) {
    return {
      datasets: [{
        label: title,
        fill: false,
        backgroundColor: '#8653a7',
        borderColor: '#8653a7',
        data: points,
        borderWidth: 1,
        pointRadius: 2,
        showLine: true,
      }]
    };
  }

  drawChartLimit(points: Point[], xmin: number, xmax: number, ymax: number): void {
    this.chartLimit = new Chart('chart-limit', {
      type: 'scatter',
      data: this.getDataset('Limit', points),
      options: {
        animation: { duration: 0 },
        scales: {
          x: {
            min: xmin,
            max: xmax,
            ticks: {
              callback: (value: number) => timestampToDate(value)
            }
          },
          y: {
            min: 0,
            max: ymax,
            ticks: {
              callback: (value: number) => value + '%'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: data => {
                const date: string = timestampToDate(data.parsed.x);
                const days: string = timestampToDays(data.parsed.x - xmin);
                return `${data.parsed.y}%, ${date}, ${days}`;
              }
            }
          }
        }
      }
    });
  }

  drawChartTracked(points: Point[], xmin: number, xmax: number): void {
    this.chartTracked = new Chart('chart-tracked', {
      type: 'scatter',
      data: this.getDataset('Tracked', points),
      options: {
        animation: { duration: 0 },
        scales: {
          x: {
            min: xmin,
            max: xmax,
            ticks: {
              callback: (value: number) => timestampToDate(value)
            }
          },
          y: {
            ticks: {
              callback: (value: number) => getTimestampDuration(value).hours + ' hrs'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: data => {
                const date: string = timestampToDate(data.parsed.x);
                const days: string = timestampToDays(data.parsed.x - xmin);
                const time: string = timestampToDuration(data.parsed.y);
                return `${time}, ${date}, ${days}`;
              }
            }
          }
        }
      }
    });

  }

  simulate(): void {
    let days: number = 0; // How much days we need to reach 100%
    let hoursPerDay: number = parseInt(this.step);
    if (hoursPerDay === undefined || hoursPerDay < 0 || hoursPerDay > 10) {
      hoursPerDay = 4;
    }
    const step: number = HOUR * hoursPerDay;

    this.chartLimit.destroy();
    this.readLimit((points, ended, tracked, max) => {
      for (days = 0; days < 90; days++) {
        if (max > 100) {
          break;
        }
        ended += DAY;
        tracked += step;
        max = this.addPoint(points, ended, max, tracked);
      }
      return ended;
    });

    this.chartTracked.destroy();
    this.readTracked((points, ended, tracked) => {
      for (let i = 0; i < days; i++) {
        ended += DAY;
        tracked += step;
        points.push({ x: ended, y: tracked });
      }
      return ended;
    });
  }

  clear(): void {
    this.chartLimit.destroy();
    this.chartTracked.destroy();
    this.readLimit();
    this.readTracked();
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
  }
}
