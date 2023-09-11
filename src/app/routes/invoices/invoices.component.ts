import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

import * as Proto from 'src/proto';
import { HOUR, fee } from '@/core/functions';
import { LoadingService, FirebaseService } from '@/core/services';

interface Invoice {
  id: string;
  timestamp: number;
  totalPrice: number;
  isPaid: boolean;
}

@Component({
  selector: 'page-invoices',
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss'],
})
export class InvoicesComponent implements OnDestroy {
  invoices: Invoice[] = [];
  invoiceList: Proto.Invoice[] = [];
  isFilterPaid: boolean = false;
  toggle = new FormControl();
  getSub = new Subscription();

  constructor(
    public loadingService: LoadingService,
    public firebaseService: FirebaseService,
    public activatedRoute: ActivatedRoute,
    public router: Router,
  ) {
    this.loadingService.isLoading = true;
    this.loadInvoiceList();
    this.activatedRoute.queryParams.subscribe(params => {
      if (params && params.tab) {
        this.isFilterPaid = params.tab === 'paid';
        this.toggle.setValue(this.isFilterPaid, { emitEvent: false });
        this.display();
      }
    });
    this.toggle.valueChanges.subscribe(checked => {
      this.isFilterPaid = checked;
      const tab: string = this.isFilterPaid ? 'paid' : 'unpaid';
      this.router.navigate(['/invoices'], { queryParams: { tab: tab } });
    });
  }

  loadInvoiceList(): void {
    this.getSub.unsubscribe();
    this.getSub = this.firebaseService.getInvoiceList().subscribe(invoiceList => {
      this.getSub.unsubscribe();
      this.invoiceList = invoiceList;
      this.display();
      this.loadingService.isLoading = false;
    });
  }

  display(): void {
    this.invoices = this.invoiceList
      .filter(invoice => {
        if (!this.isFilterPaid) {
          return invoice.getSignedMs() === 0;
        } else {
          return invoice.getSignedMs() !== 0;
        }
      })
      .sort((a, b) => {
        let aTime: number;
        let bTime: number;
        if (this.isFilterPaid) {
          aTime = a.getSignedMs();
          bTime = b.getSignedMs();
        } else {
          aTime = a.getEndedMs();
          bTime = b.getEndedMs();
        }
        return bTime - aTime;
      })
      .map(invoice => {
        const hours: number = invoice.getDurationMs() / HOUR;
        const time = invoice.getSignedMs() === 0 ? invoice.getEndedMs() : invoice.getSignedMs();
        let total: number = invoice.getSettings().getRate() * hours;
        total = fee(total, invoice.getSettings().getFeeP(), invoice.getSettings().getFeeC());
        return {
          id: invoice.getId(),
          timestamp: time,
          totalPrice: Math.round(total),
          isPaid: invoice.getSignedMs() !== 0,
        };
      });
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
  }
}
