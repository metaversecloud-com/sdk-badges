# Project Implementation Plan Template

Read `.ai/rules.md` first before starting implementation.

## 1. Project Overview

Allow admins to award badges to visitors currently in a world. Allow visitors to see the badges they've earned.(see Badges System in prompts.md)

## 2. Core User Flow

1. Click on a dropped asset in world to open this app in an iframe
2. View all badges (read only) - if the visitor has the badge in their inventory it should be in full color, otherwise it'll be grayscale

## 3. Core Admin Flow

1. If visitor isAdmin = true they can see a list of all visitors (displayName) actively in the world (worldActivity.currentVisitors) above the badges section
2. Admins can start typing a name into an input field and see the list filter accordingly
3. Clicking on a visitor selects that visitor, clicking on a badge selects that badge.
4. Once an Admin has selected a visitor and a badge an Award Badge button should be enabled. Clicking on the button opens a confirmation modal with the title Award {badgeName} to {displayName}? and in optional input filed where the admin can write a comment
5. Upon confirming the visitor should have the newly awarded badge added to their inventory and they should receive a toast notification (visitor.fireToast) with the title "You unlocked the {badgeName} badge!" and the text from admin's optional comments. Visitor receiving the badge should also see particle effects (visitor.triggerParticle)
6. Track awards in the admin's visitor data object by storing a list of profileIds for each visitor that's awarded a given badge

## 4. Technical Requirements

### Styling Guidelines

All client-side components MUST follow the comprehensive styling guide in `.ai/style-guide.md`.

Key requirements:

- Use SDK CSS classes for all UI elements
- Follow the component structure pattern in examples
- Use aliased imports and proper error handling
- Validate styling before submitting implementation

### Data Models

#### Visitor (Admin) Data Object

```typescript
interface VisitorDataObjectType {
  [badgeName]: string[];
}
```

Example output:

```ts
{
  "Hard Worker": ["profileId1","profileId2"],
  "Critical Thinker": ["profileId2","profileId4","profileId5"],
}
```
