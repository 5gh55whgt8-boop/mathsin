import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function ScanRow({ item, onPress }) {
  const typeLabel = item.sourceType === 'image' ? 'Image' : item.sourceType === 'pdf' ? 'PDF' : 'Document';
  const preview = item.plainText || item.markdown || 'Open to view recognized content.';

  return (
    <PressableScale accessibilityLabel={`Open ${item.title}`} onPress={onPress}>
      <Card style={styles.rowCard}>
        <View style={styles.rowTop}>
          <FeatureIcon
            name={item.sourceType === 'image' ? 'image-outline' : 'document-text-outline'}
            tone={item.sourceType === 'image' ? 'accent' : 'primary'}
            size={46}
          />
          <View style={styles.rowCopy}>
            <AppText variant="headline" numberOfLines={1}>{item.title || 'Untitled scan'}</AppText>
            <Muted numberOfLines={2}>{preview}</Muted>
          </View>
          <FeatureIcon name="chevron-forward" size={32} />
        </View>
        <View style={styles.rowMeta}>
          <Badge label={typeLabel} tone="neutral" />
          {item.questions?.length > 0 && (
            <Badge label={`${item.questions.length} questions`} tone="primary" icon="help-circle-outline" />
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
      setError(loadError.response?.data?.error || 'Could not load scan history.');
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
        keyExtractor={item => item._id}
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
              <AppText variant="title">Your scan library</AppText>
              <Muted>{items.length} saved {items.length === 1 ? 'scan' : 'scans'}, synced to your workspace.</Muted>
            </View>
            <Input
              icon="search-outline"
              placeholder="Search titles, text or tags"
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
            <Muted>Loading your scans…</Muted>
          </View>
        ) : (
          <EmptyState
            icon={query ? 'search-outline' : 'documents-outline'}
            title={query ? 'No matching scans' : 'Your library is ready'}
            message={query ? 'Try another title, tag or phrase.' : 'Your recognized equations and documents will appear here.'}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  heading: {
    gap: spacing.xxs,
  },
  separator: {
    height: spacing.sm,
  },
  rowCard: {
    gap: spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    marginLeft: 'auto',
  },
  loader: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
