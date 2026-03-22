import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'fm-theme';
  private themeSubject = new BehaviorSubject<Theme>('dark'); // Default theme
  
  public theme$ = this.themeSubject.asObservable();

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    const initialTheme: Theme = savedTheme || 'dark'; // Use dark if nothing saved (since default was dark)
    this.setTheme(initialTheme);
  }

  public toggleTheme(): void {
    const current = this.themeSubject.getValue();
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  public setTheme(theme: Theme): void {
    localStorage.setItem(this.THEME_KEY, theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    this.themeSubject.next(theme);
  }
  
  public get isDarkMode(): boolean {
    return this.themeSubject.getValue() === 'dark';
  }
}
