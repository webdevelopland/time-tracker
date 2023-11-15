import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import * as Proto from 'src/proto';
import { Session } from '@/core/type';
import {
  timestampToDuration,
  getSessions
} from '@/core/functions';
import { LoadingService, FirebaseService, NotificationService } from '@/core/services';

@Component({
  selector: 'page-bubble',
  templateUrl: './bubble.component.html',
  styleUrls: ['./bubble.component.scss'],
})
export class BubbleComponent implements OnDestroy {
  id: string;
  n: number;
  bubble: Proto.Bubble;
  bubbleTime: string;
  sessions: Session[] = [];
  getSub = new Subscription();

  constructor(
    public loadingService: LoadingService,
    public activatedRoute: ActivatedRoute,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
  ) {
    this.loadingService.isLoading = true;
    this.id = this.activatedRoute.snapshot.params['id'];
    this.n = +this.activatedRoute.snapshot.params['n'];
    this.load();
  }

  load(): void {
    this.getSub = this.getMilestone().subscribe(milestone => {
      this.getSub.unsubscribe();
      if (!milestone || milestone.getBubbleList().length < this.n) {
        this.notificationService.crash('Bad data from the DB');
      } else {
        this.bubble = milestone.getBubbleList()[this.n - 1];
        this.readBubble();
        this.loadingService.isLoading = false;
      }
    });
  }

  getMilestone(): Observable<Proto.Milestone> {
    if (this.id === 'current') {
      return this.firebaseService.getMilestone();
    } else {
      return this.firebaseService.getEndedMilestone(this.id);
    }
  }

  readBubble(): void {
    let duration: number = 0;
    this.bubble.getSessionList().forEach(session => {
      const sessionDuration = session.getEndedMs() - session.getStartedMs();
      duration += sessionDuration;
    });
    this.bubbleTime = timestampToDuration(duration);
    this.sessions = getSessions(this.bubble);
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
  }
}
