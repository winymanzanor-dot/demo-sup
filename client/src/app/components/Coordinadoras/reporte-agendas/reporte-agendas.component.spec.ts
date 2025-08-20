import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteAgendasComponent } from './reporte-agendas.component';

describe('ReporteAgendasComponent', () => {
  let component: ReporteAgendasComponent;
  let fixture: ComponentFixture<ReporteAgendasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReporteAgendasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteAgendasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
