import { SCHEDULE_DATA } from './TimetableView';
import { getSubjectFromLecture } from './timetableMapping';

/**
 * Auto Lecture Creator
 * Automatically creates lecture entries based on timetable when classes end
 */

// Get current day of week (0 = Sunday, 1 = Monday, etc.)
const getDayIndex = (date = new Date()) => {
    const day = date.getDay();
    // Map Sunday (0) to -1 (no classes), Monday (1) to 0, etc.
    return day === 0 ? -1 : day - 1;
};

// Get current time in minutes since midnight
const getCurrentTimeInMinutes = (date = new Date()) => {
    return date.getHours() * 60 + date.getMinutes();
};

// Get day name from index
const getDayName = (index) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri'];
    return days[index] || null;
};

/**
 * Get lectures that have ended but haven't been added yet
 * @param {Date} currentTime - Current time
 * @param {Array} existingTasks - All existing tasks from Firebase
 * @returns {Array} - Array of lectures to auto-create
 */
export const getPendingLectures = (currentTime = new Date(), existingTasks = []) => {
    const dayIndex = getDayIndex(currentTime);
    const currentMinutes = getCurrentTimeInMinutes(currentTime);
    const todayStr = currentTime.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    // Clean up old deleted lectures (older than 7 days) from localStorage
    const deletedLectures = JSON.parse(localStorage.getItem('deleted_lectures') || '{}');
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let cleaned = false;
    Object.keys(deletedLectures).forEach(key => {
        if (deletedLectures[key].deletedAt < sevenDaysAgo) {
            delete deletedLectures[key];
            cleaned = true;
        }
    });
    if (cleaned) {
        localStorage.setItem('deleted_lectures', JSON.stringify(deletedLectures));
    }

    // No classes on Sunday or Saturday
    if (dayIndex < 0 || dayIndex > 4) {
        return [];
    }

    const dayName = getDayName(dayIndex);
    const todaySchedule = SCHEDULE_DATA.find(d => d.day === dayName);

    if (!todaySchedule) {
        return [];
    }

    const pendingLectures = [];
    const excludeKeywords = ['lunch', 'minor', 'contest'];

    todaySchedule.items.forEach(item => {
        const nameLower = item.name.toLowerCase();
        const isExcluded = excludeKeywords.some(keyword => nameLower.includes(keyword));

        if (isExcluded) {
            return; // Skip non-academic items
        }

        const lectureEndTime = item.start + item.duration;

        // Check if lecture has ended
        if (currentMinutes >= lectureEndTime) {
            const subject = getSubjectFromLecture(item.name);

            if (!subject) {
                return;
            }

            // Check if this lecture already exists for today
            const alreadyExists = existingTasks.some(task =>
                task.type === 'lecture' &&
                task.subjectName === subject &&
                task.name === item.name &&
                task.date === todayStr
            );

            // Check if this lecture was manually deleted by the user
            const deletedKey = `${subject}_${item.name}_${todayStr}`;
            const deletedLectures = JSON.parse(localStorage.getItem('deleted_lectures') || '{}');
            const wasManuallyDeleted = deletedLectures[deletedKey] !== undefined;

            if (!alreadyExists && !wasManuallyDeleted) {
                pendingLectures.push({
                    name: item.name,
                    subject: subject,
                    time: item.time,
                    room: item.room,
                    date: todayStr,
                    endTime: lectureEndTime
                });
            }
        }
    });

    return pendingLectures;
};

/**
 * Get the next upcoming lecture
 * @param {Date} currentTime - Current time
 * @returns {Object|null} - Next lecture info or null
 */
export const getNextLecture = (currentTime = new Date()) => {
    const dayIndex = getDayIndex(currentTime);
    const currentMinutes = getCurrentTimeInMinutes(currentTime);

    // No classes on Sunday or Saturday
    if (dayIndex < 0 || dayIndex > 4) {
        return null;
    }

    const dayName = getDayName(dayIndex);
    const todaySchedule = SCHEDULE_DATA.find(d => d.day === dayName);

    if (!todaySchedule) {
        return null;
    }

    const excludeKeywords = ['lunch', 'minor', 'contest'];

    // Find the next lecture that hasn't started yet
    for (const item of todaySchedule.items) {
        const nameLower = item.name.toLowerCase();
        const isExcluded = excludeKeywords.some(keyword => nameLower.includes(keyword));

        if (isExcluded) {
            continue;
        }

        if (currentMinutes < item.start) {
            const subject = getSubjectFromLecture(item.name);
            return {
                name: item.name,
                subject: subject,
                time: item.time,
                room: item.room,
                startTime: item.start,
                minutesUntil: item.start - currentMinutes
            };
        }
    }

    return null; // No more lectures today
};

/**
 * Get currently ongoing lecture
 * @param {Date} currentTime - Current time
 * @returns {Object|null} - Current lecture info or null
 */
export const getCurrentLecture = (currentTime = new Date()) => {
    const dayIndex = getDayIndex(currentTime);
    const currentMinutes = getCurrentTimeInMinutes(currentTime);

    if (dayIndex < 0 || dayIndex > 4) {
        return null;
    }

    const dayName = getDayName(dayIndex);
    const todaySchedule = SCHEDULE_DATA.find(d => d.day === dayName);

    if (!todaySchedule) {
        return null;
    }

    const excludeKeywords = ['lunch', 'minor', 'contest'];

    for (const item of todaySchedule.items) {
        const nameLower = item.name.toLowerCase();
        const isExcluded = excludeKeywords.some(keyword => nameLower.includes(keyword));

        if (isExcluded) {
            continue;
        }

        const lectureEndTime = item.start + item.duration;

        if (currentMinutes >= item.start && currentMinutes < lectureEndTime) {
            const subject = getSubjectFromLecture(item.name);
            return {
                name: item.name,
                subject: subject,
                time: item.time,
                room: item.room,
                startTime: item.start,
                endTime: lectureEndTime,
                minutesRemaining: lectureEndTime - currentMinutes
            };
        }
    }

    return null;
};

/**
 * Format minutes to HH:MM
 */
export const formatMinutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
};
