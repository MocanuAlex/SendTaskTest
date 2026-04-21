// src/services/taskService.js
// Serviciu pentru trimiterea ierarhică de taskuri între utilizatori
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase-config";

// ─── USERS ──────────────────────────────────────────────────────────────────

// Obține utilizatorii disponibili pentru trimitere, filtrat după ierarhie
// Admin → vede toți
// Manager → vede Manager + User
// User → nu poate trimite (nu apelează această funcție)
export const getAllUsers = async (currentUserId, currentRole) => {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const users = snapshot.docs
      .map((d) => ({ uid: d.id, ...d.data() }))
      .filter((u) => u.uid !== currentUserId);

    if (currentRole === "manager") {
      return users.filter((u) => u.role === "user" || u.role === "manager");
    }
    return users; // admin vede toți
  } catch (error) {
    console.error("getAllUsers error:", error);
    return [];
  }
};

// ─── TRIMITERE TASK ──────────────────────────────────────────────────────────

// Trimite un task de la fromUser (cu rolul fromRole) la toUser
// Ierarhic (Admin→Manager, Admin→User, Manager→User): auto-acceptat
// Același rang (Admin→Admin, Manager→Manager): necesită Accept/Refuz
export const sendTask = async (fromUser, fromRole, toUser, taskData) => {
  try {
    const sameRank = fromRole === toUser.role;

    const sentDoc = {
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.email,
      fromUserRole: fromRole,
      toUserId: toUser.uid,
      toUserName: toUser.name,
      toUserRole: toUser.role,
      taskText: taskData.text,
      priority: taskData.priority || "medium",
      deadline: taskData.deadline || "",
      startTime: taskData.startTime || "",
      endTime: taskData.endTime || "",
      category: taskData.category || "General",
      requiresApproval: sameRank,
      // Ierarhic → acceptat automat; același rang → în așteptare
      status: sameRank ? "pending" : "accepted",
      sentAt: serverTimestamp(),
      respondedAt: null,
    };

    const docRef = await addDoc(collection(db, "sentTasks"), sentDoc);

    // Dacă ierarhic → adaugă direct în to-do-urile destinatarului
    if (!sameRank) {
      await addDoc(collection(db, "todos"), {
        userId: toUser.uid,
        text: taskData.text,
        priority: taskData.priority || "medium",
        deadline: taskData.deadline || "",
        startTime: taskData.startTime || "",
        endTime: taskData.endTime || "",
        category: taskData.category || "General",
        recurrence: "none",
        status: "Urmează",
        sentTaskId: docRef.id,
        sentBy: fromUser.displayName || fromUser.email,
        createdAt: serverTimestamp(),
      });
    }

    // Notifică destinatarul
    await addDoc(collection(db, "notifications"), {
      toUserId: toUser.uid,
      fromUserId: fromUser.uid,
      fromUserName: fromUser.displayName || fromUser.email,
      type: sameRank ? "task_approval_required" : "task_received",
      taskText: taskData.text,
      sentTaskId: docRef.id,
      read: false,
      createdAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("sendTask error:", error);
    return { success: false, error: error.message };
  }
};

// ─── ACCEPTARE / REFUZ ────────────────────────────────────────────────────────

// Acceptă un task primit (peer-to-peer)
export const acceptTask = async (sentTaskId, sentTask, recipientUid) => {
  try {
    await updateDoc(doc(db, "sentTasks", sentTaskId), {
      status: "accepted",
      respondedAt: serverTimestamp(),
    });

    // Adaugă în to-do-urile destinatarului
    await addDoc(collection(db, "todos"), {
      userId: recipientUid,
      text: sentTask.taskText,
      priority: sentTask.priority || "medium",
      deadline: sentTask.deadline || "",
      startTime: sentTask.startTime || "",
      endTime: sentTask.endTime || "",
      category: sentTask.category || "General",
      recurrence: "none",
      status: "Urmează",
      sentTaskId,
      sentBy: sentTask.fromUserName,
      createdAt: serverTimestamp(),
    });

    // Notifică expeditorul
    await addDoc(collection(db, "notifications"), {
      toUserId: sentTask.fromUserId,
      fromUserId: recipientUid,
      fromUserName: sentTask.toUserName,
      type: "task_accepted",
      taskText: sentTask.taskText,
      sentTaskId,
      read: false,
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("acceptTask error:", error);
    return { success: false, error: error.message };
  }
};

// Refuză un task primit (peer-to-peer)
export const refuseTask = async (sentTaskId, sentTask, recipientUid, recipientName) => {
  try {
    await updateDoc(doc(db, "sentTasks", sentTaskId), {
      status: "refused",
      respondedAt: serverTimestamp(),
    });

    // Notifică expeditorul
    await addDoc(collection(db, "notifications"), {
      toUserId: sentTask.fromUserId,
      fromUserId: recipientUid,
      fromUserName: recipientName,
      type: "task_refused",
      taskText: sentTask.taskText,
      sentTaskId,
      read: false,
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("refuseTask error:", error);
    return { success: false, error: error.message };
  }
};

// ─── LISTENERS ───────────────────────────────────────────────────────────────

// Taskuri trimise de utilizatorul curent
export const listenToSentTasks = (userId, callback) => {
  const q = query(
    collection(db, "sentTasks"),
    where("fromUserId", "==", userId),
    orderBy("sentAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// Taskuri primite de utilizatorul curent
export const listenToReceivedTasks = (userId, callback) => {
  const q = query(
    collection(db, "sentTasks"),
    where("toUserId", "==", userId),
    orderBy("sentAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// Notificările utilizatorului curent
export const listenToNotifications = (userId, callback) => {
  const q = query(
    collection(db, "notifications"),
    where("toUserId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// Marchează o notificare ca citită
export const markNotificationRead = async (notifId) => {
  await updateDoc(doc(db, "notifications", notifId), { read: true });
};

// Marchează toate notificările ca citite
export const markAllNotificationsRead = async (userId) => {
  const q = query(
    collection(db, "notifications"),
    where("toUserId", "==", userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  const promises = snapshot.docs.map((d) =>
    updateDoc(doc(db, "notifications", d.id), { read: true })
  );
  await Promise.all(promises);
};
