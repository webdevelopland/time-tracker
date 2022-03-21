import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'context-dialog',
  templateUrl: './context-dialog.component.html',
  styleUrls: ['./context-dialog.component.scss'],
})
export class ContextDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ContextDialogComponent>,
  ) { }

  save(): void {
    this.dialogRef.close('save');
  }

  reset(): void {
    this.dialogRef.close('reset');
  }

  close(): void {
    this.dialogRef.close();
  }
}
