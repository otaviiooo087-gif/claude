export interface PrevisaoTempo {
  tempMaxC: number;
  tempMinC: number;
  chanceChuvaPercent: number;
}

// Open-Meteo: previsão gratuita, sem chave de API e sem limite de uso pra
// esse volume — por isso preferida à API de clima do Google Maps, que
// exige conta paga (faturamento) no Google Cloud.
const cache = new Map<string, PrevisaoTempo | null>();

export async function buscarPrevisaoTempo(lat: number, lng: number, dataISO: string): Promise<PrevisaoTempo | null> {
  const chave = `${lat.toFixed(3)},${lng.toFixed(3)},${dataISO}`;
  if (cache.has(chave)) return cache.get(chave) ?? null;

  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'America/Sao_Paulo',
      start_date: dataISO,
      end_date: dataISO,
    });
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    const dados = await resp.json();
    const resultado: PrevisaoTempo | null = dados?.daily?.time?.[0]
      ? {
          tempMaxC: dados.daily.temperature_2m_max[0],
          tempMinC: dados.daily.temperature_2m_min[0],
          chanceChuvaPercent: dados.daily.precipitation_probability_max[0] ?? 0,
        }
      : null;
    cache.set(chave, resultado);
    return resultado;
  } catch {
    cache.set(chave, null);
    return null;
  }
}
