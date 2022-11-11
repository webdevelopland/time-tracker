import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, zip } from 'rxjs';
import { jsPDF } from 'jspdf';

import * as Proto from 'src/proto';
import {
  round, cround,
  timestampToTime,
  timestampToDate,
  timestampToTimeDate,
  calculate,
} from '@/core/functions';
import { LoadingService, FirebaseService, NotificationService } from '@/core/services';

interface Invoice {
  id: string;
  started: string;
  ended: string;
  duration: string;
  rate: number;
  totalBeforeFee: number;
  totalUsd?: number;
  before: string;
  label: string; // E.g. LTC
  from?: string;
  billTo?: string;
  address?: string;
  feeP?: number;
  feeC?: number;
}

interface PDF {
  label: string;
  value: string;
  y: number;
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
  price: number;
  total: number;
  sent: string;
  isSent: boolean = false;
  isLoading: boolean = false;
  getSub = new Subscription();
  setSub = new Subscription();

  constructor(
    public activatedRoute: ActivatedRoute,
    public loadingService: LoadingService,
    public firebaseService: FirebaseService,
    private notificationService: NotificationService,
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
        started: timestampToDate(invoice.getStartedMs()),
        ended: timestampToDate(invoice.getEndedMs()),
        duration: timestampToTime(invoice.getDurationMs()),
        rate: invoice.getRate(),
        totalBeforeFee: round(totalUsd, 2),
        before: timestampToDate(invoice.getEndedMs() + WEEK),
        label: invoice.getCryptocurrency(),
      };
      this.invoice.totalUsd = this.invoice.totalBeforeFee;
      if (invoice.getFeeP() || invoice.getFeeC()) {
        if (invoice.getFeeP()) {
          this.invoice.feeP = invoice.getFeeP();
          this.invoice.totalUsd *= 1 - this.invoice.feeP/100;
        }
        if (invoice.getFeeC()) {
          this.invoice.feeC = invoice.getFeeC();
          this.invoice.totalUsd -= this.invoice.feeC;
        }
        this.invoice.totalUsd = round(this.invoice.totalUsd, 2);
        if (this.invoice.totalUsd <= 0) {
          this.invoice.totalUsd = 0;
          this.notificationService.warning('Total is too small');
        }
      }
      if (invoice.getSignedMs() !== 0) {
        this.invoice.from = invoice.getFrom();
        this.invoice.billTo = invoice.getBillTo();
        this.invoice.address = invoice.getAddress();
        this.updatePrice(invoice.getCryptoPrice());
        this.sent = timestampToTimeDate(invoice.getSignedMs());
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
    this.price = price;
    this.total = cround(this.invoice.totalUsd / this.price, this.invoice.label);
  }

  calculate(): void {
    this.isLoading = true;
    calculate(this.invoice.label).subscribe(price => {
      this.updatePrice(price);
      this.isLoading = false;
    }, () => {
      this.notificationService.error('Invalid cryptocurrency rates');
    });
  }

  pay(): void {
    const now: number = Date.now();
    this.sent = timestampToTimeDate(now);
    this.isSent = true;
    this.protoInvoice.setAddress(this.invoice.address);
    this.protoInvoice.setFrom(this.invoice.from);
    this.protoInvoice.setBillTo(this.invoice.billTo);
    this.protoInvoice.setCryptoPrice(this.price);
    this.protoInvoice.setSignedMs(now);
    this.setSub = this.firebaseService.setInvoice(this.protoInvoice).subscribe();
  }

  download(): void {
    const pdfList: PDF[] = [];
    let y: number = 180;
    const step = 27;
    pdfList.push({
      label: 'Milestone:',
      value: this.invoice.started + ' - ' + this.invoice.ended,
      y: y
    }); y += step;

    pdfList.push({
      label: 'Duration:',
      value: this.invoice.duration + ' hrs',
      y: y
    }); y += step;

    pdfList.push({
      label: 'Rate:',
      value: this.invoice.rate + '$ per hour',
      y: y
    }); y += step;

    if (this.invoice.feeP || this.invoice.feeC) {
      pdfList.push({
        label: 'Hours USD:',
        value: this.invoice.totalBeforeFee + '$',
        y: y
      }); y += step;
      if (this.invoice.feeP) {
        pdfList.push({
          label: '% fee:',
          value: '- 1%',
          y: y
        }); y += step;
      }
      if (this.invoice.feeC) {
        pdfList.push({
          label: '$ fee:',
          value: '- 10$',
          y: y
        }); y += step;
      }
    }

    pdfList.push({
      label: 'Total USD:',
      value: this.invoice.totalUsd + '$',
      y: y
    }); y += 37;

    pdfList.push({
      label: this.invoice.label + ' price:',
      value: this.price + '$',
      y: y
    }); y += step;

    pdfList.push({
      label: 'TOTAL:',
      value: this.total + ' ' + this.invoice.label,
      y: y
    }); y += 49;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [675, y + 50],
    });

    doc.setFontSize(40);
    doc.setTextColor('#333');
    doc.text('Invoice', 30, 71);

    doc.setFontSize(15);
    doc.text('Invoice #:', 30, 112);
    doc.text(this.id, 130, 112);
    doc.text('Description:', 30, 140);
    doc.text('Web Development', 130, 140);

    doc.text('From:', 465, 112);
    doc.text(this.invoice.from, 515, 112);
    doc.text('Bill to:', 465, 140);
    doc.text(this.invoice.billTo, 515, 140);

    doc.setDrawColor('#d81313');
    doc.setFillColor('#d81313');
    doc.rect(30, 155, 614, 2, 'F');

    pdfList.forEach(pdf => {
      doc.text(pdf.label, 77, pdf.y);
      doc.text(pdf.value, 177, pdf.y);
    });

    doc.text('Send to: ' + this.invoice.address, 30, y);
    y += 20;
    doc.text('before ' + this.invoice.before, 30, y);
    doc.text('Sent: ' + this.sent, 475, y);

    doc.addImage('/assets/webdevelopland.png', 'PNG', 570, 20, 70, 70);

    doc.save(this.id + '.pdf');
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.setSub.unsubscribe();
  }
}
