import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecorridoAgendaComponent } from './recorrido-agenda.component';

describe('RecorridoAgendaComponent', () => {
  let component: RecorridoAgendaComponent;
  let fixture: ComponentFixture<RecorridoAgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecorridoAgendaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecorridoAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
