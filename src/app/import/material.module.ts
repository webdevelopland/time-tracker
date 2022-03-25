import { NgModule } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

const MaterialImports = [
  MatButtonModule,
  MatIconModule,
  MatProgressSpinnerModule,
  MatInputModule,
  MatDialogModule,
  MatSnackBarModule,
  MatSlideToggleModule,
];

@NgModule({
  imports: MaterialImports,
  exports: MaterialImports,
})
export class MaterialModule { }
