// src/pages/StatisticsPage.js — Statistici și grafice
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { auth } from "../firebase-config";
import { listenToTodos } from "../services/todoService";
import { useTheme } from "../context/ThemeContext";

export default function StatisticsPage() {
  const [todos, setTodos] = useState([]);
  const { darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = listenToTodos(user.uid, setTodos);
    return unsub;
  }, []);

  const theme = darkMode ? darkTheme : lightTheme;

  // ─── Calcule statistici ───────────────────────────────────────────
  const total     = todos.length;
  const done      = todos.filter((t) => t.status === "Finalizat").length;
  const pending   = todos.filter((t) => t.status === "Urmează").length;
  const overdue   = todos.filter((t) => {
    if (t.status === "Finalizat" || t.status === "Anulat") return false;
    if (!t.deadline) return false;
    return t.deadline < new Date().toISOString().split("T")[0];
  }).length;
  const cancelled = todos.filter((t) => t.status === "Anulat").length;
  const ratePercent = total > 0 ? Math.round((done / total) * 100) : 0;

  // Per prioritate
  const byPriority = {
    high:   todos.filter((t) => t.priority === "high"   || t.priority === "Ridicată").length,
    medium: todos.filter((t) => t.priority === "medium" || t.priority === "Mediu").length,
    low:    todos.filter((t) => t.priority === "low"    || t.priority === "Scăzută").length,
  };

  // Per categorie
  const categoryMap = {};
  todos.forEach((t) => {
    const cat = t.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  // Ultimele 7 zile
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const byDay = last7Days.map((day) => ({
    label: day.slice(5), // MM-DD
    total: todos.filter((t) => t.deadline === day).length,
    done:  todos.filter((t) => t.deadline === day && t.status === "Finalizat").length,
  }));
  const maxByDay = Math.max(...byDay.map((d) => d.total), 1);

  // ─── Helper: bara procentuală ─────────────────────────────────────
  const Bar = ({ value, max, color, label, sublabel }) => (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: theme.sub }]}>{label}</Text>
      <View style={[styles.barBg, { backgroundColor: theme.progressBg }]}>
        <View style={[styles.barFill, { width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color: theme.text }]}>
        {value} {sublabel || ""}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={darkMode ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>📊 Statistici</Text>
          <TouchableOpacity onPress={toggleDarkMode}>
            <Text style={{ fontSize: 22 }}>{darkMode ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>

        {/* Rata de finalizare */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Rata de finalizare</Text>
          <Text style={[styles.bigPercent, { color: ratePercent >= 70 ? "#38a169" : ratePercent >= 40 ? "#d69e2e" : "#e53e3e" }]}>
            {ratePercent}%
          </Text>
          <View style={[styles.barBg, { backgroundColor: theme.progressBg, height: 14, borderRadius: 7 }]}>
            <View style={[
              styles.barFill,
              { width: `${ratePercent}%`, height: 14, backgroundColor: ratePercent >= 70 ? "#38a169" : ratePercent >= 40 ? "#d69e2e" : "#e53e3e" }
            ]} />
          </View>
          <Text style={[styles.cardSub, { color: theme.sub }]}>
            {done} finalizate din {total} total
          </Text>
        </View>

        {/* Status overview */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Status activități</Text>
          <View style={styles.statGrid}>
            {[
              { label: "Total",      value: total,     color: "#4a5568", emoji: "📋" },
              { label: "Finalizat",  value: done,      color: "#38a169", emoji: "✅" },
              { label: "Urmează",    value: pending,   color: "#d69e2e", emoji: "🕐" },
              { label: "Restante",   value: overdue,   color: "#9f1239", emoji: "⚠️" },
              { label: "Anulate",    value: cancelled, color: "#718096", emoji: "❌" },
            ].map((s) => (
              <View key={s.label} style={[styles.statItem, { backgroundColor: theme.inputBg }]}>
                <Text style={styles.statEmoji}>{s.emoji}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.sub }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Per prioritate */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Pe prioritate</Text>
          <Bar value={byPriority.high}   max={total} color="#e53e3e" label="★★★ Ridicată" />
          <Bar value={byPriority.medium} max={total} color="#d69e2e" label="★★  Medie" />
          <Bar value={byPriority.low}    max={total} color="#38a169" label="★    Scăzută" />
        </View>

        {/* Per categorie */}
        {categories.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Pe categorie</Text>
            {categories.map(([cat, count], i) => {
              const catColors = ["#4299e1","#ed8936","#48bb78","#9f7aea","#f56565","#38b2ac"];
              return (
                <Bar
                  key={cat}
                  value={count}
                  max={total}
                  color={catColors[i % catColors.length]}
                  label={`🏷️ ${cat}`}
                />
              );
            })}
          </View>
        )}

        {/* Ultimele 7 zile */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Ultimele 7 zile (deadline)</Text>
          <View style={styles.dayChart}>
            {byDay.map(({ label, total: t, done: d }) => (
              <View key={label} style={styles.dayCol}>
                <Text style={[styles.dayValue, { color: theme.text }]}>{t || ""}</Text>
                <View style={styles.dayBarContainer}>
                  <View style={[styles.dayBar, { height: Math.max((t / maxByDay) * 80, t > 0 ? 4 : 0), backgroundColor: "#4299e1" }]} />
                  {d > 0 && (
                    <View style={[styles.dayBarDone, { height: Math.max((d / maxByDay) * 80, d > 0 ? 4 : 0), backgroundColor: "#38a169" }]} />
                  )}
                </View>
                <Text style={[styles.dayLabel, { color: theme.sub }]}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#4299e1" }]} />
              <Text style={[styles.legendText, { color: theme.sub }]}>Total</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#38a169" }]} />
              <Text style={[styles.legendText, { color: theme.sub }]}>Finalizate</Text>
            </View>
          </View>
        </View>

        {/* Recurență */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Recurență</Text>
          {[
            { label: "🔄 Zilnic",       value: todos.filter((t) => t.recurrence === "daily").length },
            { label: "📅 Săptămânal",   value: todos.filter((t) => t.recurrence === "weekly").length },
            { label: "⬛ Fără recurență",value: todos.filter((t) => !t.recurrence || t.recurrence === "none").length },
          ].map((r) => (
            <Bar key={r.label} value={r.value} max={total} color="#9f7aea" label={r.label} />
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const lightTheme = {
  bg: "#dbe2ea", card: "#f8faff", text: "#1a202c", sub: "#4a5568",
  inputBg: "#edf2f7", progressBg: "#e2e8f0",
};
const darkTheme = {
  bg: "#1a202c", card: "#2d3748", text: "#f7fafc", sub: "#a0aec0",
  inputBg: "#4a5568", progressBg: "#374151",
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

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  cardSub: { fontSize: 13, textAlign: "center" },

  bigPercent: { fontSize: 56, fontWeight: "900", textAlign: "center" },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statItem: {
    flex: 1,
    minWidth: "28%",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  barLabel: { width: 110, fontSize: 13, fontWeight: "600" },
  barBg: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  barValue: { width: 30, fontSize: 13, fontWeight: "700", textAlign: "right" },

  dayChart: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 100 },
  dayCol: { flex: 1, alignItems: "center", gap: 4 },
  dayValue: { fontSize: 11, fontWeight: "700", minHeight: 16 },
  dayBarContainer: { flexDirection: "row", gap: 2, alignItems: "flex-end" },
  dayBar: { width: 12, borderRadius: 3 },
  dayBarDone: { width: 12, borderRadius: 3 },
  dayLabel: { fontSize: 10, fontWeight: "600" },

  legend: { flexDirection: "row", gap: 20, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: "600" },
});
