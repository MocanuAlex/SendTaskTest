import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { registerUser } from "../services/authService";
import { useNavigation } from "@react-navigation/native";

const ROLES = [
  { value: "admin",   label: "Admin",      color: "#6b21a8", desc: "Trimite taskuri oricui" },
  { value: "manager", label: "Manager",    color: "#1d4ed8", desc: "Trimite taskuri către Useri" },
  { value: "user",    label: "Utilizator", color: "#15803d", desc: "Taskuri proprii" },
];

export default function Register() {
  const [name, setName]         = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("user");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!name.trim())     { setError("Introduceți un nume."); return; }
    if (!username.trim()) { setError("Introduceți un username."); return; }
    if (username.trim().includes(" ")) { setError("Username-ul nu poate conține spații."); return; }
    if (password.length < 6) { setError("Parola trebuie să aibă minim 6 caractere."); return; }

    setLoading(true);
    setError("");
    const result = await registerUser(name.trim(), username.trim(), password, role);
    setLoading(false);

    if (result.success) {
      navigation.replace("MainTabs");
    } else {
      setError(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.authContainer}>
          <Text style={styles.logo}>📤</Text>
          <Text style={styles.title}>SendTask</Text>
          <Text style={styles.subtitle}>Creează cont</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Nume complet..."
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Username (fără spații)..."
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Parolă (minim 6 caractere)..."
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Selector de rol */}
          <Text style={styles.roleLabel}>Selectează rolul:</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.roleBtn,
                  role === r.value && { backgroundColor: r.color, borderColor: r.color },
                ]}
                onPress={() => setRole(r.value)}
              >
                <Text style={[styles.roleBtnText, role === r.value && { color: "#fff" }]}>
                  {r.label}
                </Text>
                <Text style={[styles.roleBtnDesc, role === r.value && { color: "rgba(255,255,255,0.8)" }]}>
                  {r.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Se creează contul..." : "Creează cont"}
            </Text>
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Ai deja cont? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#dbe2ea" },
  scrollContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  authContainer: {
    backgroundColor: "#f8faff",
    borderRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
    alignItems: "center",
  },
  logo: {
    fontSize: 48,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a202c",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    marginBottom: 24,
    fontWeight: "500",
  },
  input: {
    width: "100%",
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#cbd5e0",
    borderRadius: 12,
    backgroundColor: "#edf2f7",
    color: "#1a202c",
    fontSize: 16,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 10,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  roleRow: { flexDirection: "column", gap: 10, marginBottom: 20, width: "100%" },
  roleBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#cbd5e0",
    backgroundColor: "#edf2f7",
    width: "100%",
  },
  roleBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: 2,
  },
  roleBtnDesc: { fontSize: 12, color: "#4a5568" },
  button: {
    width: "100%",
    padding: 14,
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: "#2b6cb0",
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  linkContainer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  linkText: { color: "#4a5568", fontSize: 15 },
  link: { color: "#2b6cb0", fontSize: 15, fontWeight: "600" },
  errorText: {
    color: "#e53e3e",
    fontSize: 14,
    marginBottom: 16,
    padding: 10,
    backgroundColor: "rgba(229, 62, 62, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(229, 62, 62, 0.2)",
    width: "100%",
    textAlign: "center",
  },
});
