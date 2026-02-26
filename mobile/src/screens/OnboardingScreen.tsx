import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Button } from '../components';
import { onboardingApi, PopularFeed } from '../utils/apiClient';

interface Topic {
  id: string;
  name: string;
  description: string;
}

export default function OnboardingScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [popularFeeds, setPopularFeeds] = useState<PopularFeed[]>([]);
  
  // User selections
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>([]);
  const [customFeedUrl, setCustomFeedUrl] = useState('');
  const [customFeedUrls, setCustomFeedUrls] = useState<string[]>([]);

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      const [topicsData, feedsData] = await Promise.all([
        onboardingApi.getTopics(),
        onboardingApi.getPopularFeeds(),
      ]);
      setTopics(topicsData.topics);
      setPopularFeeds(feedsData.feeds);
    } catch (error) {
      console.error('Failed to load onboarding data:', error);
      alert('Failed to load onboarding data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const toggleFeed = (feedId: string) => {
    setSelectedFeedIds((prev) =>
      prev.includes(feedId)
        ? prev.filter((id) => id !== feedId)
        : [...prev, feedId]
    );
  };

  const addCustomFeed = () => {
    if (customFeedUrl.trim()) {
      setCustomFeedUrls((prev) => [...prev, customFeedUrl.trim()]);
      setCustomFeedUrl('');
    }
  };

  const removeCustomFeed = (url: string) => {
    setCustomFeedUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleComplete = async () => {
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    try {
      setLoading(true);
      await onboardingApi.complete({
        topics: selectedTopics,
        feedIds: selectedFeedIds.length > 0 ? selectedFeedIds : undefined,
        customFeedUrls: customFeedUrls.length > 0 ? customFeedUrls : undefined,
      });
      
      console.log('Onboarding completed successfully! Reloading app...');
      // The app will automatically redirect after the status check completes
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return selectedTopics.length > 0;
    return true;
  };

  if (loading && topics.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to RadiAi</Text>
        <Text style={styles.subtitle}>
          Step {step} of 3: {step === 1 ? 'Choose Topics' : step === 2 ? 'Select Feeds' : 'Add Custom Feeds'}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>What are you interested in?</Text>
            <Text style={styles.sectionDescription}>
              Select at least one topic to personalize your content
            </Text>
            <View style={styles.topicsGrid}>
              {topics.map((topic) => (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    selectedTopics.includes(topic.id) && styles.topicCardSelected,
                  ]}
                  onPress={() => toggleTopic(topic.id)}
                >
                  <View style={styles.topicHeader}>
                    <Text style={[
                      styles.topicName,
                      selectedTopics.includes(topic.id) && styles.topicNameSelected,
                    ]}>
                      {topic.name}
                    </Text>
                    {selectedTopics.includes(topic.id) && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.topicDescription}>{topic.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Choose Your Sources</Text>
            <Text style={styles.sectionDescription}>
              Select popular feeds or skip to add your own
            </Text>
            <View style={styles.feedsList}>
              {popularFeeds.map((feed) => (
                <TouchableOpacity
                  key={feed.feed_id}
                  style={[
                    styles.feedCard,
                    selectedFeedIds.includes(feed.feed_id) && styles.feedCardSelected,
                  ]}
                  onPress={() => toggleFeed(feed.feed_id)}
                >
                  <View style={styles.feedHeader}>
                    <View style={styles.feedInfo}>
                      <Text style={[
                        styles.feedName,
                        selectedFeedIds.includes(feed.feed_id) && styles.feedNameSelected,
                      ]}>
                        {feed.name}
                      </Text>
                      <Text style={styles.feedCategory}>{feed.category}</Text>
                    </View>
                    {selectedFeedIds.includes(feed.feed_id) && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </View>
                  <Text style={styles.feedDescription}>{feed.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Add Custom RSS Feeds</Text>
            <Text style={styles.sectionDescription}>
              Optional: Add your own RSS feed URLs
            </Text>
            <View style={styles.customFeedInput}>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor={colors.text.secondary}
                value={customFeedUrl}
                onChangeText={setCustomFeedUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.addButton, !customFeedUrl.trim() && styles.addButtonDisabled]}
                onPress={addCustomFeed}
                disabled={!customFeedUrl.trim()}
              >
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            {customFeedUrls.length > 0 && (
              <View style={styles.customFeedsList}>
                {customFeedUrls.map((url, index) => (
                  <View key={index} style={styles.customFeedItem}>
                    <Text style={styles.customFeedUrl} numberOfLines={1}>
                      {url}
                    </Text>
                    <TouchableOpacity onPress={() => removeCustomFeed(url)}>
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {step > 1 && (
            <Button
              title="Back"
              onPress={() => setStep(step - 1)}
              variant="ghost"
              disabled={loading}
              style={styles.backButton}
            />
          )}
          {step < 3 ? (
            <Button
              title="Next"
              onPress={() => setStep(step + 1)}
              disabled={!canProceed() || loading}
              style={styles.nextButton}
            />
          ) : (
            <Button
              title="Complete"
              onPress={handleComplete}
              disabled={!canProceed() || loading}
              loading={loading}
              style={styles.nextButton}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  header: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  topicsGrid: {
    gap: spacing.md,
  },
  topicCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topicCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.tertiary,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  topicNameSelected: {
    color: colors.primary,
  },
  topicDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  feedsList: {
    gap: spacing.md,
  },
  feedCard: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  feedCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.tertiary,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  feedInfo: {
    flex: 1,
  },
  feedName: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  feedNameSelected: {
    color: colors.primary,
  },
  feedCategory: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  feedDescription: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  customFeedInput: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  customFeedsList: {
    gap: spacing.sm,
  },
  customFeedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  customFeedUrl: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
