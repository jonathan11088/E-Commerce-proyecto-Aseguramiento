import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CredentialsInterceptor } from './credentials.interceptor';
import { AuthService } from '../services/auth.service';

/**
 * Dobles usados:
 *  - AuthService (mock): se verifica que el interceptor limpie la sesion con setUser(null).
 *  - Router (mock): se verifica la redireccion al login.
 *  - HttpTestingController: simula respuestas 401 / 403 del backend.
 */
describe('CredentialsInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.removeItem('token');
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['setUser']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: CredentialsInterceptor, multi: true },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('agrega withCredentials a toda peticion para enviar la cookie httpOnly', () => {
    http.get('/api/cart').subscribe();
    const req = httpMock.expectOne('/api/cart');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
  });

  it('ante un 401 limpia la sesion y manda al login', () => {
    http.get('/api/cart').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/cart').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.setUser).toHaveBeenCalledWith(null as any);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('ante un 403 manda al login indicando cuenta bloqueada y propaga el error', () => {
    let status = 0;
    http.get('/api/cart').subscribe({ error: e => (status = e.status) });
    httpMock.expectOne('/api/cart').flush({}, { status: 403, statusText: 'Forbidden' });

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], { queryParams: { reason: 'locked' } });
    expect(status).toBe(403);
  });

  it('no toca la sesion con otros errores como 500', () => {
    http.get('/api/products').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/products').flush({}, { status: 500, statusText: 'Server Error' });

    expect(auth.setUser).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
