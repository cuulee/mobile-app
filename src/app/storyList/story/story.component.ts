import {Component, Input, OnDestroy, OnInit} from "@angular/core";
import {NavController} from "ionic-angular";
import {DomSanitizer, SafeStyle} from "@angular/platform-browser";
import {UserStory} from "../../../dto/user-story";
import "rxjs/add/observable/from";
import "rxjs/add/observable/of";
import {StoryService} from "../../core/story.service";
import {StoryDetailsPage} from "./storyDetail/storyDetail.component";
import {Subject} from "rxjs/Subject";

@Component({
  selector: 'prisma-story',
  template:
    `
    <div *ngIf="imageLoaded" 
         class="album-thumb"
         (click)="showDetails()">
      <img class="album-thumb" [src]="backgroundImage">
      <div class="boxPlay">
        <div *ngIf="story.type==='youtube'" class="youtube-icon movie-indicator"></div>
      </div>
      <ion-icon *ngIf="story.favorited" class="star" name="star"
      [class.favorited]="isFavorited"></ion-icon>
      <h3 *ngIf="story.type==='youtube'">{{story.description}}</h3>
    </div>
    <div *ngIf="!imageLoaded" class="album-thumb">
      <ion-spinner item-start name="dots" color="white"></ion-spinner>
    </div>
  `
})

export class StoryComponent implements OnInit, OnDestroy {

  destroy$: Subject<boolean> = new Subject<boolean>();
  backgroundImage:SafeStyle;
  imageUrl:string;
  imageLoaded:Boolean=false;

  @Input()
  story;

  @Input()
  album;

  constructor(private storyService: StoryService,
              private navCtrl: NavController,
              private sanitizer: DomSanitizer) {

  }

  ngOnInit(): void {
    this.setBackgroundImage(this.story);
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  setBackgroundImage(story: UserStory) {
      this.storyService.getBackground(story)
        .takeUntil(this.destroy$)
        .subscribe((imageUrl:string) => {
          this.story = {
            ...this.story,
            backgroundImage:imageUrl
          }
          this.backgroundImage = this.sanitizer
            .bypassSecurityTrustUrl(imageUrl);
          this.imageLoaded = true;
        });
  }

  showDetails() {
    this.navCtrl.push(StoryDetailsPage, {
      "album": this.album,
      "story": this.story
    });
  }
}
