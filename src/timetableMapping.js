import { SCHEDULE_DATA, SEM5_SCHEDULE_DATA } from './TimetableView';

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

// Mapping for Semester 5
export const SEM5_LECTURE_TO_SUBJECT_MAP = {
    'Computer Networks Lec': 'CN Class',
    'Computer Networks Lab': 'CN Lab',
    'DBMS Lec': 'DBMS Class',
    'DBMS Lab': 'DBMS Lab',
    'Operating Systems Lec': 'OS Class',
    'Operating Systems Lab': 'OS Lab',
    'DAA Lecture': 'DAA Class',
    'DAA Lab': 'DAA Lab',
};

// Get all unique lecture names from the timetable (excluding non-academic items)
export const getAllLectureNames = (semester = '4') => {
    const lectureNames = new Set();
    const excludeKeywords = ['lunch', 'minor', 'contest'];
    const schedule = semester === '5' ? SEM5_SCHEDULE_DATA : SCHEDULE_DATA;

    schedule.forEach(day => {
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
export const getSubjectFromLecture = (lectureName, semester = '4') => {
    const map = semester === '5' ? SEM5_LECTURE_TO_SUBJECT_MAP : LECTURE_TO_SUBJECT_MAP;
    return map[lectureName] || null;
};

// Find matching lecture names based on partial input
export const findMatchingLectures = (input, semester = '4') => {
    if (!input || input.trim().length < 2) return [];

    const allLectures = getAllLectureNames(semester);
    const inputLower = input.toLowerCase();

    return allLectures.filter(lecture =>
        lecture.toLowerCase().includes(inputLower)
    );
};

// Check if a lecture name exactly matches a timetable entry
export const isExactTimetableLecture = (lectureName, semester = '4') => {
    const map = semester === '5' ? SEM5_LECTURE_TO_SUBJECT_MAP : LECTURE_TO_SUBJECT_MAP;
    return map.hasOwnProperty(lectureName);
};
