// src/pages/TodoPage.js — SendTask: pagina principală cu roluri, categorie, recurență, trimitere
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
} from "react-native";
import { auth } from "../firebase-config";
import { listenToTodos, addTodo, updateTodo, deleteTodo } from "../services/todoService";
import { getUserRole } from "../services/authService";
import { sendTask, getAllUsers, listenToNotifications } from "../services/taskService";
import { useNavigation } from "@react-navigation/native";
import CustomPicker from "../components/CustomPicker";
import { useTheme } from "../context/ThemeContext";

const ROLE_LABELS  = { admin: "Admin", manager: "Manager", user: "Utilizator" };
const ROLE_COLORS  = { admin: "#6b21a8", manager: "#1d4ed8", user: "#15803d" };
const CATEGORIES   = ["General", "Muncă", "Personal", "Urgent", "Studiu"];
const RECURRENCES  = [
  { label: "Fără recurență", value: "none" },
  { label: "🔄 Zilnic",      value: "daily" },
  { label: "📅 Săptămânal",  value: "weekly" },
];

const TodoPage = () => {
  const navigation = useNavigation();

  // ─── User & rol ──────────────────────────────────────────────────
  const [user, setUser]         = useState(null);
  const [userRole, setUserRole] = useState("user");

  // ─── Lista taskuri & notificări ──────────────────────────────────
  const [todos, setTodos]           = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ─── Form: adaugă task ───────────────────────────────────────────
  const [text, setText]           = useState("");
  const [deadline, setDeadline]   = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime]     = useState("");
  const [priority, setPriority]   = useState("medium");
  const [category, setCategory]   = useState("General");
  const [recurrence, setRecurrence] = useState("none");

  // ─── Editare ─────────────────────────────────────────────────────
  const [editId, setEditId]             = useState(null);
  const [editText, setEditText]         = useState("");
  const [editDate, setEditDate]         = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime]   = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCategory, setEditCategory] = useState("General");
  const [editRecurrence, setEditRecurrence] = useState("none");

  // ─── Filtre ──────────────────────────────────────────────────────
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("Toate");

  // ─── Modal trimitere task ─────────────────────────────────────────
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTaskData, setSendTaskData]   = useState(null);
  const [allUsers, setAllUsers]           = useState([]);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [usersLoading, setUsersLoading]   = useState(false);
  const [sending, setSending]             = useState(false);

  // ─── UI ──────────────────────────────────────────────────────────
  const { darkMode, toggleDarkMode } = useTheme();
  const [, setTick]               = useState(0);

  const TODAY         = new Date().toISOString().split("T")[0];
  const theme         = darkMode ? darkTheme : lightTheme;

  // Timer re-render la fiecare minut (pentru statusul "Restant")
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auth + încărcare date
  useEffect(() => {
    let unsubTodos = null;
    let unsubNotifs = null;

    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const role = await getUserRole(currentUser.uid);
        setUserRole(role);

        unsubTodos = listenToTodos(currentUser.uid, setTodos);
        unsubNotifs = listenToNotifications(currentUser.uid, (notifs) => {
          setUnreadCount(notifs.filter((n) => !n.read).length);
        });
      } else {
        setUser(null);
        setTodos([]);
        navigation.replace("Login");
      }
    });

    return () => {
      unsubAuth();
      if (unsubTodos)  unsubTodos();
      if (unsubNotifs) unsubNotifs();
    };
  }, [navigation]);

  // ─── Helpers de prioritate ────────────────────────────────────────
  const normalizePriority = (p) => {
    if (p === "Scăzută" || p === "low")    return "low";
    if (p === "Ridicată" || p === "high")  return "high";
    return "medium";
  };

  const starIcons  = { low: "★", medium: "★★", high: "★★★" };
  const starColors = { low: "#38A169", medium: "#D69E2E", high: "#E53E3E" };

  const statusBackgrounds = {
    Finalizat: "rgba(34, 84, 61, 0.9)",
    Urmează:   "rgba(116, 66, 16, 0.9)",
    Anulat:    "rgba(110, 25, 25, 0.9)",
    Restant:   "rgba(76, 29, 149, 0.9)",
  };

  const calculateStatus = (task) => {
    if (task.status === "Finalizat" || task.status === "Anulat") return task.status;
    if (!task.deadline) return task.status;
    const now      = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (todayStr > task.deadline) return "Restant";
    if (todayStr === task.deadline && task.endTime) {
      const [endH, endM] = task.endTime.split(":").map(Number);
      if (now.getHours() > endH || (now.getHours() === endH && now.getMinutes() > endM)) return "Restant";
    }
    return task.status;
  };

  // ─── CRUD ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!text.trim() || !deadline) return;
    if (deadline < TODAY) { Alert.alert("Eroare", "Nu poți alege o dată din trecut!"); return; }
    await addTodo(user.uid, { text: text.trim(), deadline, startTime, endTime, priority, category, recurrence, status: "Urmează" });
    setText(""); setDeadline(""); setStartTime(""); setEndTime("");
    setPriority("medium"); setCategory("General"); setRecurrence("none");
  };

  const startEditing = (t) => {
    setEditId(t.id);
    setEditText(t.text);
    setEditDate(t.deadline);
    setEditStartTime(t.startTime || "");
    setEditEndTime(t.endTime || "");
    setEditPriority(normalizePriority(t.priority));
    setEditCategory(t.category || "General");
    setEditRecurrence(t.recurrence || "none");
  };

  const saveEdit = async (id) => {
    if (editDate < TODAY) { Alert.alert("Eroare", "Nu poți seta o dată din trecut!"); return; }
    await updateTodo(id, {
      text: editText, deadline: editDate, startTime: editStartTime, endTime: editEndTime,
      priority: editPriority, category: editCategory, recurrence: editRecurrence,
    });
    setEditId(null);
  };

  const changeStatus = async (id, newStatus) => {
    await updateTodo(id, { status: newStatus === "Restant" ? "Urmează" : newStatus });
  };

  // ─── Trimitere task ───────────────────────────────────────────────
  const openSendModal = async (task) => {
    setSendTaskData(task);
    setSelectedUser(null);
    setShowSendModal(true);
    setUsersLoading(true);
    const users = await getAllUsers(user.uid, userRole);
    setAllUsers(users);
    setUsersLoading(false);
  };

  const handleSendTask = async () => {
    if (!selectedUser || !sendTaskData) return;
    setSending(true);
    const result = await sendTask(
      { uid: user.uid, displayName: user.displayName, email: user.email },
      userRole,
      selectedUser,
      {
        text: sendTaskData.text,
        priority: sendTaskData.priority,
        deadline: sendTaskData.deadline,
        startTime: sendTaskData.startTime,
        endTime: sendTaskData.endTime,
        category: sendTaskData.category,
      }
    );
    setSending(false);
    setShowSendModal(false);
    setSendTaskData(null);

    if (result.success) {
      const sameRank = userRole === selectedUser.role;
      Alert.alert(
        "✅ Task trimis!",
        sameRank
          ? `${selectedUser.name} trebuie să accepte taskul.`
          : `Task adăugat direct în lista lui ${selectedUser.name}.`
      );
    } else {
      Alert.alert("Eroare", result.error);
    }
  };

  // ─── Filtrare ─────────────────────────────────────────────────────
  const filtered = todos
    .map((t) => ({ ...t, calculatedStatus: calculateStatus(t) }))
    .filter((t) => t.text.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => filterStatus === "Toate" || t.calculatedStatus === filterStatus);

  const completed  = todos.filter((t) => t.status === "Finalizat").length;
  const percent    = todos.length ? Math.round((completed / todos.length) * 100) : 0;
  const canSend    = userRole === "admin" || userRole === "manager";

  // ─── RENDER ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bgColor }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={darkMode ? "light-content" : "dark-content"} />
      <View style={[styles.container, { backgroundColor: theme.bgColor }]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.btnHeader, { backgroundColor: theme.inputBg }]}
              onPress={toggleDarkMode}
            >
              <Text style={{ color: theme.textColor }}>{darkMode ? "☀️" : "🌙"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnHeader, { backgroundColor: theme.inputBg, position: "relative" }]}
              onPress={() => navigation.navigate("SentTasks")}
            >
              <Text style={{ color: theme.textColor }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnHeader, { backgroundColor: theme.inputBg }]}
              onPress={() => auth.signOut()}
            >
              <Text style={{ color: theme.textColor }}>🔓</Text>
            </TouchableOpacity>
          </View>

          {/* Titlu + info user */}
          <View style={styles.leftPanel}>
            <Text style={[styles.mainTitle, { color: theme.textColor }]}>SendTask</Text>

            <View style={[styles.userDisplay, { backgroundColor: theme.highlightBg }]}>
              <Text style={[styles.userText, { color: theme.textColor }]}>
                {user?.displayName}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[userRole] }]}>
                <Text style={styles.roleBadgeText}>{ROLE_LABELS[userRole]}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={[styles.statsContainer, { backgroundColor: theme.inputBg }]}>
              <View style={[styles.progressBarBg, { backgroundColor: theme.progressBg }]}>
                <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.subTextColor }]}>
                {completed} din {todos.length} activități ({percent}%)
              </Text>
            </View>

            {/* Form adaugă */}
            <View style={[styles.formContainer, { backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder }]}
                placeholder="Adaugă activitate..."
                placeholderTextColor={theme.subTextColor}
                value={text}
                onChangeText={setText}
              />

              <TextInput
                style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder }]}
                placeholder="Data (YYYY-MM-DD)"
                placeholderTextColor={theme.subTextColor}
                value={deadline}
                onChangeText={setDeadline}
              />

              <View style={styles.timeRow}>
                <View style={styles.timeInputGroup}>
                  <Text style={[styles.timeLabel, { color: theme.subTextColor }]}>De la:</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder }]}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.subTextColor}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                <View style={styles.timeInputGroup}>
                  <Text style={[styles.timeLabel, { color: theme.subTextColor }]}>Până la:</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder }]}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.subTextColor}
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>

              {/* Prioritate + Categorie */}
              <View style={styles.twoCol}>
                <CustomPicker
                  selectedValue={priority}
                  onValueChange={setPriority}
                  items={[
                    { label: "★ Scăzută", value: "low" },
                    { label: "★★ Medie",  value: "medium" },
                    { label: "★★★ Ridicată", value: "high" },
                  ]}
                  textColor={theme.textColor}
                  backgroundColor={theme.cardBg}
                  borderColor={theme.inputBorder}
                  style={[styles.pickerContainer, { flex: 1 }]}
                />
                <CustomPicker
                  selectedValue={category}
                  onValueChange={setCategory}
                  items={CATEGORIES.map((c) => ({ label: c, value: c }))}
                  textColor={theme.textColor}
                  backgroundColor={theme.cardBg}
                  borderColor={theme.inputBorder}
                  style={[styles.pickerContainer, { flex: 1 }]}
                />
              </View>

              {/* Recurență */}
              <CustomPicker
                selectedValue={recurrence}
                onValueChange={setRecurrence}
                items={RECURRENCES}
                textColor={theme.textColor}
                backgroundColor={theme.cardBg}
                borderColor={theme.inputBorder}
                style={styles.pickerContainer}
              />

              <TouchableOpacity
                style={[styles.btnAdd, { backgroundColor: theme.successColor }]}
                onPress={handleAdd}
              >
                <Text style={styles.btnAddText}>+ Adaugă activitate</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Controale filtrare */}
          <View style={[styles.controlsContainer, { backgroundColor: theme.inputBg }]}>
            <TextInput
              style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder, flex: 1 }]}
              placeholder="Caută..."
              placeholderTextColor={theme.subTextColor}
              value={search}
              onChangeText={setSearch}
            />
            <CustomPicker
              selectedValue={filterStatus}
              onValueChange={setFilterStatus}
              items={[
                { label: "Toate",    value: "Toate" },
                { label: "Urmează",  value: "Urmează" },
                { label: "Restant",  value: "Restant" },
                { label: "Finalizat",value: "Finalizat" },
                { label: "Anulat",   value: "Anulat" },
              ]}
              textColor={theme.textColor}
              backgroundColor={theme.cardBg}
              borderColor={theme.inputBorder}
              style={[styles.pickerContainer, { width: 150 }]}
            />
          </View>

          {/* Lista taskuri */}
          <View style={styles.rightPanel}>
            {filtered.length === 0 ? (
              <View style={styles.emptyList}>
                <Text style={[styles.emptyText, { color: theme.subTextColor }]}>Nu s-au găsit activități.</Text>
              </View>
            ) : (
              filtered.map((t) => {
                const p             = normalizePriority(t.priority);
                const currentStatus = t.calculatedStatus;
                const cardBg        = statusBackgrounds[currentStatus] || theme.inputBg;
                const isOverdue     = currentStatus === "Restant";

                return (
                  <View
                    key={t.id}
                    style={[styles.task, { backgroundColor: cardBg, borderLeftColor: starColors[p] }]}
                  >
                    {editId === t.id ? (
                      /* ─ Modul editare ─ */
                      <View style={styles.editContainer}>
                        <TextInput
                          style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder }]}
                          value={editText}
                          onChangeText={setEditText}
                        />
                        <View style={styles.editRow}>
                          <TextInput
                            style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder, flex: 1 }]}
                            placeholder="Data"
                            placeholderTextColor={theme.subTextColor}
                            value={editDate}
                            onChangeText={setEditDate}
                          />
                          <CustomPicker
                            selectedValue={editPriority}
                            onValueChange={setEditPriority}
                            items={[
                              { label: "★ Scăzută",    value: "low" },
                              { label: "★★ Medie",     value: "medium" },
                              { label: "★★★ Ridicată", value: "high" },
                            ]}
                            textColor={theme.textColor}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.inputBorder}
                            style={[styles.pickerContainer, { flex: 1 }]}
                          />
                        </View>
                        <View style={styles.editRow}>
                          <TextInput
                            style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder, flex: 1 }]}
                            placeholder="De la" placeholderTextColor={theme.subTextColor}
                            value={editStartTime} onChangeText={setEditStartTime}
                          />
                          <TextInput
                            style={[styles.formInput, { backgroundColor: theme.cardBg, color: theme.textColor, borderColor: theme.inputBorder, flex: 1 }]}
                            placeholder="Până la" placeholderTextColor={theme.subTextColor}
                            value={editEndTime} onChangeText={setEditEndTime}
                          />
                        </View>
                        <View style={styles.editRow}>
                          <CustomPicker
                            selectedValue={editCategory}
                            onValueChange={setEditCategory}
                            items={CATEGORIES.map((c) => ({ label: c, value: c }))}
                            textColor={theme.textColor}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.inputBorder}
                            style={[styles.pickerContainer, { flex: 1 }]}
                          />
                          <CustomPicker
                            selectedValue={editRecurrence}
                            onValueChange={setEditRecurrence}
                            items={RECURRENCES}
                            textColor={theme.textColor}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.inputBorder}
                            style={[styles.pickerContainer, { flex: 1 }]}
                          />
                        </View>
                        <View style={styles.editActions}>
                          <TouchableOpacity style={[styles.btnSave, { backgroundColor: theme.successColor }]} onPress={() => saveEdit(t.id)}>
                            <Text style={styles.btnSaveText}>💾 Salvează</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.btnCancel, { backgroundColor: theme.dangerColor }]} onPress={() => setEditId(null)}>
                            <Text style={styles.btnCancelText}>🚫 Anulează</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* ─ Vizualizare normală ─ */
                      <>
                        <View style={styles.taskInfo}>
                          <Text style={styles.taskText}>{t.text}</Text>
                          <View style={styles.badgesContainer}>
                            <View style={styles.badge}>
                              <Text style={[styles.badgeStar, { color: starColors[p] }]}>{starIcons[p]}</Text>
                            </View>
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>📅 {t.deadline}</Text>
                            </View>
                            {t.startTime && t.endTime && (
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>⏰ {t.startTime} - {t.endTime}</Text>
                              </View>
                            )}
                            {t.category && t.category !== "General" && (
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>🏷️ {t.category}</Text>
                              </View>
                            )}
                            {t.recurrence && t.recurrence !== "none" && (
                              <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                  {t.recurrence === "daily" ? "🔄 Zilnic" : "📅 Săptămânal"}
                                </Text>
                              </View>
                            )}
                            {t.sentBy && (
                              <View style={[styles.badge, { backgroundColor: "rgba(59,130,246,0.9)" }]}>
                                <Text style={styles.badgeText}>📨 {t.sentBy}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.actions}>
                          <CustomPicker
                            selectedValue={currentStatus}
                            onValueChange={(value) => changeStatus(t.id, value)}
                            enabled={!isOverdue}
                            items={[
                              { label: "Urmează",   value: "Urmează" },
                              ...(isOverdue ? [{ label: "Restant", value: "Restant" }] : []),
                              { label: "Finalizat", value: "Finalizat" },
                              { label: "Anulat",    value: "Anulat" },
                            ]}
                            textColor={theme.textColor}
                            backgroundColor={theme.cardBg}
                            borderColor={theme.inputBorder}
                            style={[styles.pickerContainer, { minWidth: 120, opacity: isOverdue ? 0.8 : 1 }]}
                          />
                          {canSend && (
                            <TouchableOpacity style={styles.btnAction} onPress={() => openSendModal(t)}>
                              <Text style={styles.btnActionText}>📤</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={styles.btnAction} onPress={() => startEditing(t)}>
                            <Text style={styles.btnActionText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnAction} onPress={() => deleteTodo(t.id)}>
                            <Text style={styles.btnActionText}>❌</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      {/* ─── Modal: Trimite task ─────────────────────────────────── */}
      <Modal visible={showSendModal} transparent animationType="slide" onRequestClose={() => setShowSendModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>📤 Trimite task</Text>
            {sendTaskData && (
              <View style={[styles.modalTaskPreview, { backgroundColor: theme.inputBg }]}>
                <Text style={[styles.modalTaskText, { color: theme.textColor }]} numberOfLines={2}>
                  {sendTaskData.text}
                </Text>
                <Text style={[styles.modalTaskMeta, { color: theme.subTextColor }]}>
                  📅 {sendTaskData.deadline || "—"}
                </Text>
              </View>
            )}

            <Text style={[styles.modalSubtitle, { color: theme.subTextColor }]}>
              Selectează destinatarul:
            </Text>

            {usersLoading ? (
              <Text style={[styles.modalSubtitle, { color: theme.subTextColor }]}>Se încarcă utilizatorii...</Text>
            ) : allUsers.length === 0 ? (
              <Text style={[styles.modalSubtitle, { color: theme.subTextColor }]}>
                Nu există alți utilizatori disponibili.
              </Text>
            ) : (
              <ScrollView style={styles.userList} keyboardShouldPersistTaps="handled">
                {allUsers.map((u) => {
                  const isSelected = selectedUser?.uid === u.uid;
                  const sameRank   = userRole === u.role;
                  return (
                    <TouchableOpacity
                      key={u.uid}
                      style={[
                        styles.userItem,
                        { backgroundColor: theme.inputBg },
                        isSelected && styles.userItemSelected,
                      ]}
                      onPress={() => setSelectedUser(u)}
                    >
                      <View style={styles.userItemLeft}>
                        <View style={[styles.roleChip, { backgroundColor: ROLE_COLORS[u.role] }]}>
                          <Text style={styles.roleChipText}>{ROLE_LABELS[u.role]}</Text>
                        </View>
                        <Text style={[styles.userName, { color: theme.textColor }]}>{u.name}</Text>
                      </View>
                      {sameRank && (
                        <View style={[styles.approvalChip, { backgroundColor: "#92400e" }]}>
                          <Text style={styles.approvalChipText}>Necesită aprobare</Text>
                        </View>
                      )}
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btnModalSend, { backgroundColor: selectedUser ? theme.successColor : "#a0aec0" }]}
                onPress={handleSendTask}
                disabled={!selectedUser || sending}
              >
                <Text style={styles.btnModalSendText}>
                  {sending ? "Se trimite..." : "✅ Trimite"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnModalCancel, { backgroundColor: theme.dangerColor }]}
                onPress={() => { setShowSendModal(false); setSendTaskData(null); }}
              >
                <Text style={styles.btnModalCancelText}>Anulează</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Teme ──────────────────────────────────────────────────────────────────
const lightTheme = {
  bgColor: "#dbe2ea", cardBg: "#f8faff", textColor: "#1a202c",
  subTextColor: "#4a5568", inputBg: "#edf2f7", inputBorder: "#cbd5e0",
  highlightBg: "#e2e8f0", highlightColor: "#2b6cb0",
  progressBg: "#cbd5e0", successColor: "#38a169", dangerColor: "#e53e3e",
};
const darkTheme = {
  bgColor: "#1a202c", cardBg: "#2d3748", textColor: "#f7fafc",
  subTextColor: "#a0aec0", inputBg: "#4a5568", inputBorder: "#4a5568",
  highlightBg: "#2c5282", highlightColor: "#90cdf4",
  progressBg: "rgba(0,0,0,0.4)", successColor: "#68d391", dangerColor: "#fc8181",
};

// ─── Stiluri ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  headerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginBottom: 20,
    marginTop: Platform.OS === "android" ? 120 : 60,
  },
  btnHeader: {
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e0",
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e53e3e",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notifBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  leftPanel: { gap: 20, marginBottom: 24 },
  rightPanel: { gap: 16 },

  mainTitle: { fontSize: 42, fontWeight: "800", textAlign: "center" },

  userDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: "center",
  },
  userText: { fontSize: 16, fontWeight: "600" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  statsContainer: { padding: 20, borderRadius: 16, alignItems: "center" },
  progressBarBg: { height: 12, width: "100%", borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  progressBarFill: { height: "100%", backgroundColor: "#48bb78" },
  progressText: { fontWeight: "600", fontSize: 16 },

  formContainer: { padding: 24, borderRadius: 20, gap: 16 },
  formInput: { padding: 14, borderWidth: 1, borderRadius: 12, fontSize: 16 },

  timeRow: { flexDirection: "row", gap: 16 },
  timeInputGroup: { flex: 1, gap: 6 },
  timeLabel: { fontSize: 14, fontWeight: "700" },

  twoCol: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  pickerContainer: {},

  btnAdd: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnAddText: { color: "white", fontWeight: "700", fontSize: 16 },

  controlsContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },

  task: {
    padding: 18,
    borderRadius: 16,
    borderLeftWidth: 10,
    marginBottom: 16,
    flexDirection: "column",
    alignItems: "stretch",
  },
  taskInfo: { marginBottom: 12 },
  taskText: { fontWeight: "800", fontSize: 18, marginBottom: 8, color: "#fff" },
  badgesContainer: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  badge: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: { color: "#1a202c", fontSize: 13, fontWeight: "700" },
  badgeStar: { fontSize: 17, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "flex-end" },
  btnAction: { padding: 6 },
  btnActionText: { fontSize: 22 },

  editContainer: { width: "100%", gap: 10 },
  editRow: { flexDirection: "row", gap: 10 },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  btnSave: { padding: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnSaveText: { color: "white", fontSize: 15, fontWeight: "700" },
  btnCancel: { padding: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnCancelText: { color: "white", fontSize: 15, fontWeight: "700" },

  emptyList: { padding: 50, alignItems: "center" },
  emptyText: { fontSize: 17, fontStyle: "italic" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
    gap: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  modalTaskPreview: { padding: 14, borderRadius: 12, gap: 4 },
  modalTaskText: { fontSize: 16, fontWeight: "700" },
  modalTaskMeta: { fontSize: 13 },
  modalSubtitle: { fontSize: 14, fontWeight: "600" },
  userList: { maxHeight: 250 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  userItemSelected: { borderColor: "#2b6cb0" },
  userItemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleChipText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  userName: { fontSize: 15, fontWeight: "600" },
  approvalChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  approvalChipText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  checkMark: { fontSize: 20, color: "#2b6cb0", fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: 12 },
  btnModalSend: { flex: 2, padding: 16, borderRadius: 12, alignItems: "center" },
  btnModalSendText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnModalCancel: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
  btnModalCancelText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

export default TodoPage;
