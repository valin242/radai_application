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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Button } from '../components';
import { preferencesApi, onboardingApi, statisticsApi } from '../utils/apiClient';

interface Topic {
  id: string;
  name: string;
  description: string;
}

export default function PreferencesScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // User preferences
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [relevanceThreshold, setRelevanceThreshold] = useState(80);
  const [newKeyword, setNewKeyword] = useState('');
  
  // Statistics
  const [stats, setStats] = useState<any>({
    totalArticles: 0,
    includedArticles: 0,
    filteredOutArticles: 0,
    inclusionPercentage: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [topicsData, prefsData, statsData] = await Promise.all([
        onboardingApi.getTopics(),
        preferencesApi.get(),
        statisticsApi.getFiltering().catch(() => null),
      ]);
      
      setTopics(topicsData.topics);
      setSelectedTopics(prefsData.selectedTopics || []);
      setCustomKeywords(prefsData.customKeywords || []);
      setRelevanceThreshold(prefsData.relevanceThreshold || 80);
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      Alert.alert('Error', 'Failed to load preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = async (topicId: string) => {
    const currentTopics = selectedTopics || [];
    const newTopics = currentTopics.includes(topicId)
      ? currentTopics.filter((id) => id !== topicId)
      : [...currentTopics, topicId];
    
    if (newTopics.length === 0) {
      Alert.alert('Error', 'You must select at least one topic');
      return;
    }

    try {
      setSaving(true);
      await preferencesApi.updateTopics(newTopics);
      setSelectedTopics(newTopics);
    } catch (error) {
      console.error('Failed to update topics:', error);
      Alert.alert('Error', 'Failed to update topics. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    
    try {
      setSaving(true);
      await preferencesApi.addKeyword(newKeyword.trim());
      setCustomKeywords([...customKeywords, newKeyword.trim()]);
      setNewKeyword('');
    } catch (error) {
      console.error('Failed to add keyword:', error);
      Alert.alert('Error', 'Failed to add keyword. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeKeyword = async (keyword: string) => {
    try {
      setSaving(true);
      await preferencesApi.removeKeyword(keyword);
      setCustomKeywords(customKeywords.filter((k) => k !== keyword));
    } catch (error) {
      console.error('Failed to remove keyword:', error);
      Alert.alert('Error', 'Failed to remove keyword. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateThreshold = async (value: number) => {
    try {
      await preferencesApi.updateThreshold(Math.round(value));
      setRelevanceThreshold(Math.round(value));
    } catch (error) {
      console.error('Failed to update threshold:', error);
      Alert.alert('Error', 'Failed to update threshold. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics Section */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filtering Statistics</Text>
            {stats.totalArticles === 0 ? (
              <View style={styles.statsCard}>
                <Text style={styles.noStatsText}>
                  No articles processed yet. Run the episode generation script to see statistics.
                </Text>
              </View>
            ) : (
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Articles</Text>
                  <Text style={styles.statValue}>{stats.totalArticles}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Included</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.includedArticles}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Filtered Out</Text>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    {stats.filteredOutArticles}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Inclusion Rate</Text>
                  <Text style={styles.statValue}>
                    {stats.inclusionPercentage != null ? stats.inclusionPercentage.toFixed(1) : '0.0'}%
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Topics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Topics</Text>
          <Text style={styles.sectionDescription}>
            Select topics that interest you
          </Text>
          <View style={styles.topicsGrid}>
            {topics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicChip,
                  selectedTopics?.includes(topic.id) && styles.topicChipSelected,
                ]}
                onPress={() => toggleTopic(topic.id)}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.topicChipText,
                    selectedTopics?.includes(topic.id) && styles.topicChipTextSelected,
                  ]}
                >
                  {topic.name}
                </Text>
                {selectedTopics?.includes(topic.id) && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Keywords Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Keywords</Text>
          <Text style={styles.sectionDescription}>
            Add specific keywords to refine your content
          </Text>
          <View style={styles.keywordInput}>
            <TextInput
              style={styles.input}
              placeholder="Add a keyword..."
              placeholderTextColor={colors.text.secondary}
              value={newKeyword}
              onChangeText={setNewKeyword}
              onSubmitEditing={addKeyword}
              editable={!saving}
            />
            <TouchableOpacity
              style={[styles.addButton, (!newKeyword.trim() || saving) && styles.addButtonDisabled]}
              onPress={addKeyword}
              disabled={!newKeyword.trim() || saving}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          {customKeywords.length > 0 && (
            <View style={styles.keywordsList}>
              {customKeywords.map((keyword, index) => (
                <View key={index} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                  <TouchableOpacity
                    onPress={() => removeKeyword(keyword)}
                    disabled={saving}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Relevance Threshold Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relevance Threshold</Text>
          <Text style={styles.sectionDescription}>
            Adjust how strict the content filtering should be
          </Text>
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>More Content</Text>
              <Text style={styles.sliderValue}>{relevanceThreshold}%</Text>
              <Text style={styles.sliderLabel}>More Relevant</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={relevanceThreshold}
              onValueChange={setRelevanceThreshold}
              onSlidingComplete={updateThreshold}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={styles.sliderHint}>
              {relevanceThreshold < 50
                ? 'Low threshold - includes more articles'
                : relevanceThreshold < 80
                ? 'Balanced - good mix of quantity and relevance'
                : 'High threshold - only highly relevant articles'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: 50,
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
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  statsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  statValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  noStatsText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  topicChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background.tertiary,
  },
  topicChipText: {
    ...typography.body,
    color: colors.text.primary,
  },
  topicChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  keywordInput: {
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
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  keywordText: {
    ...typography.body,
    color: colors.text.primary,
  },
  sliderContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sliderLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  sliderValue: {
    ...typography.h2,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
