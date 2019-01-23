import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from 'angularfire2/firestore';
import { AngularFireAuth } from 'angularfire2/auth';
import * as firebase from 'firebase/app';

import { User, Track } from '@/core/interfaces';

@Injectable()
export class FirebaseService {
  online = false;
  user: string;
  private tracks: AngularFirestoreCollection<Track>;
  private users: AngularFirestoreCollection<User>;

  constructor(
    public angularFirestore: AngularFirestore,
    public angularFireAuth: AngularFireAuth,
    public router: Router,
  ) {
    this.angularFireAuth.authState.subscribe(userData => {
      this.online = !!userData;
      if (!this.online) {
        this.router.navigate(['/login']);
      } else {
        this.user = userData.email;
        this.router.navigate(['/tracks']);
      }
    });

    this.tracks = this.angularFirestore.collection('tracks');
    this.users = this.angularFirestore.collection('users');
  }

  getTracks(): Observable<Track[]> {
    return this.tracks
      .snapshotChanges()
      .pipe(
        map(actions => {
          return actions.map(action => {
            const track: Track = action.payload.doc.data();
            track.id = action.payload.doc.id;
            return track;
          });
        })
      );
  }

  getUsers(): Observable<User[]> {
    return this.users
      .snapshotChanges()
      .pipe(
        map(actions => {
          return actions.map(action => {
            const user: User = action.payload.doc.data();
            return user;
          });
        })
      );
  }

  addTrack(track: Track): Observable<void> {
    return new Observable(observer => {
      this.tracks
        .add(track)
        .then(result => {
          // Accessed
          observer.next();
        })
        .catch(() => {
          // Permission denied
          // observer.error();
        });
    });
  }

  removeTrack(id: string): Observable<void> {
    return new Observable(observer => {
      this.tracks
        .doc(id)
        .delete()
        .then(() => {
          // Accessed
          observer.next();
        })
        .catch(() => {
          // Permission denied
          // observer.error();
        });
    });
  }

  login(): Promise<any> {
    return this.angularFireAuth.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }

  logout(): void {
    this.angularFireAuth.auth.signOut();
  }
}
