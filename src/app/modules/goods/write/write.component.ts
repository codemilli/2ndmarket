import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, merge, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { targetSelectedValidator } from '../target-selected-validator.directive';
import { FileUploadService, GoodsService } from '../../../core/http';
import { Goods, Group, ImageFile, User } from '../../../shared/models';

enum ImageType {
  FRONT = 'front',
  SIDE = 'side',
  BACK = 'back'
}

@Component({
  selector: 'app-write',
  templateUrl: './write.component.html',
  styleUrls: ['./write.component.css']
})
export class WriteComponent implements OnInit {
  writeForm: FormGroup;
  groupName: string;

  frontImageFiles = new Map<number, ImageFile>();
  sideImageFiles = new Map<number, ImageFile>();
  backImageFiles = new Map<number, ImageFile>();

  private submitting = false;

  get post() { return this.writeForm.get('post'); }
  get title() { return this.writeForm.get('title'); }
  get desc() { return this.writeForm.get('desc'); }
  get price() { return this.writeForm.get('price'); }

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private decimalPipe: DecimalPipe,
    private fileUploadService: FileUploadService,
    private goodsService: GoodsService) {

    const { group } = this.route.snapshot.data.loginInfo;
    this.groupName = group.name;

    this.buildWriteForm();
  }

  ngOnInit() {

  }

  protected buildWriteForm() {
    this.writeForm = this.fb.group({
      post: this.fb.group({
        group: true,
        lounge: false
      }, { validators: targetSelectedValidator }),
      category: this.fb.group({
        category: '가전/디지털',
        recent: ''
      }, { validators: Validators.required }),
      purchase: ['알 수 없음', Validators.required],
      condition: ['미개봉', Validators.required],
      title: [
        '',
        [ Validators.required,  Validators.maxLength(31) ]
      ],
      desc: [
        '',
        [ Validators.required,  Validators.maxLength(201) ]
      ],
      price: [
        '',
        [ Validators.required, Validators.maxLength(10) ]
      ],
      delivery: this.fb.group({
        delivery: '직거래',
        etc: [
          '',
          Validators.maxLength(51)
        ]
      }, { validators: Validators.required }),
      contact: [
        '',
        Validators.maxLength(51)
      ],
      donation: [
        '0',
        Validators.required
      ]
    });

    this.writeForm.get('category.category')
      .valueChanges.subscribe(() => {
        this.writeForm.get('category.recent')
          .setValue('', { emitEvent: false });
    });

    this.writeForm.get('category.recent')
      .valueChanges.subscribe(() => {
        this.writeForm.get('category.category')
          .setValue('', { emitEvent: false });
    });

    this.writeForm.get('price')
      .valueChanges.subscribe(value => {
        if (value) {
          const noCommaValue = value.replace(/,/g, '');
          const intValue = parseInt(noCommaValue, 10);
          const result = noCommaValue ?
            this.decimalPipe.transform(intValue, '1.0-0') : '';
          this.writeForm.get('price')
            .setValue(result, { emitEvent: false });
        }
    });

    this.writeForm.get('delivery.delivery')
      .valueChanges.subscribe(() => {
        this.writeForm.get('delivery.etc')
          .setValue('', { emitEvent: false });
    });

    this.writeForm.get('delivery.etc')
      .valueChanges.subscribe(() => {
        this.writeForm.get('delivery.delivery')
        .setValue('', { emitEvent: false });
    });
  }

  protected onChangeImage(e: any, imageType: string) {
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      const imageFile = new ImageFile(file);

      imageFile.readAsDataURL().then(() => {
        switch (imageType) {
          case ImageType.FRONT:
            this.frontImageFiles.set(Date.now(), imageFile);
            break;
          case ImageType.SIDE:
            this.sideImageFiles.set(Date.now(), imageFile);
            break;
          case ImageType.BACK:
            this.backImageFiles.set(Date.now(), imageFile);
            break;
        }
      });
    }
  }

  protected upload(): Observable<any> {
    const files = [];

    this.frontImageFiles.forEach(imageFile => {
      files.push(imageFile.file);
    });

    this.sideImageFiles.forEach(imageFile => {
      files.push(imageFile.file);
    });

    this.backImageFiles.forEach(imageFile => {
      files.push(imageFile.file);
    });

    const progress$ = [];
    const response$ = [];
    const statusList = this.fileUploadService.upload(files);

    for (const key of Object.keys(statusList)) {
      progress$.push(statusList[key].progress);
      response$.push(statusList[key].response);
    }

    // merge(progress$).pipe().subscribe(result => {
    //   result.subscribe(r => console.log('progress$', r));
    // });
    //

    return forkJoin(response$).pipe(
      map(responses => {
        return responses.map(response => {
          return {
            public_id: response.body.public_id,
            url: response.body.url
          };
        });
      })
    );
  }

  protected getGoodsData(images): Goods {
    const form = this.writeForm;
    const { user, group } = this.route.snapshot.data.loginInfo;

    return {
      userRef: user.id,
      groupRef: group.id,
      post: {
        group: form.get('post.group').value,
        lounge: form.get('post.lounge').value,
      },
      images,
      category:
        form.get('category.category').value ||
        form.get('category.recent').value,
      purchase: form.get('purchase').value,
      condition: form.get('condition').value,
      title: form.get('title').value,
      desc: form.get('desc').value,
      price: parseInt(form.get('price').value.replace(/,/g, ''), 10),
      delivery:
        form.get('delivery.delivery').value ||
        form.get('delivery.etc').value,
      contact: form.get('contact').value,
      donation: form.get('donation').value
    };
  }

  protected onSubmit() {
    if (!this.submitting) {
      this.submitting = true;
      const upload$ = this.upload();

      upload$.pipe(
        map(images => this.getGoodsData(images)),
        switchMap(goods => this.goodsService.addGoods(goods))
      ).subscribe(this.success, this.error);
    }
  }

  success = () => {
    console.log('success');
    // this.submitting = false;
    // this.router.navigate(['/']);
  }

  error = (e) => {
    console.error(e);
    alert(e);
    // this.submitting = false;
  }

}
