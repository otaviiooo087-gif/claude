import { chaveEndereco, geocodar } from './geocode';
import { distanciaMetros, estimarMinutos } from './geo';
import { Task } from './types';

function obterPosicaoAtual(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalização não disponível neste aparelho.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });
  });
}

/** Usa a posição atual do operador + o endereço da tarefa pra calcular o tempo estimado, sem precisar digitar nada. */
export async function calcularMinutosAteTarefa(task: Task): Promise<string | null> {
  const chave = chaveEndereco(task.endereco, task.cidade);
  if (!chave) return null;
  const [posicao, destino] = await Promise.all([obterPosicaoAtual(), geocodar(chave)]);
  if (!destino) return null;
  const origem = { lat: posicao.coords.latitude, lng: posicao.coords.longitude };
  return String(estimarMinutos(distanciaMetros(origem, destino)));
}
