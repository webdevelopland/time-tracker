import { Injectable } from '@angular/core';

@Injectable()
export class LoadingService {
  isLoading: boolean = true;

  destroy(): void {
    this.isLoading = true;
  }
}
