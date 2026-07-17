import QRCode from 'qrcode';

export async function gerarQrCodeDataUrl(texto) {
  try {
    return await QRCode.toDataURL(texto || 'AAC', {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    return '';
  }
}
