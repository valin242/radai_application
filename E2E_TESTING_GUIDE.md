# End-to-End Testing Guide: Personalized Content Filtering

This guide walks you through manually testing the complete personalized content filtering feature from signup to episode generation.

## Prerequisites

- Backend server running (`npm run dev` in backend folder)
- Mobile app running (`npm start` in mobile folder)
- Database migrations applied
- Popular feeds seeded
- OpenAI API key configured

## Test Scenarios

### Scenario 1: New User Onboarding Flow

**Objective**: Verify a new user can complete onboarding and set up their preferences.

#### Steps:

1. **Sign Up**
   - Open the mobile app
   - Tap "Create Account"
   - Enter email: `test+onboarding@gmail.com`
   - Enter password: `TestPassword123!`
   - Tap "Create Account"
   - ✅ **Expected**: Account created successfully, redirected to onboarding

2. **Onboarding Step 1: Select Topics**
   - ✅ **Expected**: See list of topics (Technology, Finance, Entertainment, etc.)
   - Select at least 2 topics (e.g., "Technology" and "Finance")
   - ✅ **Expected**: Selected topics are highlighted
   - Try tapping "Next" without selecting any topics
   - ✅ **Expected**: Button is disabled or shows error
   - Select topics and tap "Next"
   - ✅ **Expected**: Progress to step 2

3. **Onboarding Step 2: Select Feeds**
   - ✅ **Expected**: See list of popular feeds with names, categories, descriptions
   - Select 2-3 popular feeds (e.g., "TechCrunch", "The Verge")
   - ✅ **Expected**: Selected feeds are highlighted
   - Tap "Next"
   - ✅ **Expected**: Progress to step 3

4. **Onboarding Step 3: Add Custom Feeds (Optional)**
   - ✅ **Expected**: See input field for custom RSS URLs
   - Add a custom feed URL: `https://feeds.arstechnica.com/arstechnica/index`
   - Tap the "+" button
   - ✅ **Expected**: URL appears in the list below
   - Try adding an invalid URL: `not-a-url`
   - ✅ **Expected**: Should still add (validation happens on backend)
   - Remove the invalid URL by tapping the X icon
   - ✅ **Expected**: URL is removed from list
   - Tap "Complete"
   - ✅ **Expected**: Loading indicator, then redirected to main app

5. **Verify Onboarding Completion**
   - ✅ **Expected**: See main app with Episodes, Feeds, Account, and Preferences tabs
   - ✅ **Expected**: No longer see onboarding screen on app restart

### Scenario 2: Preferences Management

**Objective**: Verify users can update their preferences after onboarding.

#### Steps:

1. **Navigate to Preferences**
   - Tap the "Preferences" tab (settings icon)
   - ✅ **Expected**: See preferences screen with sections:
     - Filtering Statistics (if any articles have been processed)
     - Your Topics
     - Custom Keywords
     - Relevance Threshold

2. **Update Topics**
   - ✅ **Expected**: Previously selected topics are highlighted
   - Tap to deselect one topic
   - ✅ **Expected**: Topic is deselected, API call made
   - Try to deselect all topics
   - ✅ **Expected**: Error message "You must select at least one topic"
   - Select a new topic
   - ✅ **Expected**: Topic is selected, API call made

3. **Add Custom Keywords**
   - Type "artificial intelligence" in the keyword input
   - Tap the "+" button or press Enter
   - ✅ **Expected**: Keyword appears as a chip below
   - Add another keyword: "blockchain"
   - ✅ **Expected**: Both keywords visible
   - Tap the X on "artificial intelligence"
   - ✅ **Expected**: Keyword is removed

4. **Adjust Relevance Threshold**
   - ✅ **Expected**: See slider with current value (default 80%)
   - Drag slider to 60%
   - ✅ **Expected**: Value updates, hint text changes
   - Drag slider to 90%
   - ✅ **Expected**: Value updates, hint text changes to "High threshold"
   - Release slider
   - ✅ **Expected**: API call made to save new threshold

5. **View Statistics (if available)**
   - ✅ **Expected**: If articles have been processed, see:
     - Total Articles
     - Included count
     - Filtered Out count
     - Inclusion Rate percentage

### Scenario 3: Feed Management

**Objective**: Verify users can manage their RSS feeds.

#### Steps:

1. **Navigate to Feeds**
   - Tap the "Feeds" tab
   - ✅ **Expected**: See list of feeds added during onboarding

2. **Add a New Feed**
   - Tap "Add Feed" or similar button
   - Enter URL: `https://www.theverge.com/rss/index.xml`
   - Tap "Add"
   - ✅ **Expected**: Feed appears in the list

3. **Remove a Feed**
   - Swipe or tap delete on a feed
   - Confirm deletion
   - ✅ **Expected**: Feed is removed from list

### Scenario 4: Content Filtering in Action

**Objective**: Verify that content filtering actually works when articles are fetched.

#### Steps:

1. **Trigger Article Fetch (Backend)**
   ```bash
   # In backend directory
   npx ts-node trigger-quick-episode.ts
   ```
   - ✅ **Expected**: Script fetches articles from user's feeds

2. **Check Filtering Statistics**
   - Go to Preferences tab in mobile app
   - Pull to refresh or reopen the screen
   - ✅ **Expected**: See updated statistics showing:
     - Total articles fetched
     - Number included (above threshold)
     - Number filtered out (below threshold)
     - Inclusion percentage

3. **Verify Episode Generation**
   - Go to Episodes tab
   - ✅ **Expected**: See new episode generated
   - Tap on the episode
   - ✅ **Expected**: Episode contains only articles that passed the filter

4. **Test Different Thresholds**
   - Go to Preferences
   - Set threshold to 50% (lower)
   - Trigger article fetch again
   - ✅ **Expected**: More articles included
   - Set threshold to 95% (higher)
   - Trigger article fetch again
   - ✅ **Expected**: Fewer articles included

### Scenario 5: Persistence and State Management

**Objective**: Verify data persists across app restarts and sessions.

#### Steps:

1. **Close and Reopen App**
   - Force close the mobile app
   - Reopen the app
   - ✅ **Expected**: User still logged in
   - ✅ **Expected**: No onboarding screen (already completed)
   - Go to Preferences
   - ✅ **Expected**: All preferences are still set correctly

2. **Logout and Login**
   - Go to Account tab
   - Tap "Sign Out"
   - ✅ **Expected**: Redirected to login screen
   - Log back in with same credentials
   - ✅ **Expected**: No onboarding screen
   - ✅ **Expected**: All preferences and feeds are still there

### Scenario 6: Error Handling

**Objective**: Verify the app handles errors gracefully.

#### Steps:

1. **Network Errors**
   - Turn off backend server
   - Try to update preferences
   - ✅ **Expected**: Error message displayed
   - ✅ **Expected**: App doesn't crash
   - Turn backend back on
   - Try again
   - ✅ **Expected**: Works normally

2. **Invalid Input**
   - Try to add an empty keyword
   - ✅ **Expected**: Button disabled or no action
   - Try to add a very long keyword (500+ characters)
   - ✅ **Expected**: Either truncated or error message

3. **Token Expiration**
   - Wait for token to expire (or manually expire it)
   - Try to fetch data
   - ✅ **Expected**: Redirected to login screen

## Backend API Testing

### Test Onboarding Endpoints

```bash
# Get topics
curl http://localhost:8000/onboarding/topics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get popular feeds
curl http://localhost:8000/onboarding/popular-feeds \
  -H "Authorization: Bearer YOUR_TOKEN"

# Complete onboarding
curl -X POST http://localhost:8000/onboarding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topics": ["Technology", "Finance"],
    "feedIds": ["feed-id-1", "feed-id-2"],
    "customFeedUrls": ["https://example.com/feed.xml"]
  }'

# Check onboarding status
curl http://localhost:8000/onboarding/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Preferences Endpoints

```bash
# Get preferences
curl http://localhost:8000/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update topics
curl -X PUT http://localhost:8000/preferences/topics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topics": ["Technology", "Science"]}'

# Add keyword
curl -X POST http://localhost:8000/preferences/keywords \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "machine learning"}'

# Remove keyword
curl -X DELETE http://localhost:8000/preferences/keywords/machine%20learning \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update threshold
curl -X PUT http://localhost:8000/preferences/threshold \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threshold": 75}'
```

### Test Statistics Endpoint

```bash
# Get filtering statistics
curl http://localhost:8000/statistics/filtering \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get statistics for specific time range
curl "http://localhost:8000/statistics/filtering?timeRange=last_7_days" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Verification

### Check User Preferences

```sql
-- View user preferences
SELECT 
  u.email,
  up.selected_topics,
  up.custom_keywords,
  up.relevance_threshold,
  up.onboarding_completed,
  up.created_at
FROM user_preferences up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'test+onboarding@example.com';
```

### Check Filtering Statistics

```sql
-- View filtering statistics
SELECT 
  u.email,
  fs.date,
  fs.included_articles,
  fs.filtered_out_articles,
  ROUND(fs.included_articles::numeric / 
    (fs.included_articles + fs.filtered_out_articles) * 100, 2) as inclusion_percentage
FROM filtering_statistics fs
JOIN users u ON u.id = fs.user_id
WHERE u.email = 'test+onboarding@example.com'
ORDER BY fs.date DESC;
```

### Check User Feeds

```sql
-- View user's feeds
SELECT 
  u.email,
  f.name,
  f.url,
  f.is_popular,
  f.category,
  f.created_at
FROM feeds f
JOIN users u ON u.id = f.user_id
WHERE u.email = 'test+onboarding@example.com';
```

## Performance Testing

### Test with Multiple Users

1. Create 10 test users
2. Complete onboarding for each with different preferences
3. Trigger article fetch for all users
4. Verify:
   - All users get filtered articles
   - Filtering completes in reasonable time (<5s per user)
   - Statistics are recorded correctly

### Test with Large Article Sets

1. Add feeds with many articles (100+)
2. Trigger article fetch
3. Verify:
   - Filtering completes without timeout
   - Memory usage is reasonable
   - Statistics are accurate

## Troubleshooting

### Onboarding Not Showing

- Check `onboarding_completed` flag in database
- Verify API endpoint returns correct status
- Check app navigation logic

### Filtering Not Working

- Verify OpenAI API key is set
- Check that embeddings are being generated
- Verify interest profile embedding exists in database
- Check filtering statistics to see if any articles are being processed

### Statistics Not Updating

- Verify article fetch is actually running
- Check that filtering is being applied
- Verify statistics are being recorded in database
- Check API endpoint returns correct data

## Success Criteria

✅ All test scenarios pass without errors
✅ Data persists correctly across sessions
✅ Filtering statistics show expected behavior
✅ Performance is acceptable (<3s for most operations)
✅ Error handling is graceful (no crashes)
✅ UI is responsive and intuitive

## Next Steps After Testing

1. Fix any bugs discovered during testing
2. Optimize performance bottlenecks
3. Add analytics tracking for user behavior
4. Consider A/B testing different default thresholds
5. Gather user feedback on filtering accuracy
6. Deploy to staging environment
7. Conduct beta testing with real users
