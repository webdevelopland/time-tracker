import { NgModule } from '@angular/core';

import {
  AuthService,
  AuthGuard,
  NotificationService,
  EventService,
  FirebaseService,
  LoadingService,
  EncodingService,
} from './services';

@NgModule({
  providers: [
    AuthService,
    AuthGuard,
    NotificationService,
    EventService,
    FirebaseService,
    LoadingService,
    EncodingService,
  ],
})
export class CoreModule { }
