import {Component, OnInit} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { AuthService, CommentService, GoodsService, InterestService } from '../../../core/http';
import { LoggedIn } from '../../../core/logged-in.service';
import { Comment, Goods, User } from '../../../shared/models';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})
export class DetailComponent implements OnInit {
  authority = false;
  group: string;
  list: string;
  moreImages: boolean;
  userDesc: string;
  userDisplayName: string;
  userPhotoURL: string;

  commentForm: FormGroup;
  comments$: Observable<Comment[]>;
  goods: Goods;
  otherGoods$: Observable<Goods[]>;
  user$: Observable<User>;

  private submitting = false;

  get interested() {
    return this.goods.interests.findIndex(
      item => this.loggedIn.getUserRef().isEqual(item)
    ) > -1;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private loggedIn: LoggedIn,
    private authService: AuthService,
    private commentService: CommentService,
    private goodsService: GoodsService,
    private interestService: InterestService
  ) {
    const user = this.loggedIn.user;
    this.list = route.snapshot.paramMap.get('list');

    this.route.params.pipe(
      pluck('goodsId')
    ).subscribe(() => {
      this.moreImages = false;
      this.goods = this.goodsService.selectedGoods;
      this.user$ = this.goodsService.getGoodsUser(this.goods.userRef);
      this.otherGoods$ = this.goodsService.getGoodsByUser(this.goods.userRef, this.list);
      this.comments$ = this.commentService.getCommentsByGoods(this.goods.id);

      this.authority = (user.id === this.goods.userRef.id);
      this.userDesc = user.desc;
      this.userDisplayName = user.displayName;
      this.userPhotoURL = user.photoURL;
    });

    this.commentForm = this.fb.group({
      body: [
        '',
        [ Validators.required,  Validators.minLength(1), Validators.maxLength(501) ]
      ]
    });
  }

  ngOnInit() {
  }

  commentAuthority(comment) {
    return comment.userRef.isEqual(this.loggedIn.getUserRef());
  }

  onMenuChange(menu: string) {
    switch (menu) {
      case 'edit':
        this.router.navigate(['/', this.list, 'goods', this.goods.id, 'edit']);
        break;
      case 'delete':
        const answer = confirm('삭제한 상품은 복구할 수 없습니다. 삭제 할까요?');
        if (answer) {
         this.goodsService.deleteGoods(this.goods.id).then(() => {
           const commands = this.list === 'lounge' ? ['/', this.list] : ['/'];
          this.router.navigate(commands);
         });
        }
        break;
      case 'soldout':
        this.goodsService.updateSoldout(this.goods.id, true);
        this.goods.soldout = true;
        break;
      case 'onsale':
        this.goodsService.updateSoldout(this.goods.id, false);
        this.goods.soldout = false;
        break;
    }
  }

  onClickInterest() {
    const goods = this.goods;
    const userRef = this.loggedIn.getUserRef();
    const index = goods.interests.findIndex(item => userRef.isEqual(item));
    const interest = {
      userRef: userRef,
      goodsRef: this.goodsService.getGoodsRef(goods.id)
    };

    if (index === -1) {
      this.interestService.addInterest(interest).subscribe();
      goods.interestCnt =  goods.interestCnt + 1;
      goods.interests.push(userRef);
    } else {
      this.interestService.removeInterest(interest).subscribe();
      goods.interestCnt =  goods.interestCnt - 1;
      goods.interests.splice(index, 1);
    }
  }

  onClickMoreImages() {
    this.moreImages = true;
  }

  onClickOtherGoods(goods: Goods) {
    this.goodsService.selectedGoods = goods;
    return false;
  }

  onClickDeleteComment(comment: Comment) {
    this.commentService.deleteComment(comment.id);
  }

  onCommentSubmit() {
    if (!this.submitting) {
      this.submitting = true;

      const comment: Comment = {
        userRef: this.commentService.getUserRef(this.authService.user.id),
        goodsRef: this.commentService.getGoodsRef(this.goods.id),
        parentRef: null,
        user: {
          displayName: this.authService.user.displayName,
          photoURL: this.authService.user.photoURL
        },
        body: this.commentForm.get('body').value as string,
        created: this.commentService.getServerTimeStamp(),
        updated: this.commentService.getServerTimeStamp()
      };
      this.commentService.addComment(comment)
        .subscribe(this.successSubmitComment, this.errorSubmitComment);

      this.commentForm.get('body').setValue('');
    }
  }

  protected successSubmitComment = () => {
    this.goodsService.incrementCommentCnt(this.goods.id);
    this.submitting = false;
  }

  protected errorSubmitComment = (e) => {
    console.error(e);
    alert(e);
    this.submitting = false;
  }

}
