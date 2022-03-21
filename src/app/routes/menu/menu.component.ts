import { Component } from '@angular/core';

import { AuthService, LoadingService } from '@/core/services';

@Component({
  selector: 'page-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent {
  constructor(
    private authService: AuthService,
    private LoadingService: LoadingService,
  ) {
    this.LoadingService.isLoading = false;
  }

  logOut(): void {
    this.authService.logOut().subscribe();
  }
}
