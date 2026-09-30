import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { buscarProdutos } from './produtos';
import { Contrato, nomesDosItens } from './contracts';

export interface ResultadoDisponibilidade {
  quantidadeTotal: number;
  reservas: { cliente: string; contratoId: string }[];
  disponiveis: number;
}

/** Quantas unidades de um brinquedo estão livres numa data, e quem já reservou as outras. */
export async function verificarDisponibilidade(
  nomeBrinquedo: string,
  dataISO: string
): Promise<ResultadoDisponibilidade> {
  const nomeNormalizado = nomeBrinquedo.trim().toLowerCase();

  const [produtos, snap] = await Promise.all([
    buscarProdutos(),
    getDocs(query(collection(getFirebaseDb(), 'contratos'), where('dataEvento', '==', dataISO))),
  ]);

  const produto = produtos.find((p) => p.nome.trim().toLowerCase() === nomeNormalizado);
  const quantidadeTotal = produto?.quantidade ?? 1;

  const reservas = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Contrato)
    .filter(
      (c) =>
        c.status !== 'CANCELADO' && nomesDosItens(c).some((n) => n.trim().toLowerCase() === nomeNormalizado)
    )
    .map((c) => ({ cliente: c.cliente, contratoId: c.id }));

  return { quantidadeTotal, reservas, disponiveis: Math.max(0, quantidadeTotal - reservas.length) };
}
