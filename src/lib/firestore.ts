import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Fan {
  nome: string;
  whatsapp: string; // armazenado apenas dígitos
  instagram: string;
  maiorPontuacao: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Remove tudo que não for dígito — usado como chave do documento. */
function cleanWhatsApp(raw: string): string {
  return raw.replace(/\D/g, "");
}

// ─── Fãs ──────────────────────────────────────────────────────────────────────

/**
 * Busca fã pelo WhatsApp. Retorna null se não encontrado.
 */
export async function getFanByWhatsApp(whatsapp: string): Promise<Fan | null> {
  const id = cleanWhatsApp(whatsapp);
  if (id.length < 8) return null;
  const snap = await getDoc(doc(db, "fans", id));
  if (!snap.exists()) return null;
  return snap.data() as Fan;
}

/**
 * Cadastra um novo fã. WhatsApp limpo vira o ID do documento.
 */
export async function createFan(data: {
  nome: string;
  whatsapp: string;
  instagram: string;
}): Promise<Fan> {
  const id = cleanWhatsApp(data.whatsapp);
  const fan: Fan = {
    nome: data.nome.trim(),
    whatsapp: id,
    instagram: data.instagram.trim(),
    maiorPontuacao: 0,
  };
  await setDoc(doc(db, "fans", id), fan);
  return fan;
}

/**
 * Edita nome e/ou instagram de um fã existente.
 */
export async function updateFanProfile(
  whatsapp: string,
  data: { nome: string; instagram: string }
): Promise<void> {
  const id = cleanWhatsApp(whatsapp);
  await updateDoc(doc(db, "fans", id), {
    nome: data.nome.trim(),
    instagram: data.instagram.trim(),
  });
}

/**
 * Exclui a conta de um fã.
 */
export async function deleteFan(whatsapp: string): Promise<void> {
  const { deleteDoc } = await import("firebase/firestore");
  const id = cleanWhatsApp(whatsapp);
  await deleteDoc(doc(db, "fans", id));
}

/**
 * Atualiza a maior pontuação do fã — somente se o novo score for maior.
 */
export async function updateFanScore(
  whatsapp: string,
  score: number
): Promise<void> {
  const id = cleanWhatsApp(whatsapp);
  const ref = doc(db, "fans", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = (snap.data().maiorPontuacao as number) ?? 0;
  if (score > current) {
    await updateDoc(ref, { maiorPontuacao: score });
  }
}

/**
 * Retorna o top N de fãs ordenados pela maior pontuação.
 */
export async function getTopFans(count = 10): Promise<Fan[]> {
  const q = query(
    collection(db, "fans"),
    orderBy("maiorPontuacao", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Fan);
}
