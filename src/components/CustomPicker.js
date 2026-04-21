import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from "react-native";

const CustomPicker = ({ selectedValue, onValueChange, items, style, enabled = true, textColor = "#1a202c", backgroundColor = "#f8faff", borderColor = "#cbd5e0" }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find((item) => item.value === selectedValue);

  return (
    <View style={style}>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          { backgroundColor, borderColor },
          !enabled && styles.disabled,
        ]}
        onPress={() => enabled && setModalVisible(true)}
        disabled={!enabled}
      >
        <Text style={[styles.pickerText, { color: textColor }]}>
          {selectedItem ? selectedItem.label : "Selectează..."}
        </Text>
        <Text style={[styles.arrow, { color: textColor }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selectează</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    selectedValue === item.value && styles.selectedOption,
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedValue === item.value && styles.selectedOptionText,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedValue === item.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#f8faff",
    borderColor: "#cbd5e0",
  },
  pickerText: {
    fontSize: 16,
    color: "#1a202c",
    flex: 1,
  },
  arrow: {
    fontSize: 12,
    color: "#4a5568",
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#f8faff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a202c",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#4a5568",
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  selectedOption: {
    backgroundColor: "#e2e8f0",
  },
  optionText: {
    fontSize: 16,
    color: "#1a202c",
  },
  selectedOptionText: {
    fontWeight: "600",
    color: "#2b6cb0",
  },
  checkmark: {
    fontSize: 18,
    color: "#2b6cb0",
    fontWeight: "bold",
  },
});

export default CustomPicker;

