# SDK Badges

Award and display ecosystem badges to visitors in a Topia world.

## Introduction / Summary

This app allows admins to award badges to visitors currently in a world. Visitors can view all available badges, with earned badges shown in full color and unearned badges displayed in grayscale. Built with the [Topia JavaScript SDK](https://metaversecloud-com.github.io/mc-sdk-js/index.html).

## Key Features

### Canvas elements & interactions

- Key Asset: When clicked, this asset opens the drawer displaying the badges UI.

### Visitor view

- Badge grid showing all ecosystem badges
- Earned badges appear in full color; unearned badges are grayscale

### Admin features

- Searchable list of all non-admin visitors currently in the world
- Select a visitor and a badge, then click "Award Badge"
- Confirmation modal with optional comment before awarding
- Success animation banner on award
- Recipients receive a toast notification and confetti particle effects in-world
- Awards are tracked in the admin's visitor data object

## Data Objects

### Visitor (Admin)

Stored on the admin's visitor data object to track which badges they have awarded and to whom.

```ts
{
  awardHistory: {
    "Hard Worker": ["profileId1", "profileId2"],
    "Critical Thinker": ["profileId2", "profileId4", "profileId5"]
  }
}
```

## API Endpoints

| Method | Endpoint           | Description                                              |
| ------ | ------------------ | -------------------------------------------------------- |
| GET    | `/api/game-state`  | Returns badges, visitor inventory, and current visitors   |
| POST   | `/api/award-badge` | Awards a badge to a visitor (admin only)                 |

### POST `/api/award-badge` body

```json
{
  "recipientVisitorId": 456,
  "recipientProfileId": "abc123",
  "recipientDisplayName": "Player1",
  "badgeName": "Hard Worker",
  "comment": "Great job today!"
}
```

## Implementation Requirements

### Required Assets with Unique Names

The app uses the following unique name patterns for managing dropped assets:

| Unique Name Pattern | Description |
| ------------------- | ----------- |
| `Badges_keyAsset`   | Key asset   |

## Environment Variables

Create a `.env` file in the root directory. See `.env-example` for a template.

| Variable             | Description                                                                        | Required |
| -------------------- | ---------------------------------------------------------------------------------- | -------- |
| `INSTANCE_DOMAIN`    | Topia API domain (`api.topia.io` for production, `api-stage.topia.io` for staging) | Yes      |
| `INSTANCE_PROTOCOL`  | API protocol (`https`)                                                             | Yes      |
| `INTERACTIVE_KEY`    | Topia interactive app key                                                          | Yes      |
| `INTERACTIVE_SECRET` | Topia interactive app secret                                                       | Yes      |

## Developers

### Built With

#### Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

#### Server

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-%23000000.svg?style=for-the-badge&logo=express&logoColor=white)

### Styling Requirements

This project uses the Topia SDK's CSS classes for consistent styling. See `.ai/style-guide.md` for complete requirements and examples.

### Getting Started

1. Clone this repository
2. Run `npm i` in the root directory
3. Run `npm i` in `client/`
4. Run `npm i` in `server/`
5. Add your `.env` file (see above)
6. Run `npm run dev` from the root to start both client and server

### Where to find INTERACTIVE_KEY and INTERACTIVE_SECRET

- [Topia Dev Account Dashboard](https://dev.topia.io/t/dashboard/integrations)
- [Topia Production Account Dashboard](https://topia.io/t/dashboard/integrations)

### Helpful links

- [SDK Developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
