import { Component, OnDestroy } from '@angular/core';
import { Subscription, interval, zip } from 'rxjs';
import { randstr64 } from 'rndmjs';

import * as Proto from 'src/proto';
import {
  timestampToDuration,
  timestampToDurationFull,
  Timer,
  timestampToDays,
  getSessions,
  getStatus,
  DAY
} from '@/core/functions';
import { Session } from '@/core/type';
import { LoadingService, FirebaseService, NotificationService, AuthService } from '@/core/services';

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
  durationStyle: string;
  isTracking: boolean = false;
  getSub = new Subscription();
  setSub = new Subscription();
  timerSub = new Subscription();
  autosaveSub = new Subscription();
  backupSub = new Subscription();
  sessionTimer = new Timer();
  breakTimer = new Timer();
  bubbleTimer = new Timer();
  milestoneTimer = new Timer();
  milestone: Proto.Milestone;
  bubble: Proto.Bubble;
  session: Proto.Session;

  constructor(
    public loadingService: LoadingService,
    public authService: AuthService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
  ) {
    this.loadingService.isLoading = true;
    this.load();
  }

  loadMilestone(milestone: Proto.Milestone): void {
    this.milestone = milestone;
    this.readMilestone();
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
      if (!data || !data[0] || !data[1]) {
        this.notificationService.crash('Bad data from the DB');
      } else {
        this.loadSettings(data[0]);
        this.loadMilestone(data[1]);
        this.loadingService.isLoading = false;
        this.ticking();
      }
    });
  }

  createNewBubble(): void {
    if (this.isTracking) {
      this.stop();
    }
    this.isTracking = false;
    this.session = undefined;
    if (this.bubble) {
      this.bubble.setEndedMs(Date.now());
      this.saveBackup('backup-bubble');
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

  ticking(): void {
    this.timerSub = interval(1000).subscribe(() => this.tick());
    this.autosaveSub = interval(1000 * 60).subscribe(() => {
      if (this.isTracking) {
        this.milestone.setBreakMs(Date.now());
        if (this.session) {
          this.session.setEndedMs(Date.now());
        }
        this.save();
        this.backup();
      }
    });
  }

  tick(): void {
    if (this.isTracking) {
      this.session.setEndedMs(Date.now());
      this.sessions = getSessions(this.bubble);
      this.sessionTime = timestampToDurationFull(this.sessionTimer.display());
    } else {
      this.sessionTime = timestampToDuration(this.breakTimer.display());
    }
    this.bubbleTime = timestampToDuration(this.bubbleTimer.display());
    this.milestoneTime = timestampToDuration(this.milestoneTimer.display());
    const duration: number = Date.now() - this.milestone.getStartedMs();
    this.milestoneDuration = timestampToDays(duration);
    const days: number = duration / DAY;
    if (days < 100) {
      this.durationStyle = 'normal';
    } else if (days < 120) { // Milestone max duration is 120 days
      this.durationStyle = 'warning';
    } else {
      this.durationStyle = 'stop';
    }
    this.updateStatus();
  }

  updateStatus(): void {
    if ((Date.now() - this.milestone.getStartedMs()) < 1000 * 60 * 60 * 24) {
      this.statusStyle = 'new';
    } else {
      this.status = getStatus(
        this.milestoneTimer.display(),
        this.milestone.getStartedMs(),
        Date.now(),
        this.settings.getLimit()
      );
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
    let duration: number;
    this.sessions = getSessions(this.bubble, d => duration = d);
    this.continueSession(duration);
  }

  // Updates session timer based on previous sessions, when page loads
  continueSession(duration: number): void {
    if (this.breakTimer.display() < 1000 * 60 * 5) {
      this.sessionTimer.savedMs = duration;
    }
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
    this.sessions = getSessions(this.bubble);
    this.save();
  }

  endSession(): void {
    if (this.session) {
      this.session.setEndedMs(Date.now());
      this.sessions = getSessions(this.bubble);
      this.session = undefined;
    }
  }

  backup(): void {
    const minutes: number = (new Date).getMinutes();
    if (minutes === 0) {
      this.saveBackup('backup-hour');
    }
  }

  saveBackup(doc: string): void {
    this.backupSub.unsubscribe();
    this.backupSub = this.firebaseService.setMilestone(this.milestone, doc).subscribe();
  }

  save(): void {
    this.saveBackup('backup-save');
    this.setSub = this.firebaseService.setMilestone(this.milestone).subscribe({
      error: () => this.notificationService.warning("Action can't be saved")
    });
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.setSub.unsubscribe();
    this.timerSub.unsubscribe();
    this.autosaveSub.unsubscribe();
    this.backupSub.unsubscribe();
  }
}
