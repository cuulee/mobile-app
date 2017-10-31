import {Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AuthenticationService} from '../../core/authentication.service';
import {AlertController} from 'ionic-angular';
import {Analytics} from '../../../providers/analytics';
import {User} from '../../../dto/user';
import {Observable} from 'rxjs/Observable';

@Component({
  selector: 'prisma-authentication-register',
  template: `
    <form [formGroup]="form">

      <ion-list>
        <ion-item>
          <ion-input type="text" value="" formControlName="firstName" placeholder="Voornaam"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input type="text" value="" formControlName="lastName" placeholder="Naam"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input type="email" value="" formControlName="email" placeholder="E-mail"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            [type]="type" #input
            formControlName="password"
            placeholder="Wachtwoord"
            clearOnEdit="false" clearInput></ion-input>
          <button ion-button icon-only (click)="toggleShow()" clear item-right>
            <ion-icon *ngIf="!show" name="eye" color="medium-gray"></ion-icon>
            <ion-icon *ngIf="show" name="eye-off" color="medium-gray"></ion-icon>
          </button>
        </ion-item>
      </ion-list>

      <button ion-button solid block full large color="primary" (click)="register(form.getRawValue())"
              [disabled]="form.invalid">
        <div *ngIf="!loading">Maak account</div>
        <div *ngIf="loading">
          <ion-spinner item-start name="dots" color="white"></ion-spinner>
        </div>
      </button>

      <div class="signup-suggestion">
        <p class="alternate-option">Al een account? <a color="general" (click)="onLoginClick()">Aanmelden</a></p>
      </div>

    </form>

  `
})
export class AuthenticationRegisterComponent implements OnInit {

  @Input()
  onLoginClick: Function = () => {
  };

  @Input()
  onComplete: Function = () => {
  };

  @Input()
  data: User;

  form: FormGroup;
  type = "password";
  show = false;
  loading: boolean = false;

  constructor(private fb: FormBuilder,
              private auth: AuthenticationService,
              private alertCtrl: AlertController,
              private analytics: Analytics) {
  }

  // TODO: display error message

  ngOnInit(): void {
    this.form = this.fb.group({
      email: [
        null, [
          Validators.required,
          Validators.email
        ],
        []
      ],
      password: [
        null,
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(40)
        ],
        []
      ],
      firstName: [
        null,
        [
          Validators.required,
        ],
        []
      ],
      lastName: [
        null,
        [
          Validators.required,
        ],
        []
      ],

    });
  }

  toggleShow() {
    this.show = !this.show;
    this.type = this.show ? 'text' : 'password';
  }

  register(credentials: User) {
    this.loading = true;
    let user: Partial<User> = {
      ...new User(),
      ...credentials
    };

    this.auth.signUp(user as User)
      .switchMap((res: boolean | Error) => {
        if (res instanceof Error) {
          this.analytics.track('LoginComponent::Register error', {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          });
          this.showError(res.message);
          return Observable.empty();
        }
        return Observable.of(res);
      })
      .do(() => {
        this.analytics.track('LoginComponent::Register success', {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
        this.loading = false;
        this.onComplete();
      })
      .subscribe(undefined, (err) => {
        this.analytics.track('LoginComponent::Register error', {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
        this.showError(err.message);
      })
  }

  showError(errorMessage: string = 'Onmogelijk om u te registreren, neem dan contact op met de beheerder') {
    this.loading = false;
    let alert = this.alertCtrl.create({
      title: errorMessage,
      buttons: ['Ok']
    });

    alert.present();

    this.auth.logout();
  }

}