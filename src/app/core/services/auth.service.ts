import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Observable, ReplaySubject } from 'rxjs';
import { GoogleAuthProvider } from 'firebase/auth';

import { config } from '@/environments/firebase';

@Injectable()
export class AuthService {
  isOnline: boolean;
  isInit: boolean = false;
  isAdmin: boolean = false;
  uid: string;
  onlineChanges = new ReplaySubject<boolean>(1);

  constructor(
    private angularFireAuth: AngularFireAuth,
    private router: Router,
  ) {
    this.angularFireAuth.authState.subscribe(userData => {
      this.isInit = true;
      this.isOnline = !!userData && !!userData.email;
      if (this.isOnline) {
        this.uid = userData.uid;
        this.isAdmin = this.uid === config.uid;
      } else {
        this.router.navigate(['/']);
      }
      this.onlineChanges.next(this.isOnline);
    });
  }

  logInWithGoogle(): Observable<void> {
    return new Observable(observer => {
      this.angularFireAuth.signInWithPopup(new GoogleAuthProvider())
        .then(() => observer.next())
        .catch(() => observer.error());
    });
  }

  logOut(): Observable<void> {
    return new Observable(observer => {
      this.angularFireAuth.signOut()
        .then(() => observer.next())
        .catch(() => observer.error());
    });
  }
}
