import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subscription, zip } from 'rxjs';

import * as Proto from 'src/proto';
import { calculate, addZero } from '@/core/functions';
import { LoadingService, FirebaseService, NotificationService, AuthService } from '@/core/services';
import { ContextDialogComponent } from '@/shared/dialogs';
import { StateService, InvoiceService, MilestoneService } from './services';

@Component({
  selector: 'page-milestone',
  templateUrl: './milestone.component.html',
  styleUrls: ['./milestone.component.scss'],
})
export class MilestoneComponent implements OnDestroy {
  isRatesError: boolean = false;
  getSub = new Subscription();

  constructor(
    private matDialog: MatDialog,
    private activatedRoute: ActivatedRoute,
    public loadingService: LoadingService,
    public authService: AuthService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    public state: StateService,
    private invoiceService: InvoiceService,
    private milestoneService: MilestoneService,
  ) {
    this.loadingService.isLoading = true;
    this.state.id = this.activatedRoute.snapshot.params['id'];
    this.load();
  }

  load(): void {
    this.state.reset();
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
        this.calculate();
      }
    });
  }

  getMilestone(): Observable<Proto.Milestone> {
    this.state.isCurrent = this.state.id === 'current';
    if (this.state.isCurrent) {
      return this.firebaseService.getMilestone();
    } else {
      return this.firebaseService.getEndedMilestone(this.state.id);
    }
  }

  loadMilestone(milestone: Proto.Milestone): void {
    this.state.pm = milestone;
  }

  loadSettings(settings: Proto.Settings): void {
    this.state.settings = settings;
    this.state.milestone.label = this.state.settings.getCrypto();
  }

  loadInvoices(invoices: Proto.Invoice[]): void {
    let i = 1;
    this.state.invoices = invoices
      .filter(v => v.getMilestoneId() === this.state.pm.getId())
      .map(v => false || {
        label: addZero(i++),
        url: '/invoice/' + v.getId(),
        proto: v
      });
  }

  action(): void {
    this.matDialog.open(ContextDialogComponent, { panelClass: 'context-dialog' })
      .afterClosed().subscribe(res => {
        switch (res) {
          case 'end': this.invoiceService.askToEnd(true, () => this.load()); break;
          case 'reset': this.invoiceService.askToEnd(false, () => this.load()); break;
          case 'add': {
            this.loadingService.isLoading = true;
            this.invoiceService.saveBackup('backup-invoice');
            this.firebaseService.setInvoice(this.invoiceService.getNewInvoice(Date.now()))
              .subscribe(() => this.load());
            break;
          }
        }
      });
  }

  calculate(): void {
    this.loadingService.isLoading = true;
    this.isRatesError = false;
    calculate(this.state.settings.getCrypto()).subscribe({
      next: price => {
        this.milestoneService.readMilestone(price);
        this.loadingService.isLoading = false;
      },
      error: () => {
        this.notificationService.error('Invalid cryptocurrency rates');
        this.milestoneService.readMilestone(1);
        this.isRatesError = true;
        this.loadingService.isLoading = false;
      },
    });
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.state.destroy();
  }
}
