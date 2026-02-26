# RadiAi UI Design System

## Overview
RadiAi features a modern, premium mobile UI designed for an AI-powered personalized news radio app. The design emphasizes intelligence, calm, trustworthiness, and editorial credibility.

## Design Philosophy
- **Intelligent**: Clean, purposeful design decisions
- **Calm**: Generous spacing, subtle animations
- **Trustworthy**: News-grade credibility, professional aesthetics
- **Minimal**: Focus on content, not decoration
- **Editorial**: Bloomberg Terminal minimalism meets Apple Podcasts clarity

## Color System

### Dark Mode (Primary)
```typescript
Primary Background: #0F172A (Deep Navy)
Secondary Background: #1E293B (Slate)
Card Background: #1E293B
Primary Accent: #3B82F6 (Muted Blue)
Secondary Accent: #22D3EE (Soft Cyan)
Text Primary: #F1F5F9 (Off-white)
Text Secondary: #94A3B8 (Cool Gray)
Dividers: #334155 (Subtle slate)
```

### Light Mode (Optional)
```typescript
Background: #F8FAFC
Cards: #FFFFFF
Text: #0F172A
Accent: #3B82F6 (same)
```

## Typography

### Font Family
- Inter, SF Pro, or system default
- Clean, modern sans-serif

### Hierarchy
```typescript
H1 (Episode title): 32px, bold, -0.5 letter-spacing
H2 (Section headers): 22px, semibold, -0.3 letter-spacing
Body: 16px, regular, 24px line-height
Caption: 14px, medium, 20px line-height
Small: 13px, regular, 18px line-height
```

## Spacing System
```typescript
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

## Border Radius
```typescript
sm: 8px
md: 12px
lg: 16px (cards)
full: 9999px (buttons)
```

## Components

### Card
- Background: Slate (#1E293B)
- Border radius: 16px
- Padding: 24px
- Subtle elevation for depth

### PlayButton
- Circular, accent blue (#3B82F6)
- Sizes: small (48px), medium (64px), large (80px)
- Soft shadow with accent glow
- Smooth press animation

### Button
- Variants: primary, secondary, ghost
- Sizes: small, medium, large
- Border radius: 12px
- Loading state support

### Waveform
- Animated bars during playback
- Accent blue (#3B82F6)
- 40 bars, subtle opacity
- Smooth, calm animation

### ProgressBar
- Track: Subtle slate border (#334155)
- Fill: Accent blue (#3B82F6)
- Height: 4px
- Seekable with touch

## Screens

### Episode List Screen
- Large header: "Your Briefings"
- Featured card for latest episode
- Play button on each card
- Metadata: date, duration
- Settings icon in header

### Audio Player Screen
- Centered title
- Waveform visualization
- Large play button
- Skip controls (15s back, 30s forward)
- Playback speed control
- Progress bar with timestamps

### Feed Management Screen
- Add feed card at top
- List of feeds with delete option
- Clean, dashboard-like layout
- Minimal iconography

### Login/Signup Screens
- Centered logo: "RadiAi"
- Tagline below logo
- Clean input fields
- Primary CTA button
- Ghost button for alternate action

## Interaction Design

### Animations
- Subtle fade transitions
- Smooth card expansion
- Gentle waveform animation
- No bouncy or playful effects

### Micro-interactions
- Precise button feedback
- Intentional state changes
- Professional feel

## What to Avoid
- Bright gradients
- Overuse of icons
- Social feed layouts
- Comment-thread UI
- Overly colorful tags
- News ticker visuals
- Neon colors
- Gamified design

## Emotional Target
User should feel: "I'm informed, calm, and ahead of the day."
Not: "Overstimulated by headlines."

## Implementation

All components are located in:
- `mobile/src/components/` - Reusable UI components
- `mobile/src/theme/` - Design tokens (colors, typography, spacing)
- `mobile/src/screens/` - Screen implementations

### Usage Example
```typescript
import { Card, PlayButton, Button } from '../components';
import { colors, typography, spacing } from '../theme';

<Card style={{ marginBottom: spacing.md }}>
  <Text style={{ ...typography.h2, color: colors.text.primary }}>
    Your Morning Briefing
  </Text>
  <PlayButton size="large" isPlaying={false} onPress={handlePlay} />
</Card>
```

## Future Enhancements
- Light mode toggle
- Custom font loading (Inter)
- Haptic feedback
- Advanced waveform visualization
- AI question modal (Pro feature)
