import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebase-config";
import { doc, setDoc, getDoc, query, collection, where, getDocs } from "firebase/firestore";

// Convertim username în email fals (Firebase necesită email intern)
const usernameToEmail = (username) =>
  `${username.toLowerCase().trim()}@sendtask.local`;

// REGISTER — cu username (fără email real)
export const registerUser = async (name, username, password, role = "user") => {
  try {
    // Verificăm dacă username-ul există deja
    const q = query(collection(db, "users"), where("username", "==", username.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { success: false, error: "Username-ul este deja folosit." };
    }

    const fakeEmail = usernameToEmail(username);
    const userCred = await createUserWithEmailAndPassword(auth, fakeEmail, password);
    const user = userCred.user;

    await updateProfile(user, { displayName: name });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name,
      username: username.toLowerCase().trim(),
      email: fakeEmail,
      role,
      createdAt: new Date().toISOString(),
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// LOGIN — cu username + parolă
export const loginUser = async (username, password) => {
  try {
    const fakeEmail = usernameToEmail(username);
    const userCred = await signInWithEmailAndPassword(auth, fakeEmail, password);
    return { success: true, user: userCred.user };
  } catch (error) {
    return { success: false, error: "Username sau parolă incorecte." };
  }
};

// LOGOUT
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obține rolul unui utilizator din Firestore
export const getUserRole = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return docSnap.data().role || "user";
    }
    return "user";
  } catch (error) {
    return "user";
  }
};

// Obține toate datele utilizatorului
export const getUserData = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    return null;
  }
};
