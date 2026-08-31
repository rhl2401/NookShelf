import "server-only";
import QRCode from "qrcode";

export async function generateQrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, { errorCorrectionLevel: "M", margin: 1, width: 320 });
}
