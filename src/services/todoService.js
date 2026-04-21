// src/services/todoService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase-config";

// FIX: adăugat orderBy("createdAt", "desc") — necesită index compozit în Firestore
// La prima rulare, Firestore va afișa un link în consolă pentru a crea indexul
export const listenToTodos = (userId, callback) => {
  const q = query(
    collection(db, "todos"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
};

export const addTodo = async (userId, data) => {
  await addDoc(collection(db, "todos"), {
    userId,
    text: data.text || "",
    priority: data.priority || "medium",       // EN intern: low / medium / high
    deadline: data.deadline || "",
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    category: data.category || "General",
    recurrence: data.recurrence || "none",     // none / daily / weekly
    status: data.status || "Urmează",          // FIX: "Urmează" în loc de "Upcoming"
    createdAt: serverTimestamp(),
  });
};

export const updateTodo = async (id, data) => {
  await updateDoc(doc(db, "todos", id), data);
};

export const deleteTodo = async (id) => {
  await deleteDoc(doc(db, "todos", id));
};
