import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { api, describeApiFailure, syncLocalScan } from '../api/client';
import { recognizeImage, containsMathLikeText } from '../services/ocr';
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
  SectionHeader,
} from '../components/UI';
import { C, gradients, radius, shadows, spacing } from '../theme';

const sources = [
  {
    key: 'quick-upload',
    title: 'Scan Text (Gallery)',
    description: 'Select a printed image from gallery.',
    icon: 'image-outline',
    tone: 'accent',
    category: '',
    cardColor: '#ECFBF7',
  },
  {
    key: 'ai-camera',
    title: 'Scan & Solve (Camera)',
    description: 'Scan handwritten or printed math.',
    icon: 'camera-outline',
    tone: 'blue',
    category: '',
    cardColor: '#EEF7FF',
  },
  {
    key: 'ai-upload',
    title: 'Scan & Solve (Gallery)',
    description: 'Select a handwritten or printed image.',
    icon: 'images-outline',
    tone: 'pink',
    category: '',
    cardColor: '#FFF0F5',
  },
  {
    key: 'document',
    title: 'Import Document',
    description: 'PDF, DOCX or TXT (with math).',
    icon: 'document-text-outline',
    tone: 'warning',
    category: '',
    cardColor: '#FFF7E9',
  },
  {
    key: 'create-pdf',
    title: 'Create PDF',
    description: 'Combine multiple images.',
    icon: 'copy-outline',
    tone: 'primary',
    category: '',
    cardColor: '#F8F0FF',
  },
];
const sourceRows = [sources.slice(0, 2), sources.slice(2, 4), sources.slice(4, 6)];

export default function ScanScreen({ navigation }) {
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  const compact = width < 380;

  async function image(camera = false, mode = 'ai') {
    try {
      let result;
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission needed', 'Allow camera access to scan text directly.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.25,
          exif: false,
          mediaTypes: ['images'],
        });
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
      if (!result.canceled) {
        const selected = result.assets[0];
        if (mode === 'quick' && !camera && ((selected.width || 0) * (selected.height || 0) > 3000000
          || selected.width > 4096 || selected.height > 4096)) {
          Alert.alert(
            'Image is too detailed',
            'Quick Scan supports smaller images on this device. Please retake the photo from farther away or use the gallery option.',
          );
          return;
        }
        setAsset({ ...selected, kind: 'image', mode, captureSource: camera ? 'camera' : 'gallery' });
      }
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
    if (key === 'quick-upload') return image(false, 'quick');
    if (key === 'ai-camera') return image(true);
    if (key === 'ai-upload') return image(false);
    if (key === 'create-pdf') return createPdf();
    return doc();
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

  async function createPdf() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;
      const unsupported = result.assets.find(asset => (
        asset.mimeType && !['image/jpeg', 'image/png'].includes(asset.mimeType)
      ));
      if (unsupported) {
        Alert.alert(
          'Image format not supported',
          'Choose a JPEG or PNG image to create a PDF.',
        );
        return;
      }
      const oversized = result.assets.find(asset => Number(asset.fileSize) > 20 * 1024 * 1024);
      if (oversized) {
        Alert.alert('Image is too large', 'Choose images smaller than 20 MB to create a PDF.');
        return;
      }
      setBusy(true);
      const formData = new FormData();
      for (const selected of result.assets) {
        if (Platform.OS === 'web') {
          await appendWebFile(formData, { ...selected, kind: 'image' }, 'images');
        } else {
          formData.append('images', {
            uri: selected.uri,
            name: selected.fileName || 'image.jpg',
            type: selected.mimeType || 'image/jpeg',
          });
        }
      }
      let response;
      try {
        response = await api.post('/exports/images-pdf', formData, {
          responseType: Platform.OS === 'web' ? 'blob' : 'arraybuffer',
          timeout: 120000,
        });
      } catch (error) {
        if (error.response?.status !== 404) throw error;
        throw new Error('PDF creation is not available on the connected server. Please update the app or redeploy the latest MathLens API, then try again.');
      }
      if (Platform.OS === 'web') {
        const pdfData = response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfData);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'mathlens-images.pdf';
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        const destination = `${FileSystem.cacheDirectory}mathlens-images-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(destination, bytesToBase64(response.data), { encoding: 'base64' });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(destination, { mimeType: 'application/pdf', dialogTitle: 'Share your PDF' });
        } else {
          Alert.alert('PDF created', 'Your PDF is ready in the app cache.');
        }

      }
    } catch (error) {
      Alert.alert('Could not create PDF', error.response?.data?.error || error.message || describeApiFailure(error, 'PDF creation'));
    } finally {
      setBusy(false);
    }
  }

  async function appendWebFile(formData, selected, fieldName = 'file') {
    if (selected.file instanceof File) {
      formData.append(fieldName, selected.file, selected.file.name || selected.name || 'scan');
      return;
    }

    const response = await fetch(selected.uri);
    const blob = await response.blob();
    const fileName = selected.fileName || selected.name || (selected.kind === 'image' ? 'scan.jpg' : 'scan');
    const mimeType = selected.mimeType || blob.type || (selected.kind === 'image' ? 'image/jpeg' : 'application/octet-stream');
    const file = new File([blob], fileName, { type: mimeType });
    formData.append(fieldName, file, fileName);
  }

  async function handleScan() {
    if (!asset) return;
    try {
      if (Number(asset.fileSize) > 20 * 1024 * 1024) {
        Alert.alert('Image is too large', 'Choose an image smaller than 20 MB and try again.');
        return;
      }
      setBusy(true);

      // Gallery Quick Scan stays on-device. Camera captures use the backend
      // pipeline because native ML Kit can terminate older Android processes
      // while decoding high-resolution camera output.
      if (asset.kind === 'image' && asset.mode === 'quick' && asset.captureSource !== 'camera') {
        const ocrResult = await recognizeImage(asset.uri);
        const mathDetected = containsMathLikeText(ocrResult.text);

        const scanData = {
          local: true,
          sourceType: 'image',
          provider: 'ML Kit',
          model: 'On-device Text Recognition',
          title: asset.fileName || asset.name || ('Scan ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
          plainText: ocrResult.text,
          markdown: ocrResult.text,
          latex: '',
          blocks: ocrResult.blocks || [],
          questions: [],
          warnings: mathDetected
            ? ['Mathematical notation detected. Local OCR extracts plain text; for mathematical problem solving, tap "Solve step-by-step" in AI study tools.']
            : [],
          imageUri: asset.uri,
        };

        // If online and authenticated, persist to user's library without calling any AI
        try {
          const savedScan = await syncLocalScan(scanData);
          if (savedScan?._id) {
            scanData._id = savedScan._id;
            scanData.createdAt = savedScan.createdAt;
          }
        } catch (syncError) {
          scanData.localSyncId = syncError.localSyncId;
          console.warn('[OCR] Local scan queued for synchronization:', describeApiFailure(syncError, 'Local scan sync'));
        }

        setAsset(null);
        navigation.navigate('Result', { scan: scanData });
        return;
      }

      // Standard image scans and documents use the backend AI pipeline.
      const formData = new FormData();
      if (Platform.OS === 'web') {
        await appendWebFile(formData, asset);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || asset.name || 'scan',
          type: asset.mimeType || 'application/octet-stream',
        });
      }

      const endpoint = asset.kind === 'image' ? '/scans/image' : '/scans/document';
      const { data } = await api.post(endpoint, formData, { timeout: 600000 });
      navigation.navigate('Result', { scan: data.scan });
      setAsset(null);
    } catch (error) {
      console.error('SCAN ERROR', error.response?.data || error.message);
      const message = error.response
        ? describeApiFailure(error, 'Scan')
        : /too large|size|memory|large image/i.test(error?.message || '')
          ? 'This image is too large for Quick Scan. Choose a smaller image or use a clear photo.'
          : /no readable text|no text/i.test(error?.message || '')
            ? 'No readable text was found. Try a clearer, well-lit image.'
            : 'We could not read this image. Try a clearer image or try again.';
      Alert.alert('Scan failed', message);
    } finally {
      setBusy(false);
    }
  }

  const assetName = asset?.fileName || asset?.name || 'Selected image';

  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.heading}>
          <AppText variant="display" style={styles.headingTitle}>Choose <AppText variant="display" color="primary">input type</AppText></AppText>
          <Muted>Select how you want to scan.</Muted>
        </View>

        {!asset ? (
          <>
            <View style={styles.sourceGrid}>
              {sourceRows.map((row, rowIndex) => (
                <View key={`source-row-${rowIndex}`} style={styles.sourceRow}>
                  {row.map(source => (
                    <PressableScale
                      key={source.key}
                      accessibilityLabel={source.title}
                      disabled={busy}
                      onPress={() => chooseSource(source.key)}
                      style={styles.sourceItem}
                    >
                      <Card style={[styles.sourceCard, compact && styles.sourceCardCompact, { backgroundColor: source.cardColor }]}>
                        <FeatureIcon name={source.icon} tone={source.tone} size={compact ? 32 : 38} />
                        {source.category ? <AppText variant="caption" color="muted" numberOfLines={1}>{source.category}</AppText> : null}
                        <AppText variant="headline" numberOfLines={1}>{source.title}</AppText>
                        <Muted numberOfLines={2} style={styles.tileDescription}>{source.description}</Muted>
                        <View style={styles.tileFooter}>
                          <AppText variant="caption" color="primary">Open</AppText>
                          <FeatureIcon name="arrow-forward" size={compact ? 24 : 28} />
                        </View>
                      </Card>
                    </PressableScale>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.selectionSection}>
            <SectionHeader
              title={asset.kind === 'image' ? 'Ready to scan' : 'Ready to upload'}
              subtitle={asset.kind === 'image'
                ? (asset.mode === 'quick'
                  ? 'Text will be read quickly from this image.'
                  : 'This image will be processed securely for the best result.')
                : 'Document will be processed via secure document pipeline.'}
            />
            <Card style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Badge
                  label={asset.kind === 'image' ? (asset.mode === 'quick' ? 'QUICK SCAN' : 'AI SCAN') : 'DOCUMENT'}
                  tone={asset.kind === 'image' && asset.mode === 'quick' ? 'good' : 'primary'}
                  icon={asset.kind === 'image' ? 'scan-outline' : 'document-outline'}
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
                  <Muted>{asset.kind === 'image'
                    ? (asset.mode === 'quick' ? 'Quick text scan' : 'Detailed image scan')
                    : (asset.mimeType || 'Ready for secure upload')}</Muted>
                </View>
                <Badge label="Ready" tone="good" icon="checkmark-circle" />
              </View>

              <Button
                title={
                  asset.kind === 'image'
                    ? (busy ? 'Reading text…' : asset.mode === 'quick' ? 'Quick scan' : 'Scan with AI')
                    : (busy ? 'Reading document…' : 'Scan Document')
                }
                icon={asset.kind === 'image' ? 'scan-outline' : 'document-text-outline'}
                loading={busy}
                haptic
                onPress={handleScan}
              />
              <AppText variant="caption" color="muted" style={styles.busyNote}>
                {asset.kind === 'image'
                  ? (asset.mode === 'quick'
                    ? (busy ? 'READING TEXT…' : '⚡ QUICK TEXT SCAN')
                    : (busy ? 'READING IMAGE…' : 'DETAILED IMAGE SCAN'))
                  : 'READING DOCUMENT. MULTI-PAGE DOCUMENTS MAY TAKE SEVERAL MINUTES.'}
              </AppText>
            </Card>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  heading: {
    gap: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  headingTitle: {
    fontSize: 32,
    lineHeight: 38,
  },
  sourceGrid: {
    flex: 1,
    gap: spacing.sm,
  },
  sourceRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceItem: {
    flex: 1,
  },
  sourceCard: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: spacing.xxs,
    padding: spacing.md,
    borderWidth: 0,
    boxShadow: '0 6px 18px rgba(25, 39, 79, 0.06)',
  },
  sourceCardCompact: {
    padding: spacing.sm,
  },
  tileFooter: {
    marginTop: 'auto',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  tileDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  sourceCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  selectionSection: {
    flex: 1,
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
    height: 180,
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
