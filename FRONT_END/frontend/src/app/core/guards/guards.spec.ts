import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from './auth-guard';
import { AdminGuard } from './admin-guard';
import { GuestGuard } from './guest-guard';

/**
 * Dobles usados:
 *  - AuthService (stub): solo se necesitan los getters isLoggedIn / isAdmin. Usar el
 *    servicio real obligaria a simular HTTP para "iniciar sesion" antes de cada prueba.
 *  - Router (mock): se verifica a donde redirige el guard sin navegar de verdad.
 */
describe('Guardas de rutas (autorizacion por rol en Angular, RF-27)', () => {
  let router: jasmine.SpyObj<Router>;

  const setup = (state: { isLoggedIn: boolean; isAdmin: boolean }) => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const authStub = jasmine.createSpyObj<AuthService>('AuthService', [], state);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: Router, useValue: router },
      ],
    });
  };

  describe('AuthGuard', () => {
    it('permite la ruta a un usuario con sesion', () => {
      setup({ isLoggedIn: true, isAdmin: false });
      expect(TestBed.inject(AuthGuard).canActivate()).toBeTrue();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('envia al login a un invitado', () => {
      setup({ isLoggedIn: false, isAdmin: false });
      expect(TestBed.inject(AuthGuard).canActivate()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('AdminGuard', () => {
    it('permite el panel a un administrador', () => {
      setup({ isLoggedIn: true, isAdmin: true });
      expect(TestBed.inject(AdminGuard).canActivate()).toBeTrue();
    });

    it('bloquea el panel a un customer y lo regresa al inicio', () => {
      setup({ isLoggedIn: true, isAdmin: false });
      expect(TestBed.inject(AdminGuard).canActivate()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('bloquea el panel a un invitado', () => {
      setup({ isLoggedIn: false, isAdmin: false });
      expect(TestBed.inject(AdminGuard).canActivate()).toBeFalse();
    });
  });

  describe('GuestGuard', () => {
    it('permite login y registro a un invitado', () => {
      setup({ isLoggedIn: false, isAdmin: false });
      expect(TestBed.inject(GuestGuard).canActivate()).toBeTrue();
    });

    it('regresa al inicio a un usuario que ya inicio sesion', () => {
      setup({ isLoggedIn: true, isAdmin: false });
      expect(TestBed.inject(GuestGuard).canActivate()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
