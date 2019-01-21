import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { TargetSelectedValidatorDirective } from './target-selected-validator.directive';
import { GoodsRoutingModule } from './goods-routing.module';
import { WriteComponent } from './write/write.component';
import { FileUploadService } from '../../core/http';
import { DetailComponent } from './detail/detail.component';
import { EditComponent } from './edit/edit.component';

@NgModule({
  declarations: [
    TargetSelectedValidatorDirective,
    WriteComponent,
    DetailComponent,
    EditComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    GoodsRoutingModule
  ],
  providers: [
    DecimalPipe,
    FileUploadService
  ],
})
export class GoodsModule { }
