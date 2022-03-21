import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, interval, zip } from 'rxjs';
import { rand, randstr64, randCustomString, numerals } from 'rndmjs';

import * as Proto from 'src/proto';
import { timestampToTime, timestampToFullTime, Timer, timestampToDays } from '@/core/functions';
import { LoadingService, FirebaseService, NotificationService } from '@/core/services';
import { ContextDialogComponent, ConfirmDialogComponent } from '@/shared/dialogs';

@Component({
  selector: 'page-tracker',
  templateUrl: './tracker.component.html',
  styleUrls: ['./tracker.component.scss'],
})
export class TrackerComponent implements OnDestroy {
  bubbleTime: string;
  milestoneTime: string;
  milestoneDuration: string;
  label: string;
  sessionTime: string;
  settings: Proto.Settings;
  status: number;
  statusStyle: string;
  isTracking: boolean = false;
  getSub = new Subscription();
  setSub = new Subscription();
  timerSub = new Subscription();
  autosaveSub = new Subscription();
  invoiceSub = new Subscription();
  milestoneSub = new Subscription();
  sessionTimer = new Timer();
  breakTimer = new Timer();
  bubbleTimer = new Timer();
  milestoneTimer = new Timer();
  milestone: Proto.Milestone;
  bubble: Proto.Bubble;
  session: Proto.Session;

  constructor(
    public loadingService: LoadingService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    private matDialog: MatDialog,
  ) {
    this.loadingService.isLoading = true;
    this.load();
    this.ticking();
  }

  loadMilestone(milestone: Proto.Milestone): void {
    this.getSub.unsubscribe();
    if (milestone) {
      this.milestone = milestone;
      this.readMilestone();
    } else {
      this.createNewMilestone();
    }
    this.tick();

  }

  loadSettings(settings: Proto.Settings): void {
    this.settings = settings;
  }

  load(): void {
    this.getSub = zip(
      this.firebaseService.getSettings(),
      this.firebaseService.getMilestone(),
    ).subscribe(data => {
      this.getSub.unsubscribe();
      this.loadSettings(data[0]);
      this.loadMilestone(data[1]);
      this.loadingService.isLoading = false;
    });
  }

  createNewMilestone(save: boolean = true): void {
    if (this.milestone) {
      this.milestone.setEndedMs(Date.now());
      if (save) {
        this.addInvoice();
        this.milestoneSub = this.firebaseService.saveMilestone(this.milestone).subscribe();
      }
    }
    this.milestone = new Proto.Milestone();
    this.milestone.setId('W' + randCustomString(numerals, 13));
    this.milestone.setStartedMs(Date.now());
    this.milestone.setBreakMs(Date.now());
    this.createNewBubble();
    this.label = '';
    this.breakTimer.stop();
    this.milestoneTimer.destroy();
  }

  createNewBubble(): void {
    this.isTracking = false;
    this.stop();
    if (this.bubble) {
      this.bubble.setEndedMs(Date.now());
    }
    this.bubbleTimer.destroy();
    this.bubble = new Proto.Bubble();
    this.bubble.setId(randstr64(15));
    this.bubble.setStartedMs(Date.now());
    this.milestone.addBubble(this.bubble);
    this.save();
  }

  addInvoice(): void {
    const invoice = new Proto.Invoice();
    invoice.setId(this.milestone.getId());
    invoice.setStartedMs(this.milestone.getStartedMs());
    invoice.setEndedMs(this.milestone.getEndedMs());
    invoice.setDurationMs(this.milestoneTimer.display());
    invoice.setRate(this.settings.getRate());
    invoice.setStable('USD');
    invoice.setCryptocurrency('LTC');
    this.invoiceSub = this.firebaseService.setInvoice(invoice).subscribe();
  }

  ticking(): void {
    this.timerSub = interval(1000).subscribe(() => this.tick());
    this.autosaveSub = interval(1000 * 60).subscribe(() => {
      if (this.isTracking) {
        this.milestone.setBreakMs(Date.now());
        this.session.setEndedMs(Date.now());
      }
      this.save();
    });
  }

  tick(): void {
    if (this.isTracking) {
      this.sessionTime = timestampToFullTime(this.sessionTimer.display());
    } else {
      this.sessionTime = timestampToTime(this.breakTimer.display());
    }
    this.bubbleTime = timestampToTime(this.bubbleTimer.display());
    this.milestoneTime = timestampToTime(this.milestoneTimer.display());
    this.milestoneDuration = timestampToDays(Date.now() - this.milestone.getStartedMs());
    this.updateStatus();
  }

  updateStatus(): void {
    if ((Date.now() - this.milestone.getStartedMs()) < 1000 * 60 * 60 * 24 * 2) {
      this.statusStyle = 'new';
    } else {
      const HOUR: number = 1000 * 60 * 60;
      const totalHoursTracked: number = this.milestoneTimer.display() / HOUR;
      const totalHoursPassed: number = (Date.now() - this.milestone.getStartedMs()) / HOUR;
      const limitK: number = this.settings.getLimit() / (24 * 7);
      const currentK: number = totalHoursTracked / totalHoursPassed;
      this.status = Math.round(100 * currentK / limitK);
      if (this.status < 25) {
        this.statusStyle = 'slow';
      } else if (this.status < 50) {
        this.statusStyle = 'slack';
      } else if (this.status > 94 && this.status <= 100) {
        this.statusStyle = 'warning';
      } else if (this.status > 100) {
        this.statusStyle = 'overlimit';
      } else {
        this.statusStyle = 'success';
      }
    }
  }

  readMilestone(): void {
    this.milestoneTimer.savedMs = 0;
    for (const bubble of this.milestone.getBubbleList()) {
      this.bubbleTimer.savedMs = 0;
      for (const session of bubble.getSessionList()) {
        const sessionDuration = session.getEndedMs() - session.getStartedMs();
        this.bubbleTimer.savedMs += sessionDuration;
        this.milestoneTimer.savedMs += sessionDuration;
      }
      this.bubble = bubble;
    }

    this.breakTimer.savedMs = Date.now() - this.milestone.getBreakMs();
    this.breakTimer.start();
    this.label = 'Break';
  }

  toggle(): void {
    this.isTracking = !this.isTracking;
    if (this.isTracking) {
      this.start();
    } else {
      this.stop();
      this.save();
    }
    this.tick();
  }

  start(): void {
    this.label = 'Session';
    this.breakTimer.stop();

    this.sessionTimer.destroy();
    this.sessionTimer.start();
    this.addSession();

    this.bubbleTimer.start();
    this.milestoneTimer.start();
  }

  stop(): void {
    this.label = 'Break';
    this.sessionTimer.stop();
    this.endSession();

    this.bubbleTimer.stop();
    this.milestoneTimer.stop();

    this.breakTimer.destroy();
    this.breakTimer.start();
    this.milestone.setBreakMs(Date.now());
  }

  addSession(): void {
    const session = new Proto.Session();
    session.setId(randstr64(15));
    session.setStartedMs(Date.now());
    session.setEndedMs(Date.now());
    this.session = session;
    this.bubble.addSession(session);
    this.milestone.setBreakMs(Date.now());
    this.save();
  }

  endSession(): void {
    if (this.session) {
      this.session.setEndedMs(Date.now());
      this.save();
    }
  }

  askToReset(): void {
    this.matDialog.open(ConfirmDialogComponent, {
      data: { message: 'Reset the milestone?' }
    })
      .afterClosed().subscribe(confirm => {
        if (confirm) {
          this.createNewMilestone(false);
        }
      });
  }

  askToEnd(): void {
    this.matDialog.open(ContextDialogComponent, { panelClass: 'context-dialog' })
      .afterClosed().subscribe(res => {
        switch (res) {
          case 'save': this.createNewMilestone(true); break;
          case 'reset': this.askToReset(); break;
        }
      });
  }

  save(): void {
    this.setSub = this.firebaseService.setMilestone(this.milestone).subscribe();
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.setSub.unsubscribe();
    this.timerSub.unsubscribe();
    this.autosaveSub.unsubscribe();
    this.milestoneSub.unsubscribe();
  }
}
