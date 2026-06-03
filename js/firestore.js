import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "../firebase.js";
import { normalizeColors } from "./product-colors.js";

function sortByCreatedAt(items) {
  return items.sort((a, b) => {
    const aTime = a.createdAt?.seconds ?? a.createdAt ?? 0;
    const bTime = b.createdAt?.seconds ?? b.createdAt ?? 0;
    return bTime - aTime;
  });
}

async function fetchCollectionSorted(name) {
  try {
    const snap = await getDocs(collection(db, name));
    const items = sortByCreatedAt(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
    console.log(`[Firestore] ${name} loaded:`, items.length);
    return items;
  } catch (fetchError) {
    console.error(`[Firestore] Failed to fetch ${name}:`, fetchError);
    throw fetchError;
  }
}

export async function fetchCategories() {
  return fetchCollectionSorted("categories");
}

export async function fetchProducts() {
  return fetchCollectionSorted("products");
}

export async function fetchOrders() {
  const snap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchContacts() {
  const snap = await getDocs(
    query(collection(db, "contacts"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addCategory(data) {
  const ref = await addDoc(collection(db, "categories"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCategory(id, data) {
  await updateDoc(doc(db, "categories", id), data);
}

export async function deleteCategory(id) {
  await deleteDoc(doc(db, "categories", id));
}

function normalizeProductData(data) {
  const images = Array.isArray(data.images)
    ? data.images.filter(Boolean).slice(0, 15)
    : [];
  return {
    ...data,
    price: Number(data.price),
    stock: Number(data.stock),
    packQuantity: Number(data.packQuantity) || 0,
    images,
    colors: normalizeColors(data.colors),
  };
}

export async function addProduct(data) {
  const ref = await addDoc(collection(db, "products"), {
    ...normalizeProductData(data),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id, data) {
  await updateDoc(doc(db, "products", id), normalizeProductData(data));
}

export async function deleteProduct(id) {
  await deleteDoc(doc(db, "products", id));
}

export async function addOrder(data) {
  const ref = await addDoc(collection(db, "orders"), {
    ...data,
    status: "Pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateOrderStatus(id, status) {
  await updateDoc(doc(db, "orders", id), { status });
}

export async function addContact(data) {
  const ref = await addDoc(collection(db, "contacts"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getStats() {
  const [categories, products, orders] = await Promise.all([
    fetchCategories(),
    fetchProducts(),
    fetchOrders(),
  ]);

  const revenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return {
    totalCategories: categories.length,
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue: revenue,
  };
}

export async function getProductById(id) {
  const snap = await getDoc(doc(db, "products", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
