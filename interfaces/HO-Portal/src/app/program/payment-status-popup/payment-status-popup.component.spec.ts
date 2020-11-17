import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { PaymentStatusPopupComponent } from './payment-status-popup.component';

const modalSpy = jasmine.createSpyObj('Modal', ['present']);
const modalCtrlSpy = jasmine.createSpyObj('ModalController', ['create']);
modalCtrlSpy.create.and.callFake(() => {
  return modalSpy;
});

describe('PaymentErrorPopupComponent', () => {
  let component: PaymentStatusPopupComponent;
  let fixture: ComponentFixture<PaymentStatusPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PaymentStatusPopupComponent],
      imports: [TranslateModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        {
          provide: ModalController,
          useValue: modalCtrlSpy,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PaymentStatusPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
