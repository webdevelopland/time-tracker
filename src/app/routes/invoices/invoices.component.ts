import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import * as Proto from 'src/proto';
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
        this.display();
      }
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
      .sort((a, b) => b.getEndedMs() - a.getEndedMs())
      .map(invoice => {
        const HOUR: number = 1000 * 60 * 60;
        const hours: number = invoice.getDurationMs() / HOUR;
        const time = invoice.getSignedMs() === 0 ? invoice.getEndedMs() : invoice.getSignedMs();
        return {
          id: invoice.getId(),
          timestamp: time,
          totalPrice: Math.round(invoice.getRate() * hours),
          isPaid: invoice.getSignedMs() !== 0,
        };
      });
  }

  toggle(): void {
    this.isFilterPaid = !this.isFilterPaid;
    const tab: string = this.isFilterPaid ? 'paid' : 'unpaid';
    this.router.navigate(['/invoices'], { queryParams: { tab: tab } });
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
  }
}