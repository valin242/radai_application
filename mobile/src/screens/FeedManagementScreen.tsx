import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApiCall } from '../hooks/useApiCall';
import { feedsApi, Feed, PopularFeed } from '../utils/apiClient';
import { Card, Button } from '../components';
import { colors, typography, spacing, borderRadius } from '../theme';

export default function FeedManagementScreen() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [popularFeeds, setPopularFeeds] = useState<PopularFeed[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showPopularFeeds, setShowPopularFeeds] = useState(false);
  const { makeApiCall, loading } = useApiCall();

  useEffect(() => {
    console.log('FeedManagementScreen mounted');
    loadFeeds();
    loadPopularFeeds();
  }, []);

  const loadFeeds = async () => {
    console.log('Loading feeds...');
    const result = await makeApiCall(
      () => feedsApi.list(),
      { showExpiredAlert: true }
    );

    console.log('Load feeds result:', result);
    if (result) {
      setFeeds(result.feeds);
    }
  };

  const loadPopularFeeds = async () => {
    console.log('Loading popular feeds...');
    const result = await makeApiCall(
      () => feedsApi.listPopular(),
      { showExpiredAlert: true }
    );

    console.log('Load popular feeds result:', result);
    if (result) {
      setPopularFeeds(result.feeds);
    }
  };

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid RSS feed URL');
      return;
    }

    try {
      new URL(newFeedUrl);
    } catch {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    console.log('Adding feed:', newFeedUrl);
    
    const result = await makeApiCall(
      () => feedsApi.add(newFeedUrl),
      { showExpiredAlert: true }
    );

    console.log('Add feed result:', result);

    if (result) {
      setNewFeedUrl('');
      await loadFeeds();
      Alert.alert('Success', 'Feed added successfully');
    } else {
      Alert.alert('Error', 'Failed to add feed. Check console for details.');
    }
  };

  const handleAddPopularFeed = async (feedUrl: string, feedName: string) => {
    console.log('Adding popular feed:', feedUrl);
    
    const result = await makeApiCall(
      () => feedsApi.add(feedUrl),
      { showExpiredAlert: true }
    );

    console.log('Add popular feed result:', result);

    if (result) {
      await loadFeeds();
      setShowPopularFeeds(false);
      Alert.alert('Success', `${feedName} added successfully`);
    } else {
      Alert.alert('Error', 'Failed to add feed. It may already be in your list.');
    }
  };

  const handleDeleteFeed = async (feedId: string, url: string) => {
    Alert.alert(
      'Delete Feed',
      `Remove ${url}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await makeApiCall(
              () => feedsApi.delete(feedId),
              { showExpiredAlert: true }
            );

            if (result) {
              await loadFeeds();
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeeds();
    setRefreshing(false);
  };

  const renderFeedItem = ({ item }: { item: Feed }) => (
    <Card style={styles.feedCard}>
      <View style={styles.feedContent}>
        <View style={styles.feedInfo}>
          <Text style={styles.feedUrl} numberOfLines={2}>
            {item.url}
          </Text>
          <Text style={styles.feedDate}>
            Added {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteFeed(item.feed_id, item.url)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.status.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderPopularFeedItem = ({ item }: { item: PopularFeed }) => {
    const isAdded = feeds.some(feed => feed.url === item.url);
    
    return (
      <Card style={styles.popularFeedCard}>
        <View style={styles.popularFeedContent}>
          <View style={styles.popularFeedInfo}>
            <Text style={styles.popularFeedName}>{item.name}</Text>
            <Text style={styles.popularFeedCategory}>{item.category.toUpperCase()}</Text>
            <Text style={styles.popularFeedDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, isAdded && styles.addButtonDisabled]}
            onPress={() => !isAdded && handleAddPopularFeed(item.url, item.name)}
            disabled={isAdded}
          >
            <Ionicons 
              name={isAdded ? "checkmark-circle" : "add-circle-outline"} 
              size={28} 
              color={isAdded ? colors.text.secondary : colors.accent.primary} 
            />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Feeds</Text>
      </View>

      <View style={styles.addFeedSection}>
        <Card style={styles.addFeedCard}>
          <Text style={styles.sectionTitle}>Add RSS Feed</Text>
          
          <View style={styles.popularFeedsButton}>
            <Button
              title="Browse Popular Feeds"
              onPress={() => setShowPopularFeeds(true)}
              fullWidth
            />
          </View>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Enter RSS feed URL"
            placeholderTextColor={colors.text.secondary}
            value={newFeedUrl}
            onChangeText={setNewFeedUrl}
            autoCapitalize="none"
            keyboardType="url"
            editable={!loading}
          />
          <Button
            title="Add Custom Feed"
            onPress={handleAddFeed}
            disabled={loading || !newFeedUrl.trim()}
            loading={loading}
            fullWidth
          />
        </Card>
      </View>

      {loading && feeds.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <View style={styles.feedsSection}>
          <Text style={styles.sectionTitle}>Your Feeds</Text>
          <FlatList
            data={feeds}
            renderItem={renderFeedItem}
            keyExtractor={(item) => item.feed_id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={64} color={colors.text.secondary} />
                <Text style={styles.emptyText}>No feeds added yet</Text>
                <Text style={styles.emptySubtext}>
                  Add your first RSS feed to get started
                </Text>
              </View>
            }
          />
        </View>
      )}

      <Modal
        visible={showPopularFeeds}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPopularFeeds(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Popular Feeds</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPopularFeeds(false)}
            >
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={popularFeeds}
            renderItem={renderPopularFeedItem}
            keyExtractor={(item) => item.feed_id}
            contentContainerStyle={styles.modalListContainer}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text.primary,
  },
  addFeedSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  addFeedCard: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  feedsSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  listContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  feedCard: {
    marginBottom: spacing.md,
  },
  feedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  feedUrl: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  feedDate: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  popularFeedsButton: {
    marginBottom: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginHorizontal: spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h1,
    color: colors.text.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalListContainer: {
    padding: spacing.lg,
  },
  popularFeedCard: {
    marginBottom: spacing.md,
  },
  popularFeedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  popularFeedInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  popularFeedName: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    fontSize: 18,
  },
  popularFeedCategory: {
    ...typography.caption,
    color: colors.accent.primary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  popularFeedDescription: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 13,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
});
