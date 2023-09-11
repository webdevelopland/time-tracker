import { Injectable } from '@angular/core';

import * as Proto from 'src/proto';
import {
  timestampToDuration,
  timestampToDays,
  timestampToTimeDate,
  cround,
  getStatus,
  fee,
  HOUR
} from '@/core/functions';
import { StateService } from './state.service';
import { ActivityService } from './activity.service';

@Injectable()
export class MilestoneService {
  constructor(
    private state: StateService,
    private activityService: ActivityService,
  ) {}

  readMilestone(price: number): void {
    this.state.price = Math.round(price);
    this.state.milestone.started = timestampToTimeDate(this.state.pm.getStartedMs());
    if (!this.state.isCurrent) {
      // Ended milestone
      const invoice: Proto.Invoice = this.state.invoices[this.state.invoices.length - 1].proto;
      const duration = this.state.pm.getEndedMs() - this.state.pm.getStartedMs();
      this.state.milestone.duration = timestampToDays(duration);
      this.state.milestone.ended = timestampToTimeDate(this.state.pm.getEndedMs());
      this.state.milestone.rate = invoice.getSettings().getRate();
      const tracked: number = this.countPaidTime();
      this.state.milestone.tracked = timestampToDuration(tracked);
      this.state.milestone.usd = Math.round(this.countInvoicesTotal());
      this.state.milestone.status = getStatus(
        tracked,
        this.state.pm.getStartedMs(),
        this.state.pm.getEndedMs(),
        invoice.getSettings().getLimit(),
      );
      this.activityService.createHours(this.state.pm.getStartedMs(), this.state.pm.getEndedMs());
    } else {
      // Ongoing milestone
      this.state.milestone.duration = timestampToDays(Date.now() - this.state.pm.getStartedMs());
      const tracked: number = this.countTrackedTime();
      this.state.milestone.left = fee(
        this.state.settings.getRate() * (tracked - this.countPaidTime()) / HOUR,
        this.state.settings.getFeeP(),
        this.state.settings.getFeeC()
      );
      this.state.milestone.usd = this.state.milestone.left + this.countInvoicesTotal();
      this.state.milestone.crypto = cround(
        this.state.milestone.left / price,
        this.state.milestone.label
      );
      this.state.milestone.ended = '-';
      this.state.milestone.rate = this.state.settings.getRate();
      this.state.milestone.status = getStatus(
        tracked, this.state.pm.getStartedMs(), Date.now(), this.state.settings.getLimit()
      );
      this.state.milestone.usd = Math.round(this.state.milestone.usd);
      this.state.milestone.left = Math.round(this.state.milestone.left);
      this.activityService.createHours(this.state.pm.getStartedMs(), Date.now());
    }
  }

  // Counts total tracked ms in the whole milestone, based on tracker data
  countTrackedTime(): number {
    let tracked: number = 0;
    for (const bubble of this.state.pm.getBubbleList()) {
      bubble.getSessionList().forEach(session => {
        tracked += session.getEndedMs() - session.getStartedMs();
      });
    }
    this.state.milestone.tracked = timestampToDuration(tracked);
    return tracked;
  }

  // Count total tracked ms in all invoices
  countPaidTime(): number {
    let paid: number = 0;
    for (const invoice of this.state.invoices) {
      paid += invoice.proto.getDurationMs();
    }
    return paid;
  }

  // Counts total usd paid, based on all invoices
  countInvoicesTotal(): number {
    let total: number = 0;
    for (const frame of this.state.invoices) {
      const invoice: Proto.Invoice = frame.proto;
      const settings: Proto.Settings = invoice.getSettings();
      const hours: number = invoice.getDurationMs() / HOUR;
      const usd: number = settings.getRate() * hours;
      total += fee(usd, settings.getFeeP(), settings.getFeeC());
    }
    return total;
  }
}
