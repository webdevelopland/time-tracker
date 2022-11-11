import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import * as Proto from 'src/proto';
import { EncodingService } from './encoding.service';
import { AuthService } from './auth.service';

interface FirebaseElement {
  proto: string;
}

@Injectable()
export class FirebaseService {
  constructor(
    private db: AngularFirestore,
    private encodingService: EncodingService,
    private authService: AuthService,
  ) { }

  getInvoiceList(): Observable<Proto.Invoice[]> {
    return this.db.collection('/invoices')
      .snapshotChanges()
      .pipe(
        map(action => action.map(a => {
          const firebaseElement = a.payload.doc.data() as FirebaseElement;
          return Proto.Invoice.deserializeBinary(
            this.encodingService.base64ToUint8Array(firebaseElement.proto)
          );
        })),
      );
  }

  getInvoice(id: string): Observable<Proto.Invoice> {
    return this.db.collection('/invoices')
      .doc(id)
      .snapshotChanges()
      .pipe(
        map(action => {
          const firebaseElement = action.payload.data() as FirebaseElement;
          if (firebaseElement && firebaseElement.proto) {
            return Proto.Invoice.deserializeBinary(
              this.encodingService.base64ToUint8Array(firebaseElement.proto)
            );
          } else {
            return;
          }
        }),
      );
  }

  setInvoice(invoice: Proto.Invoice): Observable<void> {
    return new Observable(observer => {
      this.db.collection('/invoices')
        .doc(invoice.getId())
        .set({
          proto: this.encodingService.uint8ArrayToBase64(invoice.serializeBinary()),
        })
        .then(() => observer.next())
        .catch(() => observer.error());
    });
  }

  setSettings(settings: Proto.Settings): Observable<void> {
    return new Observable(observer => {
      this.db.collection('/settings')
        .doc('dev')
        .set({
          proto: this.encodingService.uint8ArrayToBase64(settings.serializeBinary()),
        })
        .then(() => observer.next())
        .catch(() => observer.error());
    });
  }

  getSettings(): Observable<Proto.Settings> {
    return this.db.collection('/settings')
      .doc('dev')
      .snapshotChanges()
      .pipe(
        map(action => {
          const firebaseElement = action.payload.data() as FirebaseElement;
          if (firebaseElement && firebaseElement.proto) {
            return Proto.Settings.deserializeBinary(
              this.encodingService.base64ToUint8Array(firebaseElement.proto)
            );
          } else {
            return;
          }
        }),
      );
  }

  getMilestone(): Observable<Proto.Milestone> {
    return this.db.collection('/milestone')
      .doc('dev')
      .snapshotChanges()
      .pipe(
        map(action => {
          const firebaseElement = action.payload.data() as FirebaseElement;
          if (firebaseElement && firebaseElement.proto) {
            return Proto.Milestone.deserializeBinary(
              this.encodingService.base64ToUint8Array(firebaseElement.proto)
            );
          } else {
            return;
          }
        }),
      );
  }

  setMilestone(milestone: Proto.Milestone): Observable<void> {
    return new Observable(observer => {
      this.db.collection('/milestone')
        .doc('dev')
        .set({
          proto: this.encodingService.uint8ArrayToBase64(milestone.serializeBinary()),
        })
        .then(() => observer.next())
        .catch(() => observer.error());
    });
  }

  saveMilestone(milestone: Proto.Milestone): Observable<void> {
    return new Observable(observer => {
      this.db.collection('/milestones')
        .doc(milestone.getId())
        .set({
          proto: this.encodingService.uint8ArrayToBase64(milestone.serializeBinary()),
        })
        .then(() => observer.next())
        .catch(() => observer.error());
    });
  }

  getMilestoneList(): Observable<Proto.Milestone[]> {
    return this.db.collection('/milestones')
      .snapshotChanges()
      .pipe(
        map(action => action.map(a => {
          const firebaseElement = a.payload.doc.data() as FirebaseElement;
          return Proto.Milestone.deserializeBinary(
            this.encodingService.base64ToUint8Array(firebaseElement.proto)
          );
        })),
      );
  }

  getEndedMilestone(id: string): Observable<Proto.Milestone> {
    return this.db.collection('/milestones')
      .doc(id)
      .snapshotChanges()
      .pipe(
        map(action => {
          const firebaseElement = action.payload.data() as FirebaseElement;
          if (firebaseElement && firebaseElement.proto) {
            return Proto.Milestone.deserializeBinary(
              this.encodingService.base64ToUint8Array(firebaseElement.proto)
            );
          } else {
            return;
          }
        }),
      );
  }
}
