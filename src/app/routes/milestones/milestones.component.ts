import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, zip } from 'rxjs';

import * as Proto from 'src/proto';
import { timestampToDate } from '@/core/functions';
import { LoadingService, FirebaseService } from '@/core/services';

interface Milestone {
  id: string;
  label: string;
  url: string;
}

@Component({
  selector: 'page-milestones',
  templateUrl: './milestones.component.html',
  styleUrls: ['./milestones.component.scss'],
})
export class MilestonesComponent implements OnDestroy {
  milestones: Milestone[] = [];
  milestoneList: Proto.Milestone[] = [];
  getSub = new Subscription();

  constructor(
    public loadingService: LoadingService,
    public firebaseService: FirebaseService,
    public activatedRoute: ActivatedRoute,
    public router: Router,
  ) {
    this.loadingService.isLoading = true;
    this.loadMilestoneList();
  }

  loadMilestoneList(): void {
    this.getSub.unsubscribe();
    this.getSub = zip(
      this.firebaseService.getMilestoneList(),
      this.firebaseService.getMilestone(),
    ).subscribe(data => {
      this.getSub.unsubscribe();
      this.milestoneList = data[0];
      this.milestoneList.push(data[1]);
      this.display();
      this.loadingService.isLoading = false;
    });
  }

  display(): void {
    this.milestones = this.milestoneList
      .sort((a, b) => {
        return b.getStartedMs() - a.getStartedMs();
      })
      .map(milestone => {
        const endMs: number = milestone.getEndedMs();
        if (endMs) {
          return {
            id: milestone.getId(),
            url: milestone.getId(),
            label: 'Ended: ' + timestampToDate(endMs),
          };
        } else {
          return {
            id: 'Current',
            url: 'current',
            label: 'Ongoing',
          };
        }
      });
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
  }
}
