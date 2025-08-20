import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubirAgendaComponent } from './subir-agenda.component';

describe('SubirAgendaComponent', () => {
  let component: SubirAgendaComponent;
  let fixture: ComponentFixture<SubirAgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubirAgendaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubirAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
