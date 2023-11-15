import { NgModule } from '@angular/core';

import { SharedModule } from '@/shared';
import { MilestoneComponent } from './milestone.component';
import {
  ActivityService,
  InvoiceService,
  MilestoneService,
  StateService,
} from './services';

@NgModule({
  imports: [
    SharedModule,
  ],
  declarations: [
    MilestoneComponent,
  ],
  providers: [
    ActivityService,
    InvoiceService,
    MilestoneService,
    StateService,
  ]
})
export class MilestoneModule {}
