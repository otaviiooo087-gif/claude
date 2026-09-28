/**
 * Redimensiona e comprime uma foto no próprio navegador antes de salvar.
 * Guardamos a imagem como data URL direto no documento do Firestore (sem
 * usar o Firebase Storage, que só está disponível no plano pago) — por
 * isso o tamanho final precisa ficar bem pequeno, dá pra ter um catálogo
 * de brinquedos com foto sem custo nenhum.
 */
export async function comprimirImagem(arquivo: File, ladoMaximo = 480, qualidade = 0.7): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      img.src = url;
    });

    const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight));
    const largura = Math.round(img.naturalWidth * escala);
    const altura = Math.round(img.naturalHeight * escala);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');
    ctx.drawImage(img, 0, 0, largura, altura);

    return canvas.toDataURL('image/jpeg', qualidade);
  } finally {
    URL.revokeObjectURL(url);
  }
}
