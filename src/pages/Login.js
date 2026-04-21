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
import { loginUser } from "../services/authService";
import { useNavigation } from "@react-navigation/native";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!username.trim()) { setError("Introduceți username-ul."); return; }
    if (!password)        { setError("Introduceți parola."); return; }

    setLoading(true);
    setError("");
    const result = await loginUser(username.trim(), password);
    setLoading(false);

    if (result.success) {
      navigation.replace("MainTabs");
    } else {
      setError(result.error || "Username sau parolă incorecte.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authContainer}>
          <Text style={styles.logo}>📤</Text>
          <Text style={styles.title}>SendTask</Text>
          <Text style={styles.subtitle}>Autentificare</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Username..."
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Parolă..."
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Se conectează..." : "Login"}
            </Text>
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Nu ai cont? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.link}>Creează cont</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dbe2ea",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  authContainer: {
    backgroundColor: "#f8faff",
    borderRadius: 20,
    padding: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 8,
    alignItems: "center",
  },
  logo: {
    fontSize: 52,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1a202c",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
    marginBottom: 28,
    fontWeight: "500",
  },
  input: {
    width: "100%",
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#cbd5e0",
    borderRadius: 12,
    backgroundColor: "#edf2f7",
    color: "#1a202c",
    fontSize: 16,
  },
  button: {
    width: "100%",
    padding: 14,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: "#2b6cb0",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  linkText: {
    color: "#4a5568",
    fontSize: 15,
  },
  link: {
    color: "#2b6cb0",
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 14,
    marginBottom: 20,
    padding: 10,
    backgroundColor: "rgba(229, 62, 62, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(229, 62, 62, 0.2)",
    width: "100%",
    textAlign: "center",
  },
});
