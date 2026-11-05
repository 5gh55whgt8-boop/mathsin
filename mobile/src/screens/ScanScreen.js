import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { api, describeApiFailure, syncLocalScan } from '../api/client';
import { markCameraPending, clearCameraPending } from '../services/ocr/cameraRecovery';
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
    key: 'ai-camera',
    title: 'Scan & Solve (Camera)',
    description: 'Capture handwritten or printed math with camera.',
    icon: 'camera-outline',
    tone: 'primary',
    badge: 'AI SOLVER',
  },
  {
    key: 'ai-upload',
    title: 'Scan & Solve (Gallery)',
    description: 'Select an equation image from your photos.',
    icon: 'images-outline',
    tone: 'primary',
    badge: 'AI SOLVER',
  },
  {
    key: 'quick-upload',
    title: 'Fast Text OCR',
    description: 'Rapid on-device recognition for printed text.',
    icon: 'flash-outline',
    tone: 'navy',
    badge: 'ON-DEVICE',
  },
  {
    key: 'document',
    title: 'Import Document',
    description: 'Analyze PDF, DOCX or TXT with math notation.',
    icon: 'document-text-outline',
    tone: 'navy',
    badge: 'DOCUMENT',
  },
  {
    key: 'create-pdf',
    title: 'Create Multi-Page PDF',
    description: 'Combine multiple photos into an export-ready PDF.',
    icon: 'copy-outline',
    tone: 'primary',
    badge: 'UTILITY',
  },
];
const sourceRows = [sources.slice(0, 2), sources.slice(2, 4), sources.slice(4, 5)];

const documentMimeByExtension = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

// Pickers can report no type or a generic one, and the server only accepts real
// document types, so derive the type from the file name when needed.
function documentMimeType(asset) {
  const supplied = String(asset?.mimeType || '').toLowerCase();
  if (Object.values(documentMimeByExtension).includes(supplied)) return supplied;
  const name = asset?.name || asset?.fileName || asset?.uri || '';
  const ext = String(name).split('?')[0].split('.').pop().toLowerCase();
  return documentMimeByExtension[ext] || supplied || 'application/octet-stream';
}

export default function ScanScreen({ navigation, route }) {
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  const compact = width < 380;

  // The photo taken just before Android restarted the app is handed over by the navigator.
  const recovered = route?.params?.recovered;
  useEffect(() => {
    if (!recovered?.uri) return;
    setAsset({ ...recovered, kind: 'image', mode: 'ai', captureSource: 'camera' });
    navigation.setParams({ recovered: undefined });
  }, [recovered, navigation]);

  async function image(camera = false, mode = 'ai') {
    try {
      let result;
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission needed', 'Allow camera access to scan text directly.');
          return;
        }
        // Android may destroy this app while the camera is open; the flag lets the
        // next launch recover the finished photo (see services/ocr/cameraRecovery).
        await markCameraPending();
        result = await ImagePicker.launchCameraAsync({
          quality: 0.85,
          exif: false,
          allowsEditing: false,
          mediaTypes: ['images'],
        });
        await clearCameraPending();
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
      await clearCameraPending();
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
        const isDocument = asset.kind === 'document';
        const fileName = asset.fileName || asset.name || (isDocument ? 'document' : 'camera-scan.jpg');
        // Documents must keep their real type; forcing image/jpeg made the server reject them.
        const mimeType = isDocument
          ? documentMimeType(asset)
          : asset.mimeType?.startsWith('image/')
            ? asset.mimeType
            : /\.(png)$/i.test(fileName) ? 'image/png' : 'image/jpeg';
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <AppText variant="title">Capture & Analyze</AppText>
          <Muted>Choose an input method to scan equations or documents.</Muted>
        </View>

        {!asset ? (
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
                    <Card style={[styles.sourceCard, compact && styles.sourceCardCompact]}>
                      <View style={styles.sourceCardTop}>
                        <FeatureIcon name={source.icon} tone={source.tone} size={compact ? 36 : 40} />
                        {source.badge && (
                          <Badge
                            label={source.badge}
                            tone={source.tone === 'primary' ? 'primary' : 'neutral'}
                          />
                        )}
                      </View>
                      <View style={styles.sourceCardBody}>
                        <AppText variant="headline" numberOfLines={1}>{source.title}</AppText>
                        <Muted numberOfLines={2} style={styles.tileDescription}>{source.description}</Muted>
                      </View>
                      <View style={styles.tileFooter}>
                        <AppText variant="caption" color="primary">Select</AppText>
                        <Ionicons name="arrow-forward" size={14} color={C.primary} />
                      </View>
                    </Card>
                  </PressableScale>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.selectionSection}>
            <SectionHeader
              title={asset.kind === 'image' ? 'Ready to process' : 'Ready to analyze'}
              subtitle={asset.kind === 'image'
                ? (asset.mode === 'quick'
                  ? 'On-device text recognition will read this image directly.'
                  : 'AI mathematics pipeline will solve equations and format solutions.')
                : 'Document will be processed via secure document pipeline.'}
            />
            <Card style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Badge
                  label={asset.kind === 'image' ? (asset.mode === 'quick' ? 'FAST OCR' : 'AI MATH SOLVER') : 'DOCUMENT'}
                  tone={asset.kind === 'image' && asset.mode === 'quick' ? 'neutral' : 'primary'}
                  icon={asset.kind === 'image' ? 'scan-outline' : 'document-outline'}
                />
                <IconButton
                  name="close"
                  accessibilityLabel="Remove selected file"
                  onPress={() => setAsset(null)}
                  disabled={busy}
                  variant="light"
                />
              </View>

              {asset.kind === 'image' ? (
                <View style={styles.imagePreviewWrap}>
                  <Image
                    source={{ uri: asset.uri }}
                    style={styles.previewImage}
                    contentFit="contain"
                    transition={160}
                  />
                </View>
              ) : (
                <View style={styles.documentPreview}>
                  <FeatureIcon name="document-text-outline" tone="primary" size={64} />
                  <AppText variant="headline" style={styles.documentPreviewTitle}>Document Ready</AppText>
                  <Muted style={styles.documentPreviewSub}>PDF, Word DOCX, or text file</Muted>
                </View>
              )}

              <View style={styles.fileMeta}>
                <View style={styles.fileCopy}>
                  <AppText variant="bodyStrong" numberOfLines={1}>{assetName}</AppText>
                  <Muted>{asset.kind === 'image'
                    ? (asset.mode === 'quick' ? 'On-device text scan' : 'AI mathematical analysis')
                    : (asset.mimeType || 'Ready for secure upload')}</Muted>
                </View>
                <Badge label="Ready" tone="good" icon="checkmark-circle" />
              </View>

              <Button
                title={
                  asset.kind === 'image'
                    ? (busy ? 'Analyzing equation…' : asset.mode === 'quick' ? 'Recognize text' : 'Scan & Solve with AI')
                    : (busy ? 'Processing document…' : 'Process Document')
                }
                icon={asset.kind === 'image' ? 'calculator-outline' : 'document-text-outline'}
                variant="primary"
                size="lg"
                loading={busy}
                haptic
                onPress={handleScan}
              />
              <AppText variant="caption" color="muted" style={styles.busyNote}>
                {asset.kind === 'image'
                  ? (asset.mode === 'quick'
                    ? (busy ? 'READING ON-DEVICE…' : '⚡ HIGH-SPEED LOCAL OCR')
                    : (busy ? 'SOLVING EQUATION WITH AI…' : 'DEEP MATHEMATICAL OCR & STEP-BY-STEP SOLVER'))
                  : 'SECURE DOCUMENT PIPELINE. MULTI-PAGE FILES MAY TAKE A MOMENT.'}
              </AppText>
            </Card>
          </View>
        )}
      </ScrollView>

      {busy && !asset ? (
        <View
          accessibilityRole="alert"
          accessibilityLabel="Creating PDF"
          style={styles.pdfLoadingOverlay}
        >
          <Card style={styles.pdfLoadingCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <AppText variant="headline">Generating PDF</AppText>
            <Muted style={styles.pdfLoadingText}>Merging selected images into an export document…</Muted>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  heading: {
    gap: 2,
    paddingBottom: spacing.xxs,
  },
  sourceGrid: {
    gap: spacing.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceItem: {
    flex: 1,
  },
  sourceCard: {
    minHeight: 148,
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.xs,
  },
  sourceCardCompact: {
    padding: spacing.sm,
    minHeight: 136,
  },
  sourceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceCardBody: {
    gap: 2,
  },
  tileDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  tileFooter: {
    marginTop: 'auto',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  selectionSection: {
    flex: 1,
    gap: spacing.md,
  },
  previewCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imagePreviewWrap: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  documentPreview: {
    minHeight: 160,
    borderRadius: radius.md,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  documentPreviewTitle: {
    marginTop: spacing.xs,
  },
  documentPreviewSub: {
    fontSize: 12,
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
  pdfLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    zIndex: 10,
  },
  pdfLoadingCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  pdfLoadingText: {
    textAlign: 'center',
    fontSize: 12,
  },
});
