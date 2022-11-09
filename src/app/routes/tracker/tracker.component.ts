import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, interval, zip } from 'rxjs';
import { randstr64, randCustomString, numerals } from 'rndmjs';

import * as Proto from 'src/proto';
import {
  timestampToTime,
  timestampToFullTime,
  timestampToDateTime,
  timestampToDate,
  Timer,
  timestampToDays,
} from '@/core/functions';
import { LoadingService, FirebaseService, NotificationService } from '@/core/services';
import { ContextDialogComponent, ConfirmDialogComponent } from '@/shared/dialogs';

interface Session {
  index: number;
  start: string;
  end: string;
  duration: string;
  date: string;
}

@Component({
  selector: 'page-tracker',
  templateUrl: './tracker.component.html',
  styleUrls: ['./tracker.component.scss'],
})
export class TrackerComponent implements OnDestroy {
  bubbleTime: string;
  bubblesAmount: number;
  milestoneTime: string;
  milestoneDuration: string;
  label: string;
  sessionTime: string;
  settings: Proto.Settings;
  sessions: Session[] = [];
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
    this.milestoneTimer.destroy();
  }

  createNewBubble(): void {
    if (this.isTracking) {
      this.stop();
    }
    this.isTracking = false;
    this.session = undefined;
    if (this.bubble) {
      this.bubble.setEndedMs(Date.now());
    }
    this.bubbleTimer.destroy();
    this.bubble = new Proto.Bubble();
    this.bubble.setId(randstr64(15));
    this.bubble.setStartedMs(Date.now());
    this.milestone.addBubble(this.bubble);
    this.bubblesAmount = this.milestone.getBubbleList().length;
    this.sessions = [];
    this.sessionTimer.destroy();
    this.save();
  }

  addInvoice(): void {
    const invoice = new Proto.Invoice();
    invoice.setId(this.milestone.getId());
    invoice.setStartedMs(this.milestone.getStartedMs());
    invoice.setEndedMs(this.milestone.getEndedMs());
    invoice.setDurationMs(this.milestoneTimer.display());
    invoice.setStable('USD');
    invoice.setCryptocurrency(this.settings.getCryptocurrency());
    invoice.setRate(this.settings.getRate());
    this.invoiceSub = this.firebaseService.setInvoice(invoice).subscribe();
  }

  ticking(): void {
    this.timerSub = interval(1000).subscribe(() => this.tick());
    this.autosaveSub = interval(1000 * 60).subscribe(() => {
      if (this.isTracking) {
        this.milestone.setBreakMs(Date.now());
        if (this.session) {
          this.session.setEndedMs(Date.now());
        }
        this.save();
      }
    });
  }

  tick(): void {
    if (this.isTracking) {
      this.session.setEndedMs(Date.now());
      this.updateSessionLog();
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
    if ((Date.now() - this.milestone.getStartedMs()) < 1000 * 60 * 60 * 24) {
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
      bubble.getSessionList().forEach(session => {
        const sessionDuration = session.getEndedMs() - session.getStartedMs();
        this.bubbleTimer.savedMs += sessionDuration;
        this.milestoneTimer.savedMs += sessionDuration;
      });
      this.bubble = bubble;
    }
    this.breakTimer.savedMs = Date.now() - this.milestone.getBreakMs();
    this.breakTimer.start();
    this.label = 'Break';
    this.bubblesAmount = this.milestone.getBubbleList().length;
    const duration: number = this.updateSessionLog();
    this.continueSession(duration);
  }

  // Returns duration of last merged session
  updateSessionLog(): number {
    this.sessions = [];
    let start: number;
    let sessionDuration: number = 0;
    let skip: boolean;
    let n: number = 1;
    const sessionList: Proto.Session[] = this.bubble.getSessionList();
    sessionList.forEach((session, index) => {
      const nextSession: Proto.Session = sessionList[index + 1];
      skip = false;
      if (nextSession) {
        const breakDuration: number = nextSession.getStartedMs() - session.getEndedMs();
        if (breakDuration < 1000 * 60 * 5) {
          skip = true;
        }
      }
      sessionDuration += session.getEndedMs() - session.getStartedMs();
      if (!start) {
        start = session.getStartedMs();
      }
      if (skip) {
        return;
      }
      this.sessions.push({
        index: n,
        start: timestampToDateTime(start),
        end: timestampToDateTime(session.getEndedMs()),
        duration: timestampToTime(sessionDuration),
        date: this.getSessionDate(session, sessionList[index - 1], n),
      });
      start = undefined;
      n++;
      if (index !== sessionList.length - 1) {
        sessionDuration = 0;
      }
    });
    return sessionDuration;
  }

  // Updates session timer based on previous sessions, when page loads
  continueSession(duration: number): void {
    if (this.breakTimer.display() < 1000 * 60 * 5) {
      this.sessionTimer.savedMs = duration;
    }
  }

  getSessionDate(session: Proto.Session, prevSession: Proto.Session, n: number): string {
    if (!prevSession || n === 1 || (prevSession && !this.isOnSameDay(
      session.getStartedMs(),
      session.getEndedMs(),
      prevSession.getEndedMs(),
    ))) {
      return timestampToDate(session.getEndedMs());
    } else {
      return '';
    }
  }

  isOnSameDay(ms1: number, ms2: number, ms3: number): boolean {
    const date1 = new Date(ms1);
    const date2 = new Date(ms2);
    const date3 = new Date(ms3);
    return date1.getDate() === date2.getDate() && date2.getDate() === date3.getDate();
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

    if (this.breakTimer.display() > 1000 * 60 * 5) {
      this.sessionTimer.destroy();
    }
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
    this.updateSessionLog();
    this.save();
  }

  endSession(): void {
    if (this.session) {
      this.session.setEndedMs(Date.now());
      this.updateSessionLog();
      this.session = undefined;
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
    this.setSub = this.firebaseService.setMilestone(this.milestone).subscribe(
      () => {},
      () => {
        this.notificationService.warning("Action can't be saved");
      }
    );
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.setSub.unsubscribe();
    this.timerSub.unsubscribe();
    this.autosaveSub.unsubscribe();
    this.milestoneSub.unsubscribe();
  }
}
