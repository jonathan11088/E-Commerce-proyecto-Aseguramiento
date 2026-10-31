import 'reflect-metadata';
// Variables de entorno minimas para que los modulos se puedan importar en las pruebas.
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
