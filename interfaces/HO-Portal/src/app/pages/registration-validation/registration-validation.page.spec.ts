import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from 'src/app/auth/auth.service';
import { UserRole } from 'src/app/auth/user-role.enum';
import { provideMagicalMock } from 'src/app/mocks/helpers';
import { RegistrationValidationPage } from './registration-validation.page';

describe('RegistrationValidationPage', () => {
  let component: RegistrationValidationPage;
  let fixture: ComponentFixture<RegistrationValidationPage>;

  const mockUserRole = UserRole.ProjectOfficer;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [RegistrationValidationPage],
      imports: [TranslateModule.forRoot(), RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [provideMagicalMock(AuthService)],
    }).compileComponents();
  }));

  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuthService = TestBed.get(AuthService);
    mockAuthService.getUserRole.and.returnValue(mockUserRole);

    fixture = TestBed.createComponent(RegistrationValidationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
