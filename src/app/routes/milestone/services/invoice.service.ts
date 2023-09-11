import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { randstr64, randCustomString, numerals } from 'rndmjs';
import { zip } from 'rxjs';

import * as Proto from 'src/proto';
import { LoadingService, FirebaseService, NotificationService } from '@/core/services';
import { addZero } from '@/core/functions';
import { ConfirmDialogComponent } from '@/shared/dialogs';
import { StateService } from './state.service';
import { MilestoneService } from './milestone.service';

@Injectable()
export class InvoiceService {
  constructor(
    private matDialog: MatDialog,
    private router: Router,
    private loadingService: LoadingService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    private state: StateService,
    private milestoneService: MilestoneService,
  ) {}

  askToEnd(save: boolean, cb: Function): void {
    const msg: string = save ? 'End the milestone?' : 'Reset the milestone?';
    this.matDialog.open(ConfirmDialogComponent, {
      data: { message: msg }
    })
      .afterClosed().subscribe(confirm => {
        if (confirm) {
          this.loadingService.isLoading = true;
          this.createNewMilestone(cb, save);
        }
      });
  }

  getNewInvoice(now: number): Proto.Invoice {
    const invoice = new Proto.Invoice();
    invoice.setMilestoneId(this.state.pm.getId());
    invoice.setIndex(this.state.invoices.length + 1);
    invoice.setId(this.state.pm.getId() + addZero(invoice.getIndex()));
    invoice.setSettings(this.state.settings);
    invoice.setEndedMs(now);
    let duration: number = this.milestoneService.countTrackedTime();
    if (this.state.invoices.length > 0) {
      const lastInvoice: Proto.Invoice = this.state.invoices[this.state.invoices.length - 1].proto;
      invoice.setStartedMs(lastInvoice.getEndedMs());
      duration -= this.milestoneService.countPaidTime();
    } else {
      invoice.setStartedMs(this.state.pm.getStartedMs());
    }
    invoice.setDurationMs(duration);
    return invoice;
  }

  createNewMilestone(cb: Function, save: boolean = true): void {
    this.loadingService.isLoading = true;
    const now = Date.now();
    this.state.pm.setEndedMs(now);
    if (save) {
      this.saveBackup('backup-end');
      this.state.setSub = zip(
        this.firebaseService.saveMilestone(this.state.pm),
        this.firebaseService.setInvoice(this.getNewInvoice(now)),
      ).subscribe();
    } else {
      this.saveBackup('backup-bin');
      this.state.setSub = this.firebaseService.moveToBin(this.state.pm).subscribe();
    }
    const milestone = new Proto.Milestone();
    milestone.setId('W' + randCustomString(numerals, 11));
    milestone.setStartedMs(now);
    milestone.setBreakMs(now);

    const bubble = new Proto.Bubble();
    bubble.setId(randstr64(15));
    bubble.setStartedMs(now);
    milestone.addBubble(bubble);
    this.state.saveSub = this.firebaseService.setMilestone(milestone).subscribe({
      next: () => {
        if (save) {
          this.state.id = this.state.pm.getId();
          this.router.navigate(['/milestone', this.state.pm.getId()]);
        }
        cb(); // load()
      },
      error: () => this.notificationService.warning("Action can't be saved")
    });
  }

  saveBackup(doc: string): void {
    this.state.backupSub.unsubscribe();
    this.state.backupSub = this.firebaseService.setMilestone(this.state.pm, doc).subscribe();
  }
}
