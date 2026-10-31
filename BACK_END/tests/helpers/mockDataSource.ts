/**
 * Doble de prueba (stub) para AppDataSource de TypeORM.
 *
 * Por que se aisla: los servicios llaman a AppDataSource.getRepository() y a
 * AppDataSource.transaction(). Usar la base SQLite real haria las pruebas lentas,
 * dependientes del estado del archivo ecommerce.db y no repetibles. Con este stub
 * cada prueba decide que devuelve cada repositorio y puede verificar que se guardo.
 */
export type RepoMock = {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    remove: jest.Mock;
};

export const createRepoMock = (): RepoMock => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (entity: any) => entity),
    create: jest.fn((data: any) => ({ ...data })),
    remove: jest.fn(),
});

/** Repositorios por nombre de entidad, se reinician en cada prueba. */
export const repos = new Map<string, RepoMock>();

export const repoFor = (entityName: string): RepoMock => {
    if (!repos.has(entityName)) repos.set(entityName, createRepoMock());
    return repos.get(entityName)!;
};

export const mockAppDataSource = {
    getRepository: jest.fn((entity: { name: string }) => repoFor(entity.name)),
    transaction: jest.fn(),
};
