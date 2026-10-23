type Coord = { lat: number; lng: number };

// Cache em memória (dura a sessão do painel admin) pra nunca geocodificar o
// mesmo endereço duas vezes — o serviço gratuito do Nominatim pede uso
// comedido.
const cache = new Map<string, Coord | null>();
const emAndamento = new Map<string, Promise<Coord | null>>();

export function chaveEndereco(endereco?: string | null, cidade?: string | null): string | null {
  const texto = [endereco, cidade].filter(Boolean).join(', ').trim();
  return texto || null;
}

export async function geocodar(endereco: string): Promise<Coord | null> {
  // Coordenadas escritas no endereço (ex: "... [GPS -22.936306,-46.980167]") valem direto, sem consultar o mapa.
  const gps = endereco.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if (gps) return { lat: parseFloat(gps[1]), lng: parseFloat(gps[2]) };
  if (cache.has(endereco)) return cache.get(endereco) ?? null;
  const emCurso = emAndamento.get(endereco);
  if (emCurso) return emCurso;

  const promessa = (async (): Promise<Coord | null> => {
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: endereco,
        limit: '1',
        countrycodes: 'br',
      });
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      const dados = await resp.json();
      const resultado: Coord | null =
        Array.isArray(dados) && dados[0]
          ? { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) }
          : null;
      cache.set(endereco, resultado);
      return resultado;
    } catch {
      cache.set(endereco, null);
      return null;
    } finally {
      emAndamento.delete(endereco);
    }
  })();

  emAndamento.set(endereco, promessa);
  return promessa;
}
