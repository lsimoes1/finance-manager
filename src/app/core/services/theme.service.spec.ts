import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    // Mock localStorage
    const store: any = {};
    spyOn(localStorage, 'getItem').and.callFake((key) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key, value) => store[key] = value + '');

    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('deve alternar o tema', () => {
    const initialMode = service.isDarkMode;
    service.toggleTheme();
    expect(service.isDarkMode).not.toBe(initialMode);
  });

  it('deve retornar se o tema é escuro', () => {
    expect(typeof service.isDarkMode).toBe('boolean');
  });

  it('deve setar tema especifico', () => {
    service.setTheme('light');
    expect(service.isDarkMode).toBeFalse();
    service.setTheme('dark');
    expect(service.isDarkMode).toBeTrue();
  });
});
