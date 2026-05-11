import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

function ts() { return Timestamp.now().toDate().toISOString(); }

export function subscribeToCollection<T extends { id?: string }>(name: string, setter: (data: T[]) => void) {
  const q = query(collection(db, name), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: T[] = [];
    snap.forEach((d) => { items.push({ ...d.data(), id: d.id } as T); });
    setter(items);
  }, (err) => { console.error(`Firestore [${name}]:`, err); });
}

export async function addDoc_(name: string, data: Record<string, unknown>): Promise<string> {
  const ref = await addDoc(collection(db, name), { ...data, createdAt: ts(), updatedAt: ts() });
  return ref.id;
}

export async function updateDoc_(name: string, id: string, data: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, name, id), { ...data, updatedAt: ts() });
}

export async function deleteDoc_(name: string, id: string): Promise<void> {
  await deleteDoc(doc(db, name, id));
}

export async function getDoc_<T>(name: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as T) : null;
}

export async function getAllDocs<T extends { id?: string }>(name: string): Promise<T[]> {
  const q = query(collection(db, name), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const items: T[] = [];
  snap.forEach((d) => { items.push({ ...d.data(), id: d.id } as T); });
  return items;
}
