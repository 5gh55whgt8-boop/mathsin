import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, api, describeApiFailure, syncLocalScan } from '../api/client';
import {
  AppText,
  Badge,
  Button,
  Card,
  FeatureIcon,
  Input,
  Muted,
  PressableScale,
  Screen,
  ScrollScreen,
  SectionHeader,
} from '../components/UI';
import RichText from '../components/RichText';
import { C, motion, radius, shadows, spacing, type } from '../theme';

const contentTabs = [
  ['plainText', 'Text'],
  ['markdown', 'Markdown'],
  ['latex', 'LaTeX'],
];

const aiTools = [
  ['solve', 'Solve step-by-step', 'calculator-outline', 'Work through the full problem carefully.'],
  ['explain', 'Explain clearly', 'school-outline', 'Turn the content into student-friendly reasoning.'],
  ['simplify', 'Simplify', 'git-compare-outline', 'Reduce the expression and show the key move.'],
  ['check', 'Check my answer', 'checkmark-done-outline', 'Verify your answer and explain any correction.'],
  ['similar', 'Practice more', 'layers-outline', 'Generate three similar questions with answers.'],
];

function cleanName(value = 'scan') {
  return String(value).replace(/[^a-z0-9._-]+/gi, '_').slice(0, 80) || 'scan';
}

function bytesToBase64(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const data = new Uint8Array(bytes);
  let output = '';
  for (let i = 0; i < data.length; i += 3) {
    const a = data[i];
    const b = i + 1 < data.length ? data[i + 1] : 0;
    const c = i + 2 < data.length ? data[i + 2] : 0;
    output += alphabet[a >> 2];
    output += alphabet[((a & 3) << 4) | (b >> 4)];
    output += i + 1 < data.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=';
    output += i + 2 < data.length ? alphabet[c & 63] : '=';
  }
  return output;
}

export default function ResultScreen({ route }) {
  const [scan, setScan] = useState(route.params.scan || {});
  const [tab, setTab] = useState('plainText');
  const [ai, setAi] = useState('');
  const [answer, setAnswer] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [exporting, setExporting] = useState('');
  const [saveState, setSaveState] = useState(scan._id ? 'saved' : 'local');
  const [syncing, setSyncing] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  async function runAiAction(action) {
    try {
      setBusyAction(action);
      setAi('');
      const { data } = await api.post('/ai/action', {
        action,
        content: scan[tab] || scan.plainText || scan.markdown || scan.latex,
        answer: action === 'check' ? answer : undefined,
      });
      setAi(data.text || 'No answer returned.');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      Alert.alert('AI action failed', error.response?.data?.error || error.message);
    } finally {
      setBusyAction('');
    }
  }

  function updateContent(value) {
    const field = tab;
    setScan(current => ({ ...current, [field]: value }));
    if (!scan._id) return;
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/scans/${scan._id}`, { [field]: value });
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 650);
  }

  async function copyText(value, label = 'Content') {
    await Clipboard.setStringAsync(value || '');
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    Alert.alert(`${label} copied`, 'Ready to paste anywhere.');
  }

  async function retrySync() {
    try {
      setSyncing(true);
      const savedScan = await syncLocalScan(scan);
      if (!savedScan?._id) {
        throw new Error('The server did not return a scan ID.');
      }
      setScan(current => ({ ...current, ...savedScan, imageUri: current.imageUri }));
      setSaveState('saved');
    } catch (error) {
      setSaveState('local');
      Alert.alert(
        'Scan synchronization failed',
        describeApiFailure(error, 'Scan synchronization'),
      );
    } finally {
      setSyncing(false);
    }
  }

  async function exportFile(format, solution = '') {
    if (!scan._id) {
      Alert.alert(
        'Scan not synchronized',
        'This scan is currently stored on the device and has not been synchronized with the server yet. Please sync the scan before exporting PDF or Word.',
      );
      return;
    }
    try {
      setExporting(solution ? `solution-${format}` : format);
      const ext = format === 'docx' ? 'docx' : 'pdf';
      const name = `${cleanName(scan.title)}${solution ? '-solution' : ''}.${ext}`;
      const endpoint = `/exports/${scan._id}/${format}`;
      if (Platform.OS === 'web') {
        const { data } = solution
          ? await api.post(endpoint, { solution }, { responseType: 'blob' })
          : await api.get(endpoint, { responseType: 'blob' });
        const url = URL.createObjectURL(data);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const token = await AsyncStorage.getItem('token');
        const destination = FileSystem.cacheDirectory + name;
        let output;
        if (solution) {
          const response = await api.post(endpoint, { solution }, { responseType: 'arraybuffer' });
          await FileSystem.writeAsStringAsync(
            destination,
            bytesToBase64(response.data),
            { encoding: 'base64' },
          );
          output = { status: response.status, uri: destination };
        } else {
          output = await FileSystem.downloadAsync(
          `${API_BASE_URL}${endpoint}`,
          destination,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
          );
        }
        if (output.status < 200 || output.status >= 300) throw new Error(`Download failed (${output.status})`);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(output.uri, {
            mimeType: format === 'docx'
              ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              : 'application/pdf',
            dialogTitle: `Export ${name}`,
          });
        } else {
          Alert.alert('Export ready', output.uri);
        }
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      Alert.alert('Export failed', error.response?.data?.error || describeApiFailure(error, 'Export'));
    } finally {
      setExporting('');
    }
  }

  const saveBadge = !scan._id
    ? { label: 'Local only', tone: 'neutral', icon: 'phone-portrait-outline' }
    : saveState === 'saving'
      ? { label: 'Saving…', tone: 'neutral', icon: 'sync-outline' }
      : saveState === 'error'
        ? { label: 'Save failed', tone: 'warning', icon: 'alert-circle-outline' }
        : { label: 'Saved', tone: 'good', icon: 'cloud-done-outline' };

  return (
    <Screen>
      <ScrollScreen contentContainerStyle={styles.scrollContent}>
        {/* Result Header */}
        <View style={styles.resultHeading}>
          <View style={styles.headingBadges}>
            <Badge
              label={(scan.sourceType || 'scan').toUpperCase()}
              tone={scan.local ? 'neutral' : 'primary'}
              icon={scan.local ? 'phone-portrait-outline' : 'scan-outline'}
            />
            <Badge {...saveBadge} />
          </View>
          <AppText variant="title" selectable>{scan.title || 'Scan result'}</AppText>
          <Muted selectable>Recognized mathematical expression and document content.</Muted>

          {!scan._id ? (
            <Card tone="warning" style={styles.syncCard}>
              <View style={styles.flexCopy}>
                <AppText variant="bodyStrong" color="warning">Local Scan (Unsynced)</AppText>
                <Muted>This scan is stored locally. Synchronize it to enable cloud exports and cross-device access.</Muted>
              </View>
              <Button
                title={syncing ? 'Syncing…' : 'Sync now'}
                variant="primary"
                size="sm"
                onPress={retrySync}
                disabled={syncing}
              />
            </Card>
          ) : null}
        </View>

        {scan.warnings?.length > 0 ? (
          <Card tone="warning" style={styles.warningCard}>
            <FeatureIcon name="alert-circle-outline" tone="warning" size={38} />
            <View style={styles.flexCopy}>
              <AppText variant="bodyStrong" color="warning">Notation Notice</AppText>
              <Muted selectable>{scan.warnings.join(' • ')}</Muted>
            </View>
          </Card>
        ) : null}

        {/* Content Viewer / Editor */}
        <SectionHeader
          title="Recognized expression & content"
          subtitle="Switch format or tap into text to edit. Changes save automatically."
          action={
            <View style={styles.contentActions}>
              <Button
                title="Copy"
                icon="copy-outline"
                variant="ghost"
                size="sm"
                onPress={() => copyText(scan[tab], contentTabs.find(([key]) => key === tab)?.[1])}
              />
              <Button
                title="Share"
                icon="share-outline"
                variant="ghost"
                size="sm"
                onPress={() => Share.share({ message: scan[tab] || '' })}
              />
            </View>
          }
        />

        <View style={styles.segmentedControl}>
          {contentTabs.map(([key, label]) => {
            const active = tab === key;
            return (
              <PressableScale
                key={key}
                accessibilityLabel={`Show ${label}`}
                onPress={() => setTab(key)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <AppText
                  variant="subhead"
                  style={{ color: active ? C.primary : C.muted, fontWeight: active ? '700' : '500' }}
                >
                  {label}
                </AppText>
              </PressableScale>
            );
          })}
        </View>

        <Card style={styles.editorCard}>
          <TextInput
            accessibilityLabel={`Edit recognized ${contentTabs.find(([key]) => key === tab)?.[1]}`}
            multiline
            value={scan[tab] || ''}
            onChangeText={updateContent}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={
              tab === 'latex' && scan.local && !scan.latex
                ? 'LaTeX notation is not generated by on-device general OCR. Use AI study tools below to solve and transcribe mathematical expressions.'
                : 'Recognized content will appear here.'
            }
            placeholderTextColor={C.subtle}
            selectionColor={C.primary}
            textAlignVertical="top"
            scrollEnabled={false}
            style={[styles.editor, tab !== 'plainText' && styles.monospace]}
          />
        </Card>

        {/* Detected Questions */}
        {scan.questions?.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Detected questions"
              subtitle={`${scan.questions.length} ${scan.questions.length === 1 ? 'question' : 'questions'} identified.`}
            />
            <Card style={styles.questionList}>
              {scan.questions.map((question, index) => (
                <View key={`${question.number || index}-${index}`}>
                  <View style={styles.questionRow}>
                    <Badge label={`#${question.number || index + 1}`} tone="primary" />
                    <View style={[styles.flexCopy, styles.questionContent]}>
                      <AppText selectable style={styles.questionText}>
                        {question.question || question.latex || 'Question statement'}
                      </AppText>
                      {Array.isArray(question.options) && question.options.map((option, optionIndex) => (
                        <View key={optionIndex} style={styles.optionRow}>
                          <AppText variant="caption" color="muted">{String.fromCharCode(65 + optionIndex)}.</AppText>
                          <AppText selectable style={styles.optionText}>{String(option)}</AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                  {index < scan.questions.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Professional Export */}
        <View style={styles.section}>
          <SectionHeader
            title="Export files"
            subtitle="Download shareable documents with readable plain text."
          />
          <View style={styles.exportGrid}>
            <PressableScale
              accessibilityLabel="Export PDF"
              disabled={Boolean(exporting)}
              onPress={() => exportFile('pdf')}
              style={styles.exportItem}
            >
              <Card style={styles.exportCard}>
                {exporting === 'pdf' ? (
                  <ActivityIndicator color={C.primary} />
                ) : (
                  <FeatureIcon name="document-text-outline" tone="primary" size={44} />
                )}
                <View style={styles.flexCopy}>
                  <AppText variant="headline">PDF Document</AppText>
                  <Muted style={styles.exportDesc}>Print-ready plain-text PDF</Muted>
                </View>
                <Ionicons name="download-outline" size={20} color={C.primary} />
              </Card>
            </PressableScale>

            <PressableScale
              accessibilityLabel="Export Word"
              disabled={Boolean(exporting)}
              onPress={() => exportFile('docx')}
              style={styles.exportItem}
            >
              <Card style={styles.exportCard}>
                {exporting === 'docx' ? (
                  <ActivityIndicator color={C.primary} />
                ) : (
                  <FeatureIcon name="document-outline" tone="navy" size={44} />
                )}
                <View style={styles.flexCopy}>
                  <AppText variant="headline">Word Document</AppText>
                  <Muted style={styles.exportDesc}>Editable DOCX with plain text</Muted>
                </View>
                <Ionicons name="download-outline" size={20} color={C.primary} />
              </Card>
            </PressableScale>
          </View>
        </View>

        {/* AI Mathematical Analysis & Solving */}
        <View style={styles.section}>
          <SectionHeader
            title="AI mathematical analysis"
            subtitle="Solve, explain, simplify or practice the recognized math."
          />
          <Input
            label="Your student answer (optional — for Answer Verification)"
            icon="create-outline"
            placeholder="e.g. x = 4 or y = 3x + 2"
            value={answer}
            onChangeText={setAnswer}
          />
          <View style={styles.aiGrid}>
            {aiTools.map(([action, title, icon, description]) => (
              <PressableScale
                key={action}
                accessibilityLabel={title}
                disabled={Boolean(busyAction) || (action === 'check' && !answer.trim())}
                onPress={() => runAiAction(action)}
                style={styles.aiItem}
              >
                <Card style={styles.aiCard}>
                  <View style={styles.aiCardTop}>
                    {busyAction === action ? (
                      <View style={styles.aiLoader}>
                        <ActivityIndicator color={C.primary} size="small" />
                      </View>
                    ) : (
                      <FeatureIcon name={icon} tone="primary" size={40} />
                    )}
                    <Ionicons name="chevron-forward" size={16} color={C.subtle} />
                  </View>
                  <AppText variant="headline">{title}</AppText>
                  <Muted style={styles.aiCardDesc}>{description}</Muted>
                </Card>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* AI Solution / Answer Result */}
        {ai ? (
          <Animated.View entering={FadeInDown.duration(motion.base).reduceMotion(ReduceMotion.System)}>
            <Card style={styles.aiResultCard}>
              <View style={styles.aiResultTop}>
                <View style={styles.aiResultTitle}>
                  <FeatureIcon name="sparkles" tone="primary" size={38} />
                  <View>
                    <AppText variant="section">MathLens Solution</AppText>
                    <AppText variant="caption" color="primary">STEP-BY-STEP MATHEMATICAL PROOF</AppText>
                  </View>
                </View>
                <Button
                  title="Copy solution"
                  icon="copy-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() => copyText(ai, 'Solution')}
                />
              </View>
              <View style={styles.aiResultBody}>
                <RichText color={C.ink} style={styles.aiText}>{ai}</RichText>
              </View>
              <View style={styles.solutionExports}>
                <Button
                  title="PDF solution"
                  icon="document-text-outline"
                  variant="ghost"
                  size="sm"
                  loading={exporting === 'solution-pdf'}
                  disabled={Boolean(exporting)}
                  onPress={() => exportFile('pdf', ai)}
                />
                <Button
                  title="Word solution"
                  icon="document-outline"
                  variant="ghost"
                  size="sm"
                  loading={exporting === 'solution-docx'}
                  disabled={Boolean(exporting)}
                  onPress={() => exportFile('docx', ai)}
                />
              </View>
            </Card>
          </Animated.View>
        ) : null}
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  resultHeading: {
    gap: spacing.xs,
  },
  headingBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  flexCopy: {
    flex: 1,
    gap: 2,
  },
  contentActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    ...shadows.card,
  },
  editorCard: {
    padding: spacing.md,
  },
  editor: {
    minHeight: 180,
    color: C.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  monospace: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 20,
  },
  section: {
    gap: spacing.sm,
  },
  questionList: {
    gap: spacing.md,
    padding: spacing.md,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  questionContent: {
    gap: spacing.xs,
  },
  questionText: {
    fontSize: 14,
    lineHeight: 20,
    color: C.ink,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    color: C.inkSecondary,
  },
  divider: {
    height: 1,
    marginTop: spacing.md,
    backgroundColor: C.border,
  },
  exportGrid: {
    gap: spacing.sm,
  },
  exportItem: {
    width: '100%',
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 72,
  },
  exportDesc: {
    fontSize: 12,
  },
  aiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aiItem: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
  },
  aiCard: {
    minHeight: 144,
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.xs,
  },
  aiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiLoader: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  aiResultCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: C.primaryLight,
    backgroundColor: C.surface,
  },
  aiResultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  aiResultTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiResultBody: {
    paddingVertical: spacing.xs,
  },
  solutionExports: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aiText: {
    lineHeight: 24,
  },
});
