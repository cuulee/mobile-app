import {ChangeDetectorRef, Component, OnInit} from "@angular/core";
import {AlertController, MenuController, NavController} from "ionic-angular";
import {StanizerService} from "../../providers/stanizer.service";
import {User} from "../../dto/user";
import {UserStory} from "../../dto/user-story";
import {Album} from "../../dto/album";
import {Camera} from "@ionic-native/camera";
import {AlbumDetailPage} from "../album-detail/album-detail";
import {env} from "../../app/environment";
import {Patient} from "../../dto/patient";
import {AuthGuard} from "../auth-guard";
import {AuthenticationService} from "../../app/core/authentication.service";
import {TranslatorService} from "../../providers/translator.service";
import {LoginPage} from "../login/login";
import {UtilService} from "../../providers/util-service";
import {NewLovedonePage} from "../../app/auth/components/new-lovedone/new-lovedone";
import {MixpanelService} from '../../providers/analytics/mixpanel.service';
import {PatientService} from "../../app/core/patient.service";
import {AlbumService} from "../../app/core/album.service";


@Component({
  selector: 'albums-page',
  templateUrl: 'albums.html'
})
export class AlbumsPage  implements OnInit {
  user: User = JSON.parse(localStorage.getItem(env.temp.currentUser)) as User;
  albums: Album[] = [];
  backgroundImages: any[] = [];
  currentPatient: Patient;
  public loadingImageStyle: any = `background-image: url(${env.loadingImage})`;
  //backgrpind collors
  private colorCodes: string[] = ["#FAD820", "#FF9F00", "#F35A4B", "#D95DB4", "#637DC8"];

  constructor(public authService: AuthenticationService,
              public navCtrl: NavController,
              public translatorService: TranslatorService,
              public camera: Camera,
              public sanitizer: StanizerService,
              public alertCtrl: AlertController,
              public menu: MenuController,
              private ref: ChangeDetectorRef,
              public utilService: UtilService,
              public patientService: PatientService,
              private mixpanel: MixpanelService,
              private albumService:AlbumService) {
    this.currentPatient = this.patientService.getCurrentPatient();
    menu.enable(true);
    this.loadingImageStyle = this.sanitizer.sanitizeStyle(this.loadingImageStyle);
  }


  ngOnInit(): void {
    // TODO: replace with a service method
    this.currentPatient = this.patientService.getCurrentPatient();
    console.log('OnInit album');
  }

  ionViewWillEnter(): void {
    if (!this.currentPatient) {
      this.navCtrl.setRoot(NewLovedonePage);
      return;
    }
    this.albumService.getAlbums(this.patientService.getCurrentPatient().patient_id).toPromise().then(albums => {
      this.albums = albums as Album[] || [];
      if (!this.authService.isLoggedIn()) {
        this.navCtrl.setRoot(LoginPage).then(res => {
          this.navCtrl.popToRoot();
          return;
        });
      }
      let i: number = 0;
      this.albums.forEach(album => {
        this.albums[i] = album;
        if (!album.isEmpty()) {
          if (!this.imageLoaded(i))
            this.setBackgroundImages(i);

        }
        i++;
      });
    });
  }


  showDetails(album: Album) {
    this.navCtrl.push(AlbumDetailPage, {
      "album": album,
    });
  }

  getBackgroundImg(i: number): any {
    return this.backgroundImages[i];
  }

  getBackgroundColor(i: number): string {
    if (this.albums[i].isEmpty()) {
      return this.colorCodes[i % this.colorCodes.length] as string;
    }
    else {
      return "";
    }
  }

  setBackgroundImages(i: number) {
    if (this.albums[i].isEmpty()) {
      this.backgroundImages[i] = "";
      return;
    }
    else {
      // representative image: index of the image that should show up as front cover of the album
      let index = this.getRepresentativeImageStoryIndex(this.albums[i]);
      let thumb: string = this.getThumb(this.albums[i].getBackgroundImage(index));


      if (!this.albums[i].getBackgroundImage(index)) {
        this.backgroundImages[i] = "";
        this.ref.markForCheck();
        return;
      }
      this.backgroundImages[i] = this.loadingImageStyle;
      //if not a private image
      if (thumb.indexOf(env.privateImagesRegex) < 0) {
        const style = `background-image: url(${thumb})`;
        this.backgroundImages[i] = this.sanitizer.sanitizeStyle(style);
        this.ref.markForCheck();
        return;
      }
      this.albumService.getImage(thumb).toPromise().then(blob => {
        //this.albums[i].blobs[index] = blob;
        const style2 = `background-image: url(${blob})`;
        this.backgroundImages[i] = this.sanitizer.sanitizeStyle(style2);
        this.ref.markForCheck();
        return;
      });
    }
  }

  getRepresentativeImageStoryIndex(al: Album): number {
    let index = al.stories.findIndex(this.isRepresentativeOfTheAlbum);
    if (index === -1)
      index = al.stories.findIndex(this.hasAnImage);
    if (index === -1)
      index = 0;

    return index;
  }

  isAVideoBackground(i: number): boolean {
    if (this.albums[i].isEmpty()) {
      return false;
    }
    else {
      let index = this.albums[i].stories.findIndex(this.isRepresentativeOfTheAlbum);
      if (index === -1)
        index = this.albums[i].stories.findIndex(this.hasAnImage);
      if (index === -1)
        index = 0;
      let thumb: string = this.getThumb(this.albums[i].getBackgroundImage(index));
      if (!this.albums[i].getBackgroundImage(index))
        return false;
      return thumb.toLowerCase().indexOf("img.youtube") >= 0;
    }
  }

  addAlbum(): void {

    let albumFailedAlert = this.alertCtrl.create({
      title: 'Fout bij het maken van het album',
      subTitle: 'Onze excuses, het album kon niet aangemaakt worden. Er is iets fout met Prisma.\nProbeer later nog eens opnieuw!',
      buttons: ['Ok']
    });

    let text1: string = 'Voeg album toe';
    let text2: string = 'Annuleer';
    let text3: string = 'Voeg toe';
    this.translatorService.translate(text1, value => text1 = value);
    this.translatorService.translate(text2, value => text2 = value);
    this.translatorService.translate(text3, value => text3 = value);

    this.alertCtrl.create({
      "title": text1,
      "message": 'Hoe wil je het album noemen?',
      inputs: [
        {
          name: 'title',
          placeholder: 'bv. Kajakclub'
        },
      ],
      buttons: [
        {
          text: text2
        },
        {
          text: text3,
          handler: data => {
            this.albumService.addAlbum(this.patientService.getCurrentPatient().patient_id, data.title).toPromise()
              .then(album => {

                this.mixpanel.track('AlbumsComponent::add album success', {
                  patient_id: this.patientService.getCurrentPatient().patient_id,
                  title: data.title
                });

                //this.ionViewWillEnter();
                //Trying to spare us a whole refresh;
                this.ionViewWillEnter();
              })
              .catch(() => {

                this.mixpanel.track('AlbumsComponent::add album error', {
                  patient_id: this.patientService.getCurrentPatient().patient_id,
                  title: data.title
                });

                albumFailedAlert.present()
              });
          }
        }
      ]
    }).present();
  }

  isRepresentativeOfTheAlbum(story: UserStory): boolean {
    return !!story.source && !!story.favorited;
  }

  // TODO: both methods have a similar purpose...
  hasAnImage(story: UserStory) {
    return !!story.source;
  }

  noImage(index: number): boolean {
    return !this.albums[index].getBackgroundImage(index);
  }


  getThumb(url: string) {
    return this.utilService.getThumb(url);
  }

  imageLoaded(index: number): boolean {
    return !!this.backgroundImages[index] && this.backgroundImages[index] != this.loadingImageStyle;
  }

}
