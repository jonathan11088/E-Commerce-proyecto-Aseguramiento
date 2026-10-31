import { FilterActivePipe } from './filter-active.pipe';
import { FilterLockedPipe } from './filter-locked.pipe';
import { Customer } from '../Interface';

describe('Pipes de clientes del panel admin', () => {
  const customers = [{ isLocked: false }, { isLocked: true }, { isLocked: false }] as Customer[];

  it('filterActive cuenta los clientes no bloqueados', () => {
    expect(new FilterActivePipe().transform(customers)).toBe(2);
  });

  it('filterLocked cuenta los clientes bloqueados', () => {
    expect(new FilterLockedPipe().transform(customers)).toBe(1);
  });

  it('ambos devuelven 0 si la lista aun no carga', () => {
    expect(new FilterActivePipe().transform(null as any)).toBe(0);
    expect(new FilterLockedPipe().transform(undefined as any)).toBe(0);
  });
});
