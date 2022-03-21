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
