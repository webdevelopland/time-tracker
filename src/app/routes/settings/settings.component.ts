import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import * as Proto from 'src/proto';
import { LoadingService, FirebaseService, NotificationService } from '@/core/services';

@Component({
  selector: 'page-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnDestroy {
  limit: number;
  rate: number;
  address: string;
  name: string;
  billTo: string;
  getSub = new Subscription();
  setSub = new Subscription();

  constructor(
    public loadingService: LoadingService,
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
        this.address = settings.getWallet();
        this.name = settings.getName();
        this.billTo = settings.getBillTo();
      }
      this.loadingService.isLoading = false;
    });
  }

  save(): void {
    const settings = new Proto.Settings();
    settings.setLimit(this.limit);
    settings.setWallet(this.address);
    settings.setRate(this.rate);
    settings.setName(this.name);
    settings.setBillTo(this.billTo);
    this.setSub = this.firebaseService.setSettings(settings).subscribe(() => {
      this.notificationService.success('Saved');
    });
  }

  ngOnDestroy() {
    this.getSub.unsubscribe();
    this.setSub.unsubscribe();
  }
}
