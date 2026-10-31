import { SessionStore } from '../../src/middleware/sessionStore';

/**
 * SessionStore es un Map en memoria sin dependencias externas,
 * por eso se prueba con su implementacion real (sin dobles).
 */
describe('SessionStore', () => {
    const entry = (userId: number) => ({ userId, role: 'customer', email: `u${userId}@mail.com` });

    afterEach(() => {
        SessionStore.deleteAllForUser(1);
        SessionStore.deleteAllForUser(2);
    });

    it('guarda y recupera una sesion por su token', () => {
        SessionStore.set('token-a', entry(1));
        expect(SessionStore.get('token-a')).toEqual(entry(1));
    });

    it('devuelve undefined para un token que nunca se registro', () => {
        expect(SessionStore.get('token-inexistente')).toBeUndefined();
    });

    it('deleteToken elimina la sesion e indica si existia', () => {
        SessionStore.set('token-a', entry(1));
        expect(SessionStore.deleteToken('token-a')).toBe(true);
        expect(SessionStore.get('token-a')).toBeUndefined();
        expect(SessionStore.deleteToken('token-a')).toBe(false);
    });

    it('deleteAllForUser cierra todas las sesiones de un usuario y respeta las de otros (RF-05)', () => {
        SessionStore.set('pc', entry(1));
        SessionStore.set('celular', entry(1));
        SessionStore.set('otro-usuario', entry(2));

        SessionStore.deleteAllForUser(1);

        expect(SessionStore.get('pc')).toBeUndefined();
        expect(SessionStore.get('celular')).toBeUndefined();
        expect(SessionStore.get('otro-usuario')).toEqual(entry(2));
    });

    it('size devuelve la cantidad de sesiones activas sin recursion infinita', () => {
        const antes = SessionStore.size();
        SessionStore.set('t1', entry(1));
        SessionStore.set('t2', entry(2));
        expect(SessionStore.size()).toBe(antes + 2);
    });
});
