import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

import * as Proto from 'src/proto';
import { Activity, Milestone, Bubble, Invoice } from '../activity.interface';

@Injectable()
export class StateService {
  id: string;
  isCurrent: boolean;
  price: number;
  pm: Proto.Milestone;
  milestone = new Milestone();
  settings: Proto.Settings;
  activity: Activity;
  bubbles: Bubble[] = [];
  invoices: Invoice[] = [];
  setSub = new Subscription();
  saveSub = new Subscription();
  backupSub = new Subscription();

  reset(): void {
    this.isCurrent = undefined;
    this.price = undefined;
    this.pm = undefined;
    this.milestone = new Milestone();
    this.settings = undefined;
    this.activity = undefined;
    this.bubbles = [];
    this.invoices = [];
  }

  destroy(): void {
    this.setSub.unsubscribe();
    this.saveSub.unsubscribe();
    this.backupSub.unsubscribe();
    this.reset();
  }
}
