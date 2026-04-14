import { http, HttpResponse } from 'msw';

export const storageHandlers = [
  // Upload de foto QC
  http.post('*/storage/v1/object/qc-photos/*', () => {
    return HttpResponse.json({
      Key: 'qc-photos/mock-photo.webp',
      Id: crypto.randomUUID(),
    });
  }),

  // URL pública de foto (devuelve imagen placeholder)
  http.get('*/storage/v1/object/public/qc-photos/*', () => {
    // Redirige a un placeholder SVG en vez de cargar una imagen real
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#d1fae5"/><text x="100" y="110" text-anchor="middle" fill="#065f46" font-size="14">QC Photo Mock</text></svg>',
      {
        headers: { 'Content-Type': 'image/svg+xml' },
      },
    );
  }),

  // Listar objetos del bucket
  http.get('*/storage/v1/object/list/*', () => {
    return HttpResponse.json([]);
  }),

  // Delete
  http.delete('*/storage/v1/object/*', () => {
    return new HttpResponse(null, { status: 200 });
  }),
];
