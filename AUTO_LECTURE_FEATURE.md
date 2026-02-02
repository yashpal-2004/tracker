# Auto-Lecture Creator Feature

## Overview
The Auto-Lecture Creator automatically adds lecture entries to your respective subjects when classes end, based on your timetable. This eliminates the need to manually create lecture entries after each class.

## How It Works

### 1. **Automatic Detection**
- The system checks your timetable every minute
- When a class ends, it automatically detects which lecture just finished
- It verifies that the lecture hasn't already been added for today

### 2. **Automatic Creation**
- Creates a new lecture entry in the correct subject
- Marks attendance as **present** by default (completion is OFF - you mark it done later)
- Assigns the correct lecture number automatically
- Adds an `autoCreated` flag so you can identify it

### 3. **Visual Indicators**
- **Home Dashboard**: Shows live status of current/next lectures and pending auto-creations
- **Subject Pages**: Auto-created lectures have a ✨ **Auto** badge
- **Real-time Updates**: Status updates every minute

## Features

### Live Lecture Status Widget (Home Page)
The widget shows:
- **In Progress**: Currently ongoing lecture with countdown to end
- **Up Next**: Next scheduled lecture with countdown to start
- **Auto-Creating**: Number of lectures waiting to be auto-created
- **Info Message**: Confirmation that the auto-creator is active

### Auto-Created Lecture Properties
When a lecture is auto-created, it has:
- ⏳ **Completed**: Marked as NOT done by default (you complete it after adding notes/links)
- ✅ **Present**: Attendance marked as present
- 📅 **Date**: Set to today's date
- 🔢 **Number**: Auto-assigned based on existing lectures
- ✨ **Badge**: Visual indicator showing it was auto-created

## Editing Auto-Created Lectures

You can edit any auto-created lecture just like a manual one:

1. **Click the Edit button** (pencil icon) on the lecture
2. **Update any field**:
   - Add lecture notes link
   - Add Notion URL
   - Change attendance status
   - Change completion status
   - Add important flag
3. **Save changes**

The ✨ Auto badge will remain to show it was originally auto-created.

## Timetable Mapping

The system uses `timetableMapping.js` to map timetable lecture names to subjects:

```javascript
'Data and Visual Analytics Lec' → 'DVA Class'
'Data and Visual Analytics Lab' → 'DVA Lab'
'Discrete Mathematics Lec' → 'DM Class'
'Discrete Mathematics Lab' → 'DM Lab'
'Intro to Gen AI Lec' → 'GenAI Class'
'Intro to Gen AI Lab' → 'GenAI Lab'
'System Design Lecture' → 'SD Class'
'System Design Lab' → 'SD Lab'
```

## What Gets Auto-Created

✅ **Included**:
- All regular lectures from your timetable
- Lab sessions

❌ **Excluded**:
- Lunch breaks
- Minor exams
- Contests

## Timing

- **Check Frequency**: Every 1 minute
- **Creation Trigger**: When current time >= lecture end time
- **Duplicate Prevention**: Checks if lecture already exists for today

## Benefits

1. **Time Saving**: No need to manually add lectures after each class
2. **Consistency**: All lectures are added with the same format
3. **Accuracy**: Uses your official timetable as source of truth
4. **Flexibility**: You can still edit everything after auto-creation
5. **Visibility**: Clear indicators show which lectures were auto-created

## Example Workflow

### Monday Morning:
1. **9:00 AM** - "Data and Visual Analytics Lec" starts
   - Widget shows: "In Progress: Data and Visual Analytics Lec"
   
2. **10:20 AM** - Class ends
   - System auto-creates lecture in "DVA Class" subject
   - Marks attendance as present (completion is OFF - you'll mark it done later)
   - Widget shows: "Auto-Creating: 1 Lecture Pending"

3. **10:30 AM** - "Discrete Mathematics Lab" starts
   - Widget shows: "In Progress: Discrete Mathematics Lab"
   - Previous lecture now visible in DVA Class with ✨ Auto badge

4. **Later** - You can edit the auto-created lecture
   - Add notes link from Google Drive
   - Add Notion URL for your notes
   - Change attendance if you were absent
   - Everything is editable!

## Troubleshooting

### Lecture not auto-created?
- Check if the lecture is in your timetable
- Verify the current time is past the lecture end time
- Check if a lecture with the same name already exists for today

### Wrong subject assigned?
- Check `timetableMapping.js` for the correct mapping
- The lecture name must exactly match the timetable entry

### Want to disable auto-creation?
- The feature runs automatically
- You can delete auto-created lectures if needed
- Or simply ignore them and create manual entries

## Technical Details

### Files Involved:
- `autoLectureCreator.js` - Core logic for detection and creation
- `App.jsx` - Integration and auto-creation effect
- `HomeDashboard.jsx` - Live status widget
- `timetableMapping.js` - Lecture name to subject mapping
- `TimetableView.jsx` - Timetable data source

### Key Functions:
- `getPendingLectures()` - Finds lectures that should be auto-created
- `getCurrentLecture()` - Gets the currently ongoing lecture
- `getNextLecture()` - Gets the next scheduled lecture

## Future Enhancements (Potential)

- Notification when lecture is auto-created
- Bulk edit for auto-created lectures
- Custom rules for auto-creation (e.g., don't mark as present by default)
- Integration with calendar apps
- Smart detection of makeup classes

---

**Note**: This feature is designed to save you time while maintaining full control. You can always edit, delete, or override any auto-created lecture!
