import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import {
  AppText,
  Badge,
  Card,
  EmptyState,
  FeatureIcon,
  Input,
  Muted,
  PressableScale,
  Screen,
} from '../components/UI';
import { C, layout, spacing } from '../theme';

function formatDate(value) {
  if (!value) return 'Recent';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ScanRow({ item, onPress }) {
  const isLocal = item.provider === 'mlkit' || item.ocrSource === 'mlkit' || item.recognitionMode === 'local';
  const typeLabel = isLocal ? 'Fast OCR' : item.sourceType === 'image' ? 'Equation' : item.sourceType === 'pdf' ? 'PDF' : 'Document';
  const preview = item.plainText || item.markdown || item.latex || 'Open to view recognized content.';

  return (
    <PressableScale accessibilityLabel={`Open ${item.title}`} onPress={onPress}>
      <Card style={styles.rowCard}>
        <View style={styles.rowTop}>
          <FeatureIcon
            name={item.sourceType === 'image' ? 'calculator-outline' : 'document-text-outline'}
            tone="primary"
            size={42}
          />
          <View style={styles.rowCopy}>
            <AppText variant="headline" numberOfLines={1}>{item.title || 'Untitled equation scan'}</AppText>
            <Muted numberOfLines={2} style={styles.rowPreviewText}>{preview}</Muted>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.subtle} />
        </View>
        <View style={styles.rowMeta}>
          <Badge label={typeLabel} tone={isLocal ? 'neutral' : 'primary'} />
          {item.questions?.length > 0 && (
            <Badge label={`${item.questions.length} Qs`} tone="neutral" icon="help-circle-outline" />
          )}
          <AppText variant="caption" color="muted" style={styles.date}>{formatDate(item.createdAt)}</AppText>
        </View>
      </Card>
    </PressableScale>
  );
}

export default function HistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const response = await api.get('/scans');
      setItems(response.data.items || []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Could not load scan library.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(item => [item.title, item.plainText, item.markdown, ...(item.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalized));
  }, [items, query]);

  return (
    <Screen>
      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => item._id || item.id || `scan-${item.createdAt || index}`}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={(
          <View style={styles.header}>
            <View style={styles.heading}>
              <AppText variant="title">Mathematical Library</AppText>
              <Muted>{items.length} digitized {items.length === 1 ? 'item' : 'items'} synced to your workspace.</Muted>
            </View>
            <Input
              icon="search-outline"
              placeholder="Search equations, formulas or tags"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {error ? (
              <Card tone="warning">
                <AppText variant="bodyStrong" color="warning" selectable>{error}</AppText>
              </Card>
            ) : null}
          </View>
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={C.primary} />
            <Muted>Loading library records…</Muted>
          </View>
        ) : (
          <EmptyState
            icon={query ? 'search-outline' : 'library-outline'}
            title={query ? 'No matching scans' : 'Your library is empty'}
            message={query ? 'Try another keyword or expression snippet.' : 'Equations and documents you scan will be organized here.'}
          />
        )}
        renderItem={({ item }) => (
          <ScanRow item={item} onPress={() => navigation.navigate('Result', { scan: item })} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContent,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
  },
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  heading: {
    gap: 2,
  },
  separator: {
    height: spacing.xs,
  },
  rowCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowPreviewText: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxs,
  },
  date: {
    marginLeft: 'auto',
    fontSize: 11,
  },
  loader: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
