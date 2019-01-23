import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { FirebaseService } from '@/core/services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
  ) { }

  loginUsingGoogle(): void {
    this.firebaseService.login();
  }
}
