import { Request, Response } from 'express';
import { requireRole } from '../../src/middleware/rbac.middleware';
import { UserRole } from '../../src/entities/User';

const mockRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
};

describe('requireRole (autorizacion por rol, RF-27)', () => {
    it('deja pasar a un admin en una ruta de admin', () => {
        const req = { user: { role: UserRole.ADMIN } } as Request;
        const res = mockRes();
        const next = jest.fn();

        requireRole(UserRole.ADMIN)(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rechaza a un customer en una ruta de admin', () => {
        const req = { user: { role: UserRole.CUSTOMER } } as Request;
        const res = mockRes();
        const next = jest.fn();

        requireRole(UserRole.ADMIN)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rechaza una peticion sin usuario autenticado (invitado)', () => {
        const req = {} as Request;
        const res = mockRes();
        const next = jest.fn();

        requireRole(UserRole.CUSTOMER)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ error: 'Permission denied to access this resource' });
    });

    it('acepta cualquiera de varios roles permitidos', () => {
        const next = jest.fn();
        const guard = requireRole(UserRole.ADMIN, UserRole.CUSTOMER);

        guard({ user: { role: UserRole.CUSTOMER } } as Request, mockRes(), next);
        guard({ user: { role: UserRole.ADMIN } } as Request, mockRes(), next);

        expect(next).toHaveBeenCalledTimes(2);
    });
});
