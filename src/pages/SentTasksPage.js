// src/pages/SentTasksPage.js — Tab Trimise: taskuri delegate + notificări
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
  Alert,
} from "react-native";
import { auth } from "../firebase-config";
import {
  listenToSentTasks,
  listenToReceivedTasks,
  listenToNotifications,
  acceptTask,
  refuseTask,
  markAllNotificationsRead,
} from "../services/taskService";
import { useTheme } from "../context/ThemeContext";

const STATUS_COLORS = {
  pending:  { bg: "#92400e", text: "🕐 În așteptare" },
  accepted: { bg: "#166534", text: "✅ Acceptat" },
  refused:  { bg: "#991b1b", text: "❌ Refuzat" },
};

const ROLE_LABELS = { admin: "Admin", manager: "Manager", user: "Utilizator" };

export default function SentTasksPage() {
  const [activeTab, setActiveTab]     = useState("received"); // received | sent | notifications
  const [sentTasks, setSentTasks]     = useState([]);
  const [receivedTasks, setReceivedTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { darkMode, toggleDarkMode } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    setCurrentUser(user);

    const unsubSent     = listenToSentTasks(user.uid, setSentTasks);
    const unsubReceived = listenToReceivedTasks(user.uid, setReceivedTasks);
    const unsubNotifs   = listenToNotifications(user.uid, setNotifications);

    return () => { unsubSent(); unsubReceived(); unsubNotifs(); };
  }, []);

  const theme = darkMode ? darkTheme : lightTheme;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingCount = receivedTasks.filter((t) => t.status === "pending").length;

  const handleAccept = async (task) => {
    Alert.alert(
      "Acceptă task",
      `Vrei să accepți taskul "${task.taskText}"?`,
      [
        { text: "Nu" },
        {
          text: "Da, acceptă",
          onPress: async () => {
            const result = await acceptTask(task.id, task, currentUser.uid);
            if (!result.success) Alert.alert("Eroare", result.error);
          },
        },
      ]
    );
  };

  const handleRefuse = async (task) => {
    Alert.alert(
      "Refuză task",
      `Vrei să refuzi taskul "${task.taskText}"?`,
      [
        { text: "Nu" },
        {
          text: "Da, refuză",
          style: "destructive",
          onPress: async () => {
            const result = await refuseTask(
              task.id, task, currentUser.uid,
              currentUser.displayName || currentUser.email
            );
            if (!result.success) Alert.alert("Eroare", result.error);
          },
        },
      ]
    );
  };

  const handleMarkAllRead = () => {
    if (currentUser) markAllNotificationsRead(currentUser.uid);
  };

  // ─── Formatează timestamp Firestore ────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch { return ""; }
  };

  // ─── Render tab content ────────────────────────────────────────────
  const renderReceived = () => (
    <View style={styles.tabContent}>
      {receivedTasks.length === 0 ? (
        <EmptyState theme={theme} text="Nu ai primit niciun task." />
      ) : (
        receivedTasks.map((t) => {
          const statusInfo = STATUS_COLORS[t.status] || STATUS_COLORS.pending;
          const pColor = { low: "#38a169", medium: "#d69e2e", high: "#e53e3e" }[t.priority] || "#d69e2e";
          return (
            <View key={t.id} style={[styles.taskCard, { backgroundColor: theme.card, borderLeftColor: pColor }]}>
              <Text style={[styles.taskText, { color: theme.text }]}>{t.taskText}</Text>
              <View style={styles.meta}>
                <Text style={[styles.metaText, { color: theme.sub }]}>
                  De la: <Text style={{ fontWeight: "700" }}>{t.fromUserName}</Text>
                  {" "}({ROLE_LABELS[t.fromUserRole] || t.fromUserRole})
                </Text>
                {t.deadline ? (
                  <Text style={[styles.metaText, { color: theme.sub }]}>📅 {t.deadline}</Text>
                ) : null}
              </View>
              <View style={styles.badges}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={styles.statusBadgeText}>{statusInfo.text}</Text>
                </View>
                {t.requiresApproval && (
                  <View style={[styles.badge, { backgroundColor: "#1e3a5f" }]}>
                    <Text style={styles.badgeText}>Necesită aprobare</Text>
                  </View>
                )}
              </View>

              {t.status === "pending" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btnAccept, { backgroundColor: "#166534" }]}
                    onPress={() => handleAccept(t)}
                  >
                    <Text style={styles.btnActionText}>✅ Acceptă</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnRefuse, { backgroundColor: "#991b1b" }]}
                    onPress={() => handleRefuse(t)}
                  >
                    <Text style={styles.btnActionText}>❌ Refuză</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const renderSent = () => (
    <View style={styles.tabContent}>
      {sentTasks.length === 0 ? (
        <EmptyState theme={theme} text="Nu ai trimis niciun task." />
      ) : (
        sentTasks.map((t) => {
          const statusInfo = STATUS_COLORS[t.status] || STATUS_COLORS.pending;
          const pColor = { low: "#38a169", medium: "#d69e2e", high: "#e53e3e" }[t.priority] || "#d69e2e";
          return (
            <View key={t.id} style={[styles.taskCard, { backgroundColor: theme.card, borderLeftColor: pColor }]}>
              <Text style={[styles.taskText, { color: theme.text }]}>{t.taskText}</Text>
              <View style={styles.meta}>
                <Text style={[styles.metaText, { color: theme.sub }]}>
                  Către: <Text style={{ fontWeight: "700" }}>{t.toUserName}</Text>
                  {" "}({ROLE_LABELS[t.toUserRole] || t.toUserRole})
                </Text>
                {t.deadline ? (
                  <Text style={[styles.metaText, { color: theme.sub }]}>📅 {t.deadline}</Text>
                ) : null}
                <Text style={[styles.metaText, { color: theme.sub }]}>
                  Trimis: {formatDate(t.sentAt)}
                </Text>
              </View>
              <View style={styles.badges}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={styles.statusBadgeText}>{statusInfo.text}</Text>
                </View>
                {t.requiresApproval && (
                  <View style={[styles.badge, { backgroundColor: "#1e3a5f" }]}>
                    <Text style={styles.badgeText}>Necesita aprobare</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.tabContent}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllBtn, { backgroundColor: theme.inputBg }]}
          onPress={handleMarkAllRead}
        >
          <Text style={[styles.markAllText, { color: theme.text }]}>✓ Marchează toate ca citite</Text>
        </TouchableOpacity>
      )}
      {notifications.length === 0 ? (
        <EmptyState theme={theme} text="Nu ai notificări." />
      ) : (
        notifications.map((n) => {
          const typeConfig = {
            task_received:          { emoji: "📨", bg: "#1e3a5f", label: "Task primit" },
            task_approval_required: { emoji: "⏳", bg: "#92400e", label: "Necesită aprobare" },
            task_accepted:          { emoji: "✅", bg: "#166534", label: "Task acceptat" },
            task_refused:           { emoji: "❌", bg: "#991b1b", label: "Task refuzat" },
          };
          const cfg = typeConfig[n.type] || { emoji: "🔔", bg: "#4a5568", label: "Notificare" };
          return (
            <View
              key={n.id}
              style={[
                styles.notifCard,
                { backgroundColor: n.read ? theme.card : theme.unread },
                !n.read && styles.notifUnread,
              ]}
            >
              <Text style={styles.notifEmoji}>{cfg.emoji}</Text>
              <View style={styles.notifBody}>
                <View style={[styles.badge, { backgroundColor: cfg.bg, alignSelf: "flex-start" }]}>
                  <Text style={styles.badgeText}>{cfg.label}</Text>
                </View>
                <Text style={[styles.notifText, { color: theme.text }]}>
                  <Text style={{ fontWeight: "700" }}>{n.fromUserName}</Text>
                  {" → "}{n.taskText}
                </Text>
                <Text style={[styles.notifDate, { color: theme.sub }]}>
                  {formatDate(n.createdAt)}
                </Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={darkMode ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>📤 Trimise & Primite</Text>
        <TouchableOpacity onPress={toggleDarkMode}>
          <Text style={{ fontSize: 20 }}>{darkMode ? "☀️" : "🌙"}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.card }]}>
        {[
          { id: "received",      label: "Primite",      badge: pendingCount },
          { id: "sent",          label: "Trimise",      badge: 0 },
          { id: "notifications", label: "Notificări",   badge: unreadCount },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && { borderBottomColor: "#2b6cb0", borderBottomWidth: 3 }]}
            onPress={() => setActiveTab(tab.id)}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, { color: activeTab === tab.id ? "#2b6cb0" : theme.sub }]}>
                {tab.label}
              </Text>
              {tab.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeTab === "received"      && renderReceived()}
        {activeTab === "sent"          && renderSent()}
        {activeTab === "notifications" && renderNotifications()}
      </ScrollView>
    </SafeAreaView>
  );
}

const EmptyState = ({ theme, text }) => (
  <View style={[styles.empty, { backgroundColor: theme.card }]}>
    <Text style={styles.emptyEmoji}>📭</Text>
    <Text style={[styles.emptyText, { color: theme.sub }]}>{text}</Text>
  </View>
);

const lightTheme = {
  bg: "#dbe2ea", card: "#f8faff", text: "#1a202c", sub: "#4a5568",
  inputBg: "#edf2f7", unread: "#dbeafe",
};
const darkTheme = {
  bg: "#1a202c", card: "#2d3748", text: "#f7fafc", sub: "#a0aec0",
  inputBg: "#4a5568", unread: "#1e3a5f",
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 50 : 16,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { fontSize: 14, fontWeight: "700" },
  tabBadge: {
    backgroundColor: "#e53e3e",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  tabBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  scroll: { padding: 16, paddingBottom: 40 },
  tabContent: { gap: 14 },

  taskCard: {
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 6,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  taskText: { fontSize: 17, fontWeight: "700" },
  meta: { gap: 4 },
  metaText: { fontSize: 13 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 12 },
  btnAccept: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  btnRefuse: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  btnActionText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  markAllBtn: { padding: 12, borderRadius: 10, alignItems: "center", marginBottom: 8 },
  markAllText: { fontSize: 14, fontWeight: "600" },

  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    position: "relative",
  },
  notifUnread: {
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  notifEmoji: { fontSize: 24, marginTop: 2 },
  notifBody: { flex: 1, gap: 6 },
  notifText: { fontSize: 14, lineHeight: 20 },
  notifDate: { fontSize: 12 },
  unreadDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3b82f6",
  },

  empty: { borderRadius: 14, padding: 40, alignItems: "center", gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, textAlign: "center" },
});
