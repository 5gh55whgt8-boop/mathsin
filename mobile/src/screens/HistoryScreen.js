import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
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
import { C, layout, radius, spacing } from '../theme';

function formatDate(value) {
  if (!value) return 'Recent';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function LibraryCard({ item, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const isLocal = item.provider === 'mlkit' || item.ocrSource === 'mlkit' || item.recognitionMode === 'local';
  const typeLabel = isLocal ? 'Fast OCR' : item.sourceType === 'image' ? 'Equation' : item.sourceType === 'pdf' ? 'PDF' : 'Document';
  const textContent = (item.latex || item.plainText || item.markdown || '').trim();
  const preview = textContent || 'No mathematical expression text recorded.';

  // Check if content is long enough to warrant an expand/collapse toggle (> 120 chars or multiple lines)
  const isExpandable = textContent.length > 120 || (textContent.match(/\n/g) || []).length >= 2;

  return (
    <Card style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.cardHeader}>
        <FeatureIcon
          name={item.sourceType === 'image' ? 'calculator-outline' : 'document-text-outline'}
          tone="primary"
          size={40}
        />
        <View style={styles.cardHeaderCopy}>
          <AppText variant="headline" numberOfLines={1}>
            {item.title || 'Untitled equation scan'}
          </AppText>
          <View style={styles.metaRow}>
            <Badge label={typeLabel} tone={isLocal ? 'neutral' : 'primary'} />
            {item.questions?.length > 0 && (
              <Badge label={`${item.questions.length} Qs`} tone="neutral" icon="help-circle-outline" />
            )}
            <AppText variant="caption" color="muted" style={styles.date}>
              {formatDate(item.createdAt)}
            </AppText>
          </View>
        </View>
        <PressableScale
          accessibilityLabel={`Open ${item.title || 'scan'}`}
          onPress={onOpen}
          style={styles.openIconButton}
        >
          <Ionicons name="arrow-forward" size={16} color={C.primary} />
        </PressableScale>
      </View>

      {/* Snippet Container of Specific Size with Collapsible State */}
      <PressableScale
        accessibilityLabel={`View ${item.title || 'scan'}`}
        onPress={onOpen}
        style={[
          styles.snippetBox,
          expanded ? styles.snippetBoxExpanded : styles.snippetBoxCollapsed,
        ]}
      >
        <AppText
          numberOfLines={expanded ? undefined : 3}
          style={[styles.snippetText, item.latex ? styles.monospaceText : null]}
          selectable={expanded}
        >
          {preview}
        </AppText>
      </PressableScale>

      {/* Card Footer with Expand/Collapse & Workspace Navigation */}
      <View style={styles.cardFooter}>
        {isExpandable ? (
          <PressableScale
            accessibilityLabel={expanded ? 'Collapse content' : 'Show full content'}
            onPress={() => setExpanded(prev => !prev)}
            style={styles.expandToggle}
          >
            <AppText variant="caption" color="primary" style={styles.expandToggleText}>
              {expanded ? 'Collapse' : 'Show full content'}
            </AppText>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={C.primary}
            />
          </PressableScale>
        ) : (
          <View style={styles.emptySpacer} />
        )}

        <PressableScale
          accessibilityLabel={`Open ${item.title || 'scan'} in workspace`}
          onPress={onOpen}
          style={styles.workspaceLink}
        >
          <AppText variant="caption" color="inkSoft" style={styles.workspaceLinkText}>
            Open in Workspace
          </AppText>
          <Ionicons name="arrow-forward" size={13} color={C.primary} />
        </PressableScale>
      </View>
    </Card>
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
          <LibraryCard
            item={item}
            onOpen={() => navigation.navigate('Result', { scan: item })}
          />
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
    height: spacing.sm,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    marginLeft: 'auto',
    fontSize: 11,
  },
  openIconButton: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snippetBox: {
    borderRadius: radius.sm,
    backgroundColor: C.surfaceSecondary,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  snippetBoxCollapsed: {
    minHeight: 68,
    maxHeight: 76,
    justifyContent: 'center',
  },
  snippetBoxExpanded: {
    minHeight: 68,
    paddingVertical: spacing.sm,
  },
  snippetText: {
    fontSize: 13,
    lineHeight: 20,
    color: C.ink,
  },
  monospaceText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  emptySpacer: {
    flex: 1,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: C.primarySoft,
  },
  expandToggleText: {
    fontWeight: '600',
    fontSize: 12,
  },
  workspaceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  workspaceLinkText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loader: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
