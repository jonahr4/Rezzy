import { put, del, list } from '@vercel/blob';

export { put, del, list };

export async function uploadPDF(
  filename: string,
  data: Blob | ArrayBuffer,
  options?: { access?: 'public' }
) {
  return put(`pdfs/${filename}`, data, {
    access: options?.access ?? 'public',
    contentType: 'application/pdf',
  });
}
