import { SCHEDULE_DATA } from './TimetableView';

// Mapping from timetable lecture names to subject names
export const LECTURE_TO_SUBJECT_MAP = {
    'Data and Visual Analytics Lec': 'DVA Class',
    'Data and Visual Analytics Lab': 'DVA Lab',
    'Discrete Mathematics Lab': 'DM Lab',
    'Discrete Mathematics Lec': 'DM Class',
    'Intro to Gen AI Lec': 'GenAI Class',
    'Intro to Gen AI Lab': 'GenAI Lab',
    'System Design Lecture': 'SD Class',
    'System Design Lab': 'SD Lab',
};

// Get all unique lecture names from the timetable (excluding non-academic items)
export const getAllLectureNames = () => {
    const lectureNames = new Set();
    const excludeKeywords = ['lunch', 'minor', 'contest'];

    SCHEDULE_DATA.forEach(day => {
        day.items.forEach(item => {
            const nameLower = item.name.toLowerCase();
            const isExcluded = excludeKeywords.some(keyword => nameLower.includes(keyword));
            if (!isExcluded) {
                lectureNames.add(item.name);
            }
        });
    });

    return Array.from(lectureNames).sort();
};

// Get subject name from lecture name
export const getSubjectFromLecture = (lectureName) => {
    return LECTURE_TO_SUBJECT_MAP[lectureName] || null;
};

// Find matching lecture names based on partial input
export const findMatchingLectures = (input) => {
    if (!input || input.trim().length < 2) return [];

    const allLectures = getAllLectureNames();
    const inputLower = input.toLowerCase();

    return allLectures.filter(lecture =>
        lecture.toLowerCase().includes(inputLower)
    );
};

// Check if a lecture name exactly matches a timetable entry
export const isExactTimetableLecture = (lectureName) => {
    return LECTURE_TO_SUBJECT_MAP.hasOwnProperty(lectureName);
};
