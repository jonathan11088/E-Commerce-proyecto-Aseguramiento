import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/Interface';

/**
 * Dobles usados:
 *  - HttpTestingController (mock de HTTP): no se llama al backend real; se responde
 *    cada peticion a mano y se verifica URL, metodo y cuerpo.
 *  - Router (mock): para comprobar la navegacion despues del logout.
 */
describe('AuthService (estado de sesion del frontend)', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  const api = environment.apiUrl;
  const admin: User = { name: 'Admin', email: 'admin@mail.com', role: 'admin', isLocked: false, createdAt: '' };
  const customer: User = { ...admin, name: 'Ana', email: 'ana@mail.com', role: 'customer' };

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inicia sin sesion', () => {
    expect(service.isLoggedIn).toBeFalse();
    expect(service.currentUser).toBeNull();
  });

  it('login envia las credenciales con cookies y guarda al usuario', () => {
    service.login('ana@mail.com', 'Segura123').subscribe();

    const req = http.expectOne(`${api}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@mail.com', password: 'Segura123' });
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ message: 'Login successful', user: customer });

    expect(service.isLoggedIn).toBeTrue();
    expect(service.isCustomer).toBeTrue();
    expect(service.isAdmin).toBeFalse();
  });

  it('initSession restaura un admin desde /auth/me', () => {
    service.initSession().subscribe();
    http.expectOne(`${api}/auth/me`).flush({ user: admin });

    expect(service.isAdmin).toBeTrue();
  });

  it('logout limpia la sesion y regresa al inicio', () => {
    service.setUser(customer);
    service.logout().subscribe();
    http.expectOne(`${api}/auth/logout`).flush({ message: 'Logout successfully' });

    expect(service.isLoggedIn).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('currentUser$ notifica cada cambio de sesion', () => {
    const emitidos: (User | null)[] = [];
    service.currentUser$.subscribe(u => emitidos.push(u));

    service.setUser(customer);
    service.setUser(null);

    expect(emitidos).toEqual([null, customer, null]);
  });
});
