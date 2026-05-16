import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {!!message && (
              <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.buttons}>
            {!!onCancel && (
              <TouchableOpacity
                style={[styles.btn, styles.btnLeft, { borderRightWidth: 1, borderRightColor: colors.border }]}
                onPress={onCancel}
                activeOpacity={0.6}
              >
                <Text style={[styles.btnText, { color: colors.muted }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.btn}
              onPress={onConfirm}
              activeOpacity={0.6}
            >
              <Text style={[
                styles.btnText,
                styles.btnConfirm,
                { color: destructive ? colors.danger : colors.primary },
              ]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 44,
  },
  box: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
  },
  content: {
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: { height: 1 },
  buttons: { flexDirection: 'row' },
  btn: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  btnLeft: {},
  btnText: { fontSize: 16, fontWeight: '700' },
  btnConfirm: { fontWeight: '900' },
});
