import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../api/client';
import { scanErrorMessage } from '../api/scanError';
import {
  AppText,
  Badge,
  Button,
  Card,
  FeatureIcon,
  IconButton,
  Muted,
  PressableScale,
  Screen,
  ScrollScreen,
  SectionHeader,
} from '../components/UI';
import { C, gradients, radius, shadows, spacing } from '../theme';

const sources = [
  {
    key: 'camera',
    title: 'Take a photo',
    description: 'Capture a worksheet, equation or handwritten note.',
    icon: 'camera-outline',
    tone: 'primary',
  },
  {
    key: 'gallery',
    title: 'Choose an image',
    description: 'Import a clear JPG, PNG or saved screenshot.',
    icon: 'images-outline',
    tone: 'accent',
  },
  {
    key: 'document',
    title: 'Upload a document',
    description: 'Recognize PDF, DOCX or plain text files.',
    icon: 'document-text-outline',
    tone: 'warning',
  },
];

export default function ScanScreen({ navigation }) {
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const restore = () => {
      api.get('/scans/jobs').then(({ data }) => {
        if (!cancelled && data.jobs?.[0]) setJob(data.jobs[0]);
      }).catch(() => {});
    };
    restore();
    const unsubscribe = navigation.addListener('focus', restore);
    return () => { cancelled = true; unsubscribe(); };
  }, [navigation]);

  useEffect(() => {
    if (!job?.id) return;
    let cancelled = false;
    let timer;
    const poll = async () => {
      try {
        const { data } = await api.get(`/scans/jobs/${job.id}`);
        if (cancelled) return;
        if (data.job.status === 'completed') {
          setJob(null);
          if (data.scan) navigation.navigate('Result', { scan: data.scan });
          return;
        }
        if (data.job.status === 'failed') {
          setJob(null);
          Alert.alert('Scan could not complete', data.job.message);
          return;
        }
        setJob(data.job);
      } catch (error) {
        if (cancelled) return;
        if ([401, 404].includes(error.response?.status)) { setJob(null); return; }
        // An offline phone must not cancel or resubmit the server's job.
      }
      if (!cancelled) timer = setTimeout(poll, 5000);
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [job?.id, navigation]);

  async function image(camera = false) {
    try {
      let result;
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission needed', 'Allow camera access to scan equations directly.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 1 });
      } else {
        if (Platform.OS !== 'web') {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Photo permission needed', 'Allow photo access to choose an image to scan.');
            return;
          }
        }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
      }
      if (!result.canceled) setAsset({ ...result.assets[0], kind: 'image' });
    } catch (error) {
      Alert.alert('Unable to open image', error.message);
    }
  }

  async function doc() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) setAsset({ ...result.assets[0], kind: 'document' });
    } catch (error) {
      Alert.alert('Unable to open document', error.message);
    }
  }

  async function chooseSource(key) {
    if (key === 'camera') return image(true);
    if (key === 'gallery') return image(false);
    return doc();
  }

  async function appendWebFile(formData, selected) {
    if (selected.file instanceof File) {
      formData.append('file', selected.file, selected.file.name || selected.name || 'scan');
      return;
    }

    const response = await fetch(selected.uri);
    const blob = await response.blob();
    const fileName = selected.fileName || selected.name || (selected.kind === 'image' ? 'scan.jpg' : 'scan');
    const mimeType = selected.mimeType || blob.type || (selected.kind === 'image' ? 'image/jpeg' : 'application/octet-stream');
    const file = new File([blob], fileName, { type: mimeType });
    formData.append('file', file, fileName);
  }

  async function upload() {
    if (!asset || busy || job) return;
    try {
      setBusy(true);
      const formData = new FormData();

      if (Platform.OS === 'web') {
        await appendWebFile(formData, asset);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || asset.name || (asset.kind === 'image' ? 'scan.jpg' : 'scan'),
          type: asset.mimeType || (asset.kind === 'image' ? 'image/jpeg' : 'application/octet-stream'),
        });
      }

      const isPdf = asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name || asset.fileName || '');
      const { data } = await api.post(
        isPdf ? '/scans/jobs' : asset.kind === 'image' ? '/scans/image' : '/scans/document',
        formData,
        { timeout: 600000 },
      );
      if (data.job) setJob(data.job);
      else navigation.navigate('Result', { scan: data.scan });
      setAsset(null);
    } catch (error) {
      console.error('SCAN ERROR', error.response?.data || error.message);
      const failure = scanErrorMessage(error);
      Alert.alert(failure.title, failure.message);
    } finally {
      setBusy(false);
    }
  }

  const assetName = asset?.fileName || asset?.name || 'Selected image';

  return (
    <Screen>
      <ScrollScreen>
        {job && <Card><AppText variant="headline">PDF scan: {job.status}</AppText><Muted>{job.completed} / {job.total || '?'} sections saved. You can leave this screen; find the finished scan in History.</Muted>{job.message ? <Muted>{job.message}</Muted> : null}</Card>}
        <View style={styles.heading}>
          <Badge label="NEW AI SCAN" tone="primary" icon="sparkles" />
          <AppText variant="title">What would you like to scan?</AppText>
          <Muted>Use a sharp, well-lit source for the highest symbol and equation accuracy.</Muted>
        </View>

        <View style={styles.sourceList}>
          {sources.map(source => (
            <PressableScale
              key={source.key}
              accessibilityLabel={source.title}
              disabled={busy}
              onPress={() => chooseSource(source.key)}
            >
              <Card style={styles.sourceCard}>
                <FeatureIcon name={source.icon} tone={source.tone} size={52} />
                <View style={styles.sourceCopy}>
                  <AppText variant="headline">{source.title}</AppText>
                  <Muted>{source.description}</Muted>
                </View>
                <FeatureIcon name="chevron-forward" size={34} />
              </Card>
            </PressableScale>
          ))}
        </View>

        {asset && (
          <View style={styles.selectionSection}>
            <SectionHeader title="Ready to recognize" subtitle="Review your source before sending it to AI." />
            <Card style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Badge
                  label={asset.kind === 'image' ? 'IMAGE' : 'DOCUMENT'}
                  tone={asset.kind === 'image' ? 'good' : 'primary'}
                  icon={asset.kind === 'image' ? 'image-outline' : 'document-outline'}
                />
                <IconButton
                  name="close"
                  accessibilityLabel="Remove selected file"
                  onPress={() => setAsset(null)}
                  disabled={busy}
                />
              </View>

              {asset.kind === 'image' ? (
                <Image
                  source={{ uri: asset.uri }}
                  style={styles.previewImage}
                  contentFit="contain"
                  transition={180}
                />
              ) : (
                <LinearGradient colors={gradients.soft} style={styles.documentPreview}>
                  <FeatureIcon name="document-text" tone="primary" size={72} />
                  <AppText variant="caption" color="primary">SUPPORTED DOCUMENT</AppText>
                </LinearGradient>
              )}

              <View style={styles.fileMeta}>
                <View style={styles.fileCopy}>
                  <AppText variant="bodyStrong" numberOfLines={1}>{assetName}</AppText>
                  <Muted>{asset.mimeType || 'Ready for secure upload'}</Muted>
                </View>
                <Badge label="Ready" tone="good" icon="checkmark-circle" />
              </View>

              <Button
                title={busy ? 'Recognizing your math…' : 'Recognize with AI'}
                icon="sparkles-outline"
                loading={busy}
                haptic
                onPress={upload}
              />
              {busy && (
                <AppText variant="caption" color="muted" style={styles.busyNote}>
                  READING YOUR MATH. MULTI-PAGE DOCUMENTS MAY TAKE SEVERAL MINUTES.
                </AppText>
              )}
            </Card>
          </View>
        )}

        <Card tone="soft" style={styles.tipCard}>
          <FeatureIcon name="bulb-outline" tone="warning" size={42} />
          <View style={styles.sourceCopy}>
            <AppText variant="bodyStrong">Capture tip</AppText>
            <Muted>Keep the page flat, fill the frame, and avoid shadows over fractions or exponents.</Muted>
          </View>
        </Card>
      </ScrollScreen>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xs,
  },
  sourceList: {
    gap: spacing.sm,
  },
  sourceCard: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sourceCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  selectionSection: {
    gap: spacing.md,
  },
  previewCard: {
    gap: spacing.md,
    boxShadow: shadows.raised,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewImage: {
    width: '100%',
    height: 260,
    borderRadius: radius.md,
    backgroundColor: C.bg,
  },
  documentPreview: {
    minHeight: 200,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fileCopy: {
    flex: 1,
  },
  busyNote: {
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
