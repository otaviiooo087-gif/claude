const PDFJS_VERSION = '6.3.289';

async function extrairTextoPdf(arquivo: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

  const buffer = await arquivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    const textoPagina = conteudo.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    textoCompleto += textoPagina + '\n';
  }
  return textoCompleto.trim();
}

async function extrairTextoImagem(arquivo: File): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por');
  try {
    const {
      data: { text },
    } = await worker.recognize(arquivo);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Extrai o texto de um contrato anexado (PDF digital ou foto/imagem).
 * PDF: lê o texto embutido diretamente (rápido, sem OCR).
 * Imagem: reconhece o texto via OCR no próprio navegador (Tesseract.js,
 * gratuito, sem API paga) — mais lento, alguns segundos.
 */
export async function extrairTextoContrato(arquivo: File): Promise<string> {
  if (arquivo.type === 'application/pdf') {
    const texto = await extrairTextoPdf(arquivo);
    if (texto.length > 40) return texto;
    throw new Error(
      'Esse PDF parece ser uma imagem escaneada, sem texto pra ler direto. Tente anexar como foto (JPG/PNG) pra usar leitura por OCR.'
    );
  }
  if (arquivo.type.startsWith('image/')) {
    return extrairTextoImagem(arquivo);
  }
  throw new Error('Formato não suportado pra leitura automática — use PDF ou foto (JPG/PNG).');
}
