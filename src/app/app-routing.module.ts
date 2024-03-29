import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import {
  LoginComponent,
  MenuComponent,
  TrackerComponent,
  SettingsComponent,
  InvoiceComponent,
  InvoicesComponent,
  MilestonesComponent,
  MilestoneComponent,
  BubbleComponent,
  ChartComponent,
} from '@/routes';
import { AuthGuard } from '@/core/services';

const appRoutes: Routes = [
  { path: '', component: LoginComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: 'menu', component: MenuComponent },
      { path: 'tracker', component: TrackerComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'invoice/:id', component: InvoiceComponent },
      { path: 'invoices', component: InvoicesComponent },
      { path: 'milestones', component: MilestonesComponent },
      { path: 'milestone/:id', component: MilestoneComponent },
      { path: 'bubble/:id/:n', component: BubbleComponent },
      { path: 'chart/:id', component: ChartComponent },
    ],
  },
  { path: '**', component: LoginComponent },
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(appRoutes),
  ],
  exports: [
    RouterModule,
  ],
})
export class AppRoutingModule { }
