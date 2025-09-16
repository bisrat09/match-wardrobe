# Closy TestFlight Setup Guide

## 🎯 Prerequisites Checklist
- [ ] Apple Developer Program membership ($99/year)
- [ ] Xcode installed (for simulator testing)
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Logged into Expo: `eas login`

## 📱 Step 1: Apple Developer Setup

### 1.1 Create App ID in Apple Developer Portal
1. Go to https://developer.apple.com/account
2. Navigate to Certificates, Identifiers & Profiles → Identifiers
3. Click "+" to create new identifier
4. Select "App IDs" → "App"
5. Use bundle ID: `com.bisratbelayneh.closy`
6. Enable capabilities: Push Notifications (if needed later)

### 1.2 Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. My Apps → "+" → New App
3. Platform: iOS
4. Name: Closy
5. Primary Language: English (U.S.)
6. Bundle ID: Select `com.bisratbelayneh.closy`
7. SKU: `closy-2024` (or any unique identifier)

## 🔧 Step 2: Configure Credentials

### Update eas.json with your credentials:
```bash
# Find your Apple Team ID:
# Go to https://developer.apple.com/account → Membership → Team ID

# Update eas.json submit section with:
# - appleId: Your Apple ID email
# - ascAppId: The App Store Connect App ID (found in App Store Connect)
# - appleTeamId: Your Team ID from Apple Developer
```

## 🚀 Step 3: Build Commands

### First-time setup:
```bash
# Configure your iOS credentials (EAS will guide you)
eas credentials
```

### Build for TestFlight:
```bash
# Create a production build for TestFlight
eas build --platform ios --profile production

# Or if you want to test internally first:
eas build --platform ios --profile preview
```

### Monitor build progress:
```bash
# Check build status
eas build:list --platform ios --limit 5

# View build details
eas build:view [BUILD_ID]
```

## 📤 Step 4: Submit to TestFlight

### Automatic submission (recommended):
```bash
# Submit the latest build to TestFlight
eas submit --platform ios --latest --profile production

# Or submit a specific build
eas submit --platform ios --id [BUILD_ID]
```

### Manual submission:
1. Download the .ipa from Expo dashboard
2. Open Xcode → Window → Organizer
3. Drag the .ipa file
4. Click "Distribute App" → App Store Connect → Upload

## 🔄 Step 5: Iteration Workflow

### For minor updates (JS-only changes):
```bash
# Use EAS Update for instant OTA updates
eas update --branch production --message "Fix outfit algorithm"

# Users get the update next time they open the app
```

### For native changes or major updates:
```bash
# Increment version in app.json
# Build new version
eas build --platform ios --profile production --auto-submit
```

## 📊 Step 6: TestFlight Management

### In App Store Connect:
1. TestFlight tab → Select your build
2. Add missing compliance info (usually just export compliance)
3. Add internal testers (up to 100, instant access)
4. Add external testers (up to 10,000, requires review)
5. Share TestFlight link with testers

### TestFlight Beta Information:
- **Beta App Description**: "Closy helps you organize your wardrobe and get daily outfit suggestions based on weather and your style preferences."
- **Feedback Email**: your-email@example.com
- **Marketing URL**: Optional (your website/landing page)

## 🐛 Step 7: Monitoring & Debugging

### View crashes and feedback:
```bash
# Check EAS dashboard
eas build:list --status errored

# View TestFlight feedback in App Store Connect
# TestFlight → Feedback → View user reports
```

### Common issues and fixes:
- **Build fails**: Check `eas build:view` logs
- **Upload fails**: Verify bundle ID matches App Store Connect
- **TestFlight processing**: Can take 10-30 minutes
- **Missing compliance**: Add encryption exemption in app.json

## 📝 Step 8: Pre-Launch Checklist

### Before sending to testers:
- [ ] Test on physical device via TestFlight yourself
- [ ] Verify all permissions work (camera, photos, location)
- [ ] Check offline functionality
- [ ] Test on different iPhone models (via TestFlight)
- [ ] Prepare welcome email for testers with instructions

### Tester instructions template:
```
Welcome to Closy Beta!

1. Accept TestFlight invite on your iPhone
2. Download TestFlight app if needed
3. Install Closy from TestFlight
4. Allow camera, photos, and location permissions
5. Add 10-20 clothing items to start
6. Check daily for outfit suggestions

Please report bugs via TestFlight's "Send Feedback" feature.
```

## 🚢 Step 9: Production Release Workflow

### When ready for App Store:
1. Collect and implement TestFlight feedback
2. Update version to 1.0.0 in app.json
3. Build final production version
4. Submit for App Store review
5. Prepare App Store listing (screenshots, description, keywords)

## 💡 Pro Tips

### Speed up iteration:
- Use `preview` profile for internal testing (faster builds)
- Use EAS Update for JS-only changes between builds
- Set up CI/CD with GitHub Actions + EAS

### Build versioning strategy:
- `1.0.0` - Major.Minor.Patch for version
- Build number auto-increments with `autoIncrement: true`
- Use semantic versioning for clarity

### TestFlight best practices:
- Start with 5-10 internal testers (friends/family)
- Expand to 50-100 external testers after initial feedback
- Update testers weekly with new builds
- Include release notes with each build

## 📞 Support Resources

- EAS Build docs: https://docs.expo.dev/build/introduction/
- TestFlight docs: https://developer.apple.com/testflight/
- Expo Discord: https://chat.expo.dev
- Common EAS errors: https://docs.expo.dev/build-reference/troubleshooting/

---

## Quick Command Reference

```bash
# Login to EAS
eas login

# Configure credentials
eas credentials

# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest

# Push OTA update
eas update --branch production --message "Update message"

# Check build status
eas build:list --platform ios --limit 5
```