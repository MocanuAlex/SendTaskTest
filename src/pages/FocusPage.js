// src/pages/FocusPage.js — Modul Focus: Pomodoro timer integrat pe eveniment
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { auth } from "../firebase-config";
import { listenToTodos, updateTodo } from "../services/todoService";
import { useTheme } from "../context/ThemeContext";

const WORK_DURATION  = 25 * 60; // 25 minute
const BREAK_DURATION =  5 * 60; // 5 minute

export default function FocusPage() {
  const [todos, setTodos]               = useState([]);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [timeLeft, setTimeLeft]         = useState(WORK_DURATION);
  const [isRunning, setIsRunning]       = useState(false);
  const [isBreak, setIsBreak]           = useState(false);
  const [sessions, setSessions]         = useState(0);
  const { darkMode, toggleDarkMode } = useTheme();
  const intervalRef                     = useRef(null);

  // Taskuri utilizator curent
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = listenToTodos(user.uid, (list) => {
      // Afișăm doar taskurile active (nu finalizate/anulate)
      setTodos(list.filter((t) => t.status !== "Finalizat" && t.status !== "Anulat"));
    });
    return unsub;
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleTimerEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isBreak]);

  const handleTimerEnd = () => {
    setIsRunning(false);
    if (!isBreak) {
      // Sesiune de lucru terminată
      const newSessions = sessions + 1;
      setSessions(newSessions);
      Alert.alert(
        "🍅 Pomodoro terminat!",
        `Sesiune ${newSessions} completă. Timp de pauză!`,
        [{ text: "Începe pauza", onPress: startBreak }]
      );
    } else {
      // Pauza terminată
      Alert.alert(
        "⏰ Pauza s-a terminat!",
        "Gata de o nouă sesiune de lucru?",
        [{ text: "Start!", onPress: startWork }]
      );
    }
  };

  const startWork = () => {
    setIsBreak(false);
    setTimeLeft(WORK_DURATION);
    setIsRunning(true);
  };

  const startBreak = () => {
    setIsBreak(true);
    setTimeLeft(BREAK_DURATION);
    setIsRunning(true);
  };

  const toggleTimer = () => {
    if (!selectedTodo && !isRunning) {
      Alert.alert("Selectează un task", "Alege un task activ pentru a începe sesiunea Focus.");
      return;
    }
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(WORK_DURATION);
  };

  const markCurrentTaskDone = async () => {
    if (!selectedTodo) return;
    await updateTodo(selectedTodo.id, { status: "Finalizat" });
    setSelectedTodo(null);
    resetTimer();
    Alert.alert("✅ Task finalizat!", "Activitatea a fost marcată ca finalizată.");
  };

  // Format MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const totalDuration = isBreak ? BREAK_DURATION : WORK_DURATION;
  const progress = (timeLeft / totalDuration) * 100;

  const theme = darkMode ? darkTheme : lightTheme;
  const timerColor = isBreak ? "#48bb78" : "#e53e3e";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={darkMode ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>🍅 Modul Focus</Text>
          <TouchableOpacity onPress={toggleDarkMode}>
            <Text style={[styles.themeBtn, { color: theme.sub }]}>{darkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>

        {/* Timer Ring */}
        <View style={[styles.timerCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.timerMode, { color: isBreak ? "#48bb78" : "#e53e3e" }]}>
            {isBreak ? "🌿 Pauză" : "🎯 Concentrare"}
          </Text>

          {/* Progress bar */}
          <View style={[styles.progressBg, { backgroundColor: theme.progressBg }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: timerColor }]} />
          </View>

          <Text style={[styles.timerDisplay, { color: timerColor }]}>
            {formatTime(timeLeft)}
          </Text>

          {selectedTodo && (
            <View style={[styles.selectedTaskBadge, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.selectedTaskText, { color: theme.text }]} numberOfLines={2}>
                📌 {selectedTodo.text}
              </Text>
            </View>
          )}

          <View style={styles.sessionCount}>
            {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
              <View key={i} style={[styles.sessionDot, { backgroundColor: timerColor }]} />
            ))}
          </View>
          <Text style={[styles.sessionText, { color: theme.sub }]}>
            {sessions} sesiune{sessions !== 1 ? "s" : ""} completate azi
          </Text>

          {/* Butoane */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btnMain, { backgroundColor: isRunning ? theme.danger : timerColor }]}
              onPress={toggleTimer}
            >
              <Text style={styles.btnMainText}>
                {isRunning ? "⏸ Pauză" : "▶ Start"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSecondary, { backgroundColor: theme.inputBg }]}
              onPress={resetTimer}
            >
              <Text style={[styles.btnSecondaryText, { color: theme.text }]}>↺ Reset</Text>
            </TouchableOpacity>
          </View>

          {selectedTodo && !isRunning && sessions > 0 && (
            <TouchableOpacity
              style={[styles.btnDone, { backgroundColor: "#38a169" }]}
              onPress={markCurrentTaskDone}
            >
              <Text style={styles.btnDoneText}>✅ Marchează task ca finalizat</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista taskuri */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Alege taskul de focusat:</Text>

        {todos.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.emptyText, { color: theme.sub }]}>
              Nu ai taskuri active. Adaugă un task din tab-ul Taskuri.
            </Text>
          </View>
        ) : (
          todos.map((t) => {
            const isSelected = selectedTodo?.id === t.id;
            const pColor = { low: "#38a169", medium: "#d69e2e", high: "#e53e3e" }[t.priority] || "#d69e2e";
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.todoCard,
                  { backgroundColor: theme.card, borderLeftColor: pColor },
                  isSelected && { borderColor: timerColor, borderWidth: 2 },
                ]}
                onPress={() => {
                  setSelectedTodo(isSelected ? null : t);
                  if (isRunning) { setIsRunning(false); }
                  resetTimer();
                }}
              >
                <Text style={[styles.todoText, { color: theme.text }]}>{t.text}</Text>
                <View style={styles.todoBadges}>
                  {t.deadline ? (
                    <Text style={[styles.todoBadge, { color: theme.sub }]}>📅 {t.deadline}</Text>
                  ) : null}
                  <Text style={[styles.todoBadge, { color: pColor }]}>
                    {"★".repeat(t.priority === "high" ? 3 : t.priority === "low" ? 1 : 2)}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: timerColor }]}>
                    <Text style={styles.selectedBadgeText}>Selectat</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const lightTheme = {
  bg: "#dbe2ea", card: "#f8faff", text: "#1a202c", sub: "#4a5568",
  inputBg: "#edf2f7", progressBg: "#e2e8f0", danger: "#e53e3e",
};
const darkTheme = {
  bg: "#1a202c", card: "#2d3748", text: "#f7fafc", sub: "#a0aec0",
  inputBg: "#4a5568", progressBg: "#2d3748", danger: "#fc8181",
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Platform.OS === "android" ? 50 : 10,
    marginBottom: 24,
  },
  headerTitle: { fontSize: 26, fontWeight: "800" },
  themeBtn: { fontSize: 22 },

  timerCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 28,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  timerMode: { fontSize: 18, fontWeight: "700" },
  progressBg: { width: "100%", height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  timerDisplay: { fontSize: 72, fontWeight: "900", letterSpacing: 4 },

  selectedTaskBadge: {
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  selectedTaskText: { fontSize: 15, fontWeight: "600", textAlign: "center" },

  sessionCount: { flexDirection: "row", gap: 6 },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionText: { fontSize: 13, fontWeight: "600" },

  btnRow: { flexDirection: "row", gap: 14, width: "100%" },
  btnMain: {
    flex: 2,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnMainText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  btnSecondary: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSecondaryText: { fontSize: 16, fontWeight: "600" },
  btnDone: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDoneText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  emptyCard: { borderRadius: 14, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 15, textAlign: "center" },

  todoCard: {
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 6,
    marginBottom: 14,
    position: "relative",
  },
  todoText: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  todoBadges: { flexDirection: "row", gap: 12 },
  todoBadge: { fontSize: 13, fontWeight: "600" },
  selectedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
