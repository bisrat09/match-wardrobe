# Closy TestFlight Launch Checklist

## 🏗️ Build Status
- [ ] EAS build running (monitor at: [build URL will appear in terminal])
- [ ] Apple credentials configured
- [ ] Distribution certificate created
- [ ] Provisioning profile generated

## 🎨 Assets (Before TestFlight)
- [ ] App icon created (1024x1024 PNG)
- [ ] Splash screen updated with brand colors
- [ ] App Store screenshots prepared (optional for TestFlight)

## 📱 TestFlight Setup (After Build)
- [ ] Build uploaded to App Store Connect
- [ ] Export compliance answered
- [ ] Beta test information filled
- [ ] Internal testers added

## 🧪 Testing Plan
### Phase 1: Internal Testing (You + 2-3 people)
- [ ] Test on your device first
- [ ] Verify all permissions work
- [ ] Check offline mode
- [ ] Test outfit generation with 20+ items

### Phase 2: Friends & Family (10-20 people)
- [ ] Create TestFlight public link
- [ ] Prepare onboarding email
- [ ] Set up feedback collection

### Phase 3: Extended Beta (50+ people)
- [ ] Post in relevant communities
- [ ] Gather structured feedback
- [ ] Track crash reports

## 🐛 Known Issues to Fix
- [x] Images not showing in detail view (FIXED)
- [x] Similar outfit suggestions (FIXED)
- [ ] Add loading states for image uploads
- [ ] Improve error messages
- [ ] Add onboarding tutorial

## 📝 TestFlight Submission Info

### Beta App Description
"Closy is your AI-powered wardrobe assistant. Snap photos of your clothes, and get daily outfit suggestions based on weather and your style. Perfect for those 'what should I wear?' moments."

### What to Test
- Adding clothes to your digital closet
- Daily outfit suggestions
- Weather-based recommendations
- Marking items as worn/dirty
- Filtering by dress code

### Feedback Requested
- Is the app intuitive to use?
- Are outfit suggestions appropriate?
- Any crashes or bugs?
- Missing features you'd want?

## 🚀 Post-TestFlight Launch Plan

### Week 1
- Fix critical bugs
- Improve onboarding
- Polish UI animations

### Week 2
- Add most requested features
- Optimize performance
- Prepare App Store listing

### Week 3
- Final testing round
- App Store screenshots
- Submit for review

## 📊 Success Metrics
- [ ] 80% of testers add 10+ items
- [ ] 60% check app daily
- [ ] <1% crash rate
- [ ] 4+ star average feedback

## 🔄 Update Strategy
- **Hotfixes**: Use EAS Update (instant)
- **Features**: Weekly TestFlight builds
- **Major**: Bi-weekly App Store updates

## 📞 Support Setup
- Feedback email: [your-email]
- Discord/Slack channel (optional)
- FAQ document
- Known issues list

---

## Quick Commands
```bash
# Check build status
eas build:list --platform ios

# Submit to TestFlight
eas submit --platform ios --latest

# Push hotfix
eas update --branch production --message "Fix description"

# New build
eas build --platform ios --profile production --auto-submit
```