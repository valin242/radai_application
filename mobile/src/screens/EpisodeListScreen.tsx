import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApiCall } from '../hooks/useApiCall';
import { episodesApi, Episode } from '../utils/apiClient';
import { Card, PlayButton } from '../components';
import { colors, typography, spacing } from '../theme';

export default function EpisodeListScreen({ navigation }: any) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { makeApiCall, loading } = useApiCall();

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    const result = await makeApiCall(
      () => episodesApi.list(),
      { showExpiredAlert: true }
    );

    if (result) {
      console.log('Episodes loaded:', JSON.stringify(result.episodes, null, 2));
      setEpisodes(result.episodes);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEpisodes();
    setRefreshing(false);
  };

  const handleSelectEpisode = (episode: Episode) => {
    navigation.navigate('AudioPlayer', { episode });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const extractKeywords = (scriptText?: string): string => {
    if (!scriptText) return 'No preview available';
    
    // Extract first 120-150 characters as a preview
    const preview = scriptText.slice(0, 150).trim();
    const lastSpace = preview.lastIndexOf(' ');
    
    // Cut at last complete word
    return lastSpace > 100 ? preview.slice(0, lastSpace) + '...' : preview + '...';
  };

  const renderEpisodeItem = ({ item, index }: { item: Episode; index: number }) => (
    <TouchableOpacity
      onPress={() => handleSelectEpisode(item)}
      activeOpacity={0.9}
    >
      <Card style={index === 0 ? [styles.episodeCard, styles.featuredCard] : styles.episodeCard}>
        <View style={styles.episodeContent}>
          <View style={styles.episodeInfo}>
            <Text style={index === 0 ? [styles.episodeTitle, styles.featuredTitle] : styles.episodeTitle}>
              {index === 0 ? 'Your Morning Briefing' : 'Daily Briefing'}
            </Text>
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>{formatDate(item.created_at)}</Text>
              <View style={styles.dot} />
              <Text style={styles.metadataText}>{formatDuration(item.duration_minutes)}</Text>
              {item.articles && item.articles.length > 0 && (
                <>
                  <View style={styles.dot} />
                  <Text style={styles.metadataText}>{item.articles.length} articles</Text>
                </>
              )}
            </View>
            {item.articles && item.articles.length > 0 ? (
              <View style={styles.articleList}>
                {item.articles.slice(0, 3).map((article, idx) => (
                  <View key={idx} style={styles.articleItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.articleTitle} numberOfLines={1}>
                      {article.title}
                    </Text>
                  </View>
                ))}
                {item.articles.length > 3 && (
                  <Text style={styles.moreArticles}>
                    +{item.articles.length - 3} more
                  </Text>
                )}
              </View>
            ) : item.script_text ? (
              <Text style={styles.scriptPreview} numberOfLines={2}>
                {extractKeywords(item.script_text)}
              </Text>
            ) : null}
          </View>
          <PlayButton size="small" isPlaying={false} onPress={() => handleSelectEpisode(item)} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading && episodes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Briefings</Text>
      </View>

      <FlatList
        data={episodes}
        renderItem={renderEpisodeItem}
        keyExtractor={(item) => item.episode_id}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="radio-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.emptyText}>No episodes yet</Text>
            <Text style={styles.emptySubtext}>
              Episodes are generated daily from your RSS feeds
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text.primary,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  episodeCard: {
    marginBottom: spacing.md,
  },
  featuredCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.accent.primary + '20',
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  episodeInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  episodeTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  featuredTitle: {
    fontSize: 24,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.secondary,
    marginHorizontal: spacing.sm,
  },
  scriptPreview: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 20,
    opacity: 0.85,
  },
  articleList: {
    marginTop: spacing.md,
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bullet: {
    ...typography.body,
    color: colors.accent.primary,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  articleTitle: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  moreArticles: {
    ...typography.small,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.h2,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});
