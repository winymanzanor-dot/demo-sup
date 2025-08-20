import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'cliente';
      isOnline: boolean = navigator.onLine;

    ngOnInit() {
      window.addEventListener('online',  () => this.isOnline = true);
      window.addEventListener('offline', () => this.isOnline = false);
    }

}
