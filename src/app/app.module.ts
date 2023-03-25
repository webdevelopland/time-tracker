import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
import { CoreModule } from './core/core.module';
import { FirebaseModule } from './import';
import { SharedModule } from './shared';
import { LoadingComponent } from './shared/loading';

@NgModule({
  declarations: [
    AppComponent,
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
    LoadingComponent,
  ],
  imports: [
    BrowserModule,
    CoreModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    SharedModule,
    FirebaseModule,
    HttpClientModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
