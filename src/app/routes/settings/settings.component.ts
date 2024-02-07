import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import * as Proto from 'src/proto';
import { LoadingService, FirebaseService, NotificationService, AuthService } from '@/core/services';

@Component({
  selector: 'page-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnDestroy {
  limit: number;
  rate: number;
  crypto: string;
  address: string;
  feeP: number;
  feeC: number;
  billFrom: string;
  billTo: string;
  getSub = new Subscription();
  setSub = new Subscription();

  constructor(
    public loadingService: LoadingService,
    public authService: AuthService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
  ) {
    this.loadingService.isLoading = true;
    this.loadSettings();
  }

  loadSettings(): void {
    this.getSub = this.firebaseService.getSettings().subscribe(settings => {
      this.getSub.unsubscribe();
      if (settings) {
        this.limit = settings.getLimit();
        this.rate = settings.getRate();
        this.crypto = settings.getCrypto();
        this.address = settings.getAddress();
        this.feeP = settings.getFeeP();
        this.feeC = settings.getFeeC();
        this.billFrom = settings.getBillFrom();
        this.billTo = settings.getBillTo();
      }
      this.loadingService.isLoading = false;
    });
  }

  save(): void {
    const settings = new Proto.Settings();
    settings.setLimit(this.limit);
    settings.setAddress(this.address);
    settings.setCrypto(this.crypto);
    settings.setFeeP(this.feeP);
    settings.setFeeC(this.feeC);
    settings.setRate(this.rate);
    settings.setBillFrom(this.billFrom);
    settings.setBillTo(this.billTo);
    settings.setStable('USD');
    this.setSub = this.firebaseService.setSettings(settings).subscribe(() => {
      this.notificationService.success('Saved');
    }, () => {
      this.notificationService.warning('Permission denied');
    });
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.setSub.unsubscribe();
  }
}
