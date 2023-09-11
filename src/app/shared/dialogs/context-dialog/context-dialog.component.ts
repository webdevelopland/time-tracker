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

  add(): void {
    this.dialogRef.close('add');
  }

  end(): void {
    this.dialogRef.close('end');
  }

  reset(): void {
    this.dialogRef.close('reset');
  }
}
