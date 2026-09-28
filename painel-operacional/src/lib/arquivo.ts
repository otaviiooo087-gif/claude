/** Lê um arquivo qualquer (PDF, doc, imagem...) como data URL base64. */
export function lerArquivoComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}
