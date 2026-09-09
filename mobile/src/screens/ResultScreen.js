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
import { api } from '../api/client';
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

export default function ResultScreen({ route }) {
  const [scan, setScan] = useState(route.params.scan);
  const [tab, setTab] = useState('plainText');
  const [ai, setAi] = useState('');
  const [answer, setAnswer] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [exporting, setExporting] = useState('');
  const [saveState, setSaveState] = useState('saved');
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

  async function exportFile(format) {
    try {
      setExporting(format);
      const ext = format === 'docx' ? 'docx' : 'pdf';
      const name = `${cleanName(scan.title)}.${ext}`;
      if (Platform.OS === 'web') {
        const { data } = await api.get(`/exports/${scan._id}/${format}`, { responseType: 'blob' });
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
        const base = (process.env.EXPO_PUBLIC_API_URL || 'https://mathlens-ai-api.onrender.com/api').replace(/\/$/, '');
        const destination = FileSystem.cacheDirectory + name;
        const output = await FileSystem.downloadAsync(
          `${base}/exports/${scan._id}/${format}`,
          destination,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
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
      Alert.alert('Export failed', error.response?.data?.error || error.message);
    } finally {
      setExporting('');
    }
  }

  const saveBadge = saveState === 'saving'
    ? { label: 'Saving…', tone: 'neutral', icon: 'sync-outline' }
    : saveState === 'error'
      ? { label: 'Save failed', tone: 'warning', icon: 'alert-circle-outline' }
      : { label: 'Saved', tone: 'good', icon: 'cloud-done-outline' };

  return (
    <Screen>
      <ScrollScreen>
        <View style={styles.resultHeading}>
          <View style={styles.headingBadges}>
            <Badge label={(scan.sourceType || 'scan').toUpperCase()} tone="primary" icon="scan-outline" />
            <Badge label={scan.provider || 'AI'} tone="neutral" icon="sparkles-outline" />
          </View>
          <AppText variant="title" selectable>{scan.title || 'Scan result'}</AppText>
          <Muted selectable>
            {scan.model ? `Recognized with ${scan.model}` : 'Recognized and ready to edit.'}
          </Muted>
        </View>

        {scan.warnings?.length > 0 ? (
          <Card tone="warning" style={styles.warningCard}>
            <FeatureIcon name="warning-outline" tone="warning" size={42} />
            <View style={styles.flexCopy}>
              <AppText variant="bodyStrong" color="warning">Review suggested</AppText>
              <Muted selectable>{scan.warnings.join(' • ')}</Muted>
            </View>
          </Card>
        ) : null}

        <SectionHeader
          title="Recognized content"
          subtitle="Edit any OCR detail—changes save automatically."
          action={<Badge {...saveBadge} />}
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

        <View style={styles.contentToolbar}>
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

        <Card style={styles.editorCard}>
          <TextInput
            accessibilityLabel={`Edit recognized ${contentTabs.find(([key]) => key === tab)?.[1]}`}
            multiline
            value={scan[tab] || ''}
            onChangeText={updateContent}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Recognized content will appear here."
            placeholderTextColor={C.subtle}
            selectionColor={C.primary}
            textAlignVertical="top"
            style={[styles.editor, tab !== 'plainText' && styles.monospace]}
          />
        </Card>

        {scan.questions?.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Detected questions"
              subtitle={`${scan.questions.length} ${scan.questions.length === 1 ? 'question' : 'questions'} found. Edit the transcript above to make corrections.`}
            />
            <Card style={styles.questionList}>
              {scan.questions.map((question, index) => (
                <View key={`${question.number || index}-${index}`}>
                  <View style={styles.questionRow}>
                    <Badge label={String(question.number || index + 1)} tone="primary" />
                    <View style={[styles.flexCopy, styles.questionContent]}>
                      <AppText selectable>{question.question || question.latex || 'Question detected'}</AppText>
                      {Array.isArray(question.options) && question.options.map((option, optionIndex) => (
                        <AppText key={optionIndex} selectable>{String(option)}</AppText>
                      ))}
                    </View>
                  </View>
                  {index < scan.questions.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="Professional export"
            subtitle="Create a clean, share-ready file from recognized content."
          />
          <View style={styles.exportGrid}>
            <PressableScale
              accessibilityLabel="Export PDF"
              disabled={Boolean(exporting)}
              onPress={() => exportFile('pdf')}
              style={styles.exportItem}
            >
              <Card style={styles.exportCard}>
                {exporting === 'pdf' ? <ActivityIndicator color={C.danger} /> : <FeatureIcon name="document-text" tone="warning" size={50} />}
                <View style={styles.flexCopy}>
                  <AppText variant="headline">PDF document</AppText>
                  <Muted>Portable and print-ready</Muted>
                </View>
                <FeatureIcon name="download-outline" size={34} />
              </Card>
            </PressableScale>
            <PressableScale
              accessibilityLabel="Export Word"
              disabled={Boolean(exporting)}
              onPress={() => exportFile('docx')}
              style={styles.exportItem}
            >
              <Card style={styles.exportCard}>
                {exporting === 'docx' ? <ActivityIndicator color={C.primary} /> : <FeatureIcon name="document" size={50} />}
                <View style={styles.flexCopy}>
                  <AppText variant="headline">Word document</AppText>
                  <Muted>Editable DOCX format</Muted>
                </View>
                <FeatureIcon name="download-outline" size={34} />
              </Card>
            </PressableScale>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="AI study tools"
            subtitle="Solve any recognized problem or turn it into practice."
          />
          <Input
            label="Your answer (only needed for Answer Check)"
            icon="create-outline"
            placeholder="Example: x = 4 or 27.5"
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
                  {busyAction === action ? (
                    <View style={styles.aiLoader}>
                      <ActivityIndicator color={C.primary} />
                    </View>
                  ) : (
                    <FeatureIcon name={icon} tone={action === 'solve' || action === 'check' ? 'accent' : 'primary'} size={46} />
                  )}
                  <AppText variant="headline">{title}</AppText>
                  <Muted>{description}</Muted>
                </Card>
              </PressableScale>
            ))}
          </View>
        </View>

        {ai ? (
          <Animated.View entering={FadeInDown.duration(motion.base).reduceMotion(ReduceMotion.System)}>
            <Card tone="dark" style={styles.aiResult}>
              <View style={styles.aiResultTop}>
                <View style={styles.aiResultTitle}>
                  <FeatureIcon name="sparkles" tone="accent" size={42} />
                  <View>
                    <AppText variant="section" color="white">MathLens answer</AppText>
                    <AppText variant="caption" color="#AFC0E2">AI-GENERATED • REVIEW IMPORTANT WORK</AppText>
                  </View>
                </View>
                <Button
                  title="Copy"
                  icon="copy-outline"
                  variant="ghost"
                  size="sm"
                  onPress={() => copyText(ai, 'Answer')}
                  style={styles.copyAiButton}
                />
              </View>
              <AppText color="#E7EDFA" selectable style={styles.aiText}>{ai}</AppText>
            </Card>
          </Animated.View>
        ) : null}
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resultHeading: {
    gap: spacing.xs,
  },
  headingBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flexCopy: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: spacing.xxs,
    gap: spacing.xxs,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: '#E8ECF3',
  },
  segment: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  segmentActive: {
    backgroundColor: C.white,
    boxShadow: '0 2px 8px rgba(18, 30, 65, 0.10)',
  },
  contentToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  editorCard: {
    padding: 0,
    overflow: 'hidden',
    boxShadow: shadows.raised,
  },
  editor: {
    minHeight: 300,
    padding: spacing.lg,
    color: C.ink,
    ...type.body,
  },
  monospace: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  section: {
    gap: spacing.md,
  },
  questionList: {
    gap: spacing.md,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  questionContent: {
    gap: spacing.xs,
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
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    minHeight: 176,
    gap: spacing.sm,
  },
  aiLoader: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiResult: {
    gap: spacing.lg,
    boxShadow: shadows.raised,
  },
  aiResultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiResultTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copyAiButton: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  aiText: {
    lineHeight: 24,
  },
});
