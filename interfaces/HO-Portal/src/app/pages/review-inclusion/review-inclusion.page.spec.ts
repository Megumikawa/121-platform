import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ReviewInclusionPage } from './review-inclusion.page';
import { RouterTestingModule } from '@angular/router/testing';

describe('ReviewInclusionPage', () => {
  let component: ReviewInclusionPage;
  let fixture: ComponentFixture<ReviewInclusionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ReviewInclusionPage],
      imports: [TranslateModule.forRoot(), RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReviewInclusionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
