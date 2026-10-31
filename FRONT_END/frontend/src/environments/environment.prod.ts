// En produccion el backend sirve el build de Angular, asi que la API y las imagenes
// se resuelven contra el mismo origen (RNF-08).
export const environment = {
  production: true,
  apiUrl: '/api',
  imageBaseUrl: '/Images',
};
