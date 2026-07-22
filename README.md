# Cow-ntdown

Cow-themed **one-minute timer** for Android and iPhone (Expo / React Native).

A side project of [Cows in Space](https://github.com/SmoothDragon/CowsInSpace).

Tap **Start** → “ready / set / go” cow moos + **60s** countdown → one long **mooooooo** when time is up. **Pause** / **Resume** and **Reset** while running.

Uses **Expo SDK 54** so it matches the App Store / Play Store [Expo Go](https://expo.dev/go) app.

## Requirements

- **Node.js ≥ 20.19.4** (22 recommended). Node 18 will crash Expo.
- Phone with **Expo Go** updated from the store, **or** a browser for local web

## Run (phone via Expo Go)

```bash
git clone https://github.com/SmoothDragon/cow-ntdown.git
cd cow-ntdown
npm install
# Node 22 via fnm (recommended):
#   export PATH="$HOME/.local/share/fnm:$PATH" && eval "$(fnm env)" && fnm use
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

Share with friends on another network:

```bash
npx expo start --tunnel
```

## Run in a browser (no phone)

```bash
npx expo start --web
```

## Sounds

Bundled under `assets/sounds/` — real farm cow recordings (see [`assets/sounds/SOURCES.md`](assets/sounds/SOURCES.md)):

| File | Role |
|------|------|
| `start.mp3` | Three real moos — ready / set / go (crossfaded) |
| `moo.mp3` | One long mooooooo at 0:00 |

Turn phone **media** volume up (not just ringer).

## Branding

Full-screen flying cow (`assets/flying-cow-fullbody.png`) behind the timer, with light type over the dark space scene.

## Store builds (Android)

EAS is configured for Android. After logging in (`npx eas-cli login`):

```bash
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile production
```

Play Console listing, privacy policy URL, and a Google Play developer account are still required before the app is public. iOS is deferred.
