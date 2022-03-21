import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, zip } from 'rxjs';
import { jsPDF } from 'jspdf';

import * as Proto from 'src/proto';
import { round, timestampToTime, timestampToDate, timestampToTimeDate } from '@/core/functions';
import { LoadingService, FirebaseService } from '@/core/services';

interface Invoice {
  id: string;
  started: number;
  ended: number;
  duration: string;
  rate: number;
  totalUsd: number;
  before: number;
  from?: string;
  billTo?: string;
  address?: string;
}

const HOUR: number = 1000 * 60 * 60;

@Component({
  selector: 'page-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss'],
})
export class InvoiceComponent implements OnDestroy {
  id: string;
  invoice: Invoice;
  protoInvoice: Proto.Invoice;
  settings: Proto.Settings;
  litecoinPrice: number;
  total: number;
  sent: number;
  isSent: boolean = false;
  isLoading: boolean = false;
  getSub = new Subscription();
  setSub = new Subscription();

  constructor(
    public activatedRoute: ActivatedRoute,
    public loadingService: LoadingService,
    public firebaseService: FirebaseService,
  ) {
    this.id = this.activatedRoute.snapshot.params['id'];
    this.loadingService.isLoading = true;
    this.load();
  }

  loadInvoice(invoice: Proto.Invoice): void {
    if (invoice) {
      this.protoInvoice = invoice;
      const hours: number = invoice.getDurationMs() / HOUR;
      const totalUsd: number = invoice.getRate() * hours;
      const WEEK: number = HOUR * 24 * 7;
      this.invoice = {
        id: invoice.getId(),
        started: invoice.getStartedMs(),
        ended: invoice.getEndedMs(),
        duration: timestampToTime(invoice.getDurationMs()),
        rate: invoice.getRate(),
        totalUsd: round(totalUsd, 2),
        before: invoice.getEndedMs() + WEEK,
      };
      if (invoice.getSignedMs() !== 0) {
        this.invoice.from = invoice.getFrom();
        this.invoice.billTo = invoice.getBillTo();
        this.invoice.address = invoice.getAddress();
        this.updatePrice(invoice.getCryptoPrice());
        this.sent = invoice.getSignedMs();
        this.isSent = true;
      } else {
        this.invoice.from = this.settings.getName();
        this.invoice.billTo = this.settings.getBillTo();
        this.invoice.address = this.settings.getWallet();
        this.calculate();
      }
    }
  }

  loadSettings(settings: Proto.Settings): void {
    this.settings = settings;
  }

  load(): void {
    this.getSub = zip(
      this.firebaseService.getSettings(),
      this.firebaseService.getInvoice(this.id),
    ).subscribe(data => {
      this.getSub.unsubscribe();
      this.loadSettings(data[0]);
      this.loadInvoice(data[1]);
      this.loadingService.isLoading = false;
    });
  }

  updatePrice(price: number): void {
    this.litecoinPrice = price;
    this.total = round(this.invoice.totalUsd / this.litecoinPrice, 3);
  }

  calculate(): void {
    this.isLoading = true;
    let url: string = 'https://min-api.cryptocompare.com/data/v2/histominute';
    url += '?fsym=LTC';
    url += '&tsym=USD';
    url += '&limit=119';
    url += '&api_key=0646cc7b8a4d4b54926c74e0b20253b57fd4ee406df79b3d57d5439874960146';
    fetch(url)
      .then(response => {
        if (response.status === 200) {
          return response.json();
        }
      })
      .then(json => {
        this.updatePrice(json.Data.Data[0].close);
        this.isLoading = false;
      })
      .catch(() => {});
  }

  pay(): void {
    this.sent = Date.now();
    this.isSent = true;
    this.protoInvoice.setAddress(this.invoice.address);
    this.protoInvoice.setFrom(this.invoice.from);
    this.protoInvoice.setBillTo(this.invoice.billTo);
    this.protoInvoice.setCryptoPrice(this.litecoinPrice);
    this.protoInvoice.setSignedMs(this.sent);
    this.setSub = this.firebaseService.setInvoice(this.protoInvoice).subscribe();
  }

  download(): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [675, 412],
    });

    doc.setFontSize(40);
    doc.text('Invoice', 35, 71);

    doc.setFontSize(15);
    doc.text('Invoice #:', 35, 112);
    doc.text(this.id, 135, 112);
    doc.text('Description:', 35, 140);
    doc.text('Web Development', 135, 140);

    doc.text('From:', 470, 112);
    doc.text(this.invoice.from, 520, 112);
    doc.text('Bill to:', 470, 140);
    doc.text(this.invoice.billTo, 520, 140);

    doc.setDrawColor('#d81313');
    doc.setFillColor('#d81313');
    doc.rect(35, 155, 614, 2, 'F');

    doc.text('Milestone:', 82, 180);
    let period: string = timestampToDate(this.invoice.started);
    period += ' - ' + timestampToDate(this.invoice.ended);
    doc.text(period, 182, 180);
    doc.text('Duration:', 82, 207);
    doc.text(this.invoice.duration + ' hrs', 182, 207);
    doc.text('Rate:', 82, 234);
    doc.text(this.invoice.rate + '$ per hour', 182, 234);
    doc.text('Total USD:', 82, 261);
    doc.text(this.invoice.totalUsd + '$', 182, 261);
    doc.text('Litecoin price:', 82, 300);
    doc.text(this.litecoinPrice + '$', 182, 300);
    doc.text('TOTAL:', 82, 327);
    doc.text(this.total + ' LTC', 182, 327);
    doc.text('Send to: ' + this.invoice.address, 35, 372);
    doc.text('before ' + timestampToDate(this.invoice.before), 35, 389);
    doc.text('Sent: ' + timestampToTimeDate(this.sent), 490, 389);

    doc.addImage('/assets/webdevelopland.png', 'PNG', 570, 15, 70, 70,);

    doc.save(this.id + '.pdf');
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.setSub.unsubscribe();
  }
}
