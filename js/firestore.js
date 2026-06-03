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

export async function fetchCategories() {
  const snap = await getDocs(
    query(collection(db, "categories"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProducts() {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

export async function addProduct(data) {
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    price: Number(data.price),
    stock: Number(data.stock),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id, data) {
  await updateDoc(doc(db, "products", id), {
    ...data,
    price: Number(data.price),
    stock: Number(data.stock),
  });
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
