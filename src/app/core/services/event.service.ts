import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class EventService {
  keydown = new Subject<KeyboardEvent>();
  mouseup = new Subject<MouseEvent>();

  constructor() {
    document.addEventListener('keydown', event => {
      this.keydown.next(event);
    }, false);
    document.addEventListener('mouseup', event => {
      if (event.button === 0) { // Left mouse button
        this.mouseup.next(event);
      }
    });
  }
}
