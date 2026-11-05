import React from 'react';
import './App.css';

export const SCHEDULE_DATA = [
    {
        day: 'Mon',
        items: [
            { name: 'Data and Visual Analytics Lec', time: '9:00 AM - 10:20 AM', room: 'A409', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'Discrete Mathematics Lab', time: '10:30 AM - 11:50 AM', room: 'Lab 1: A409, Lab 2: A410', color: 'orange', start: 10 * 60 + 30, duration: 80 },
            { name: 'Minor', time: '12:00 PM - 12:50 PM', room: 'A410', color: 'pink', start: 12 * 60, duration: 50 },
            { name: 'Lunch', time: '1:00 PM - 2:00 PM', color: 'yellow', start: 13 * 60, duration: 60 },
            { name: 'Intro to Gen AI Lec', time: '2:00 PM - 3:20 PM', room: 'C201', color: 'blue', start: 14 * 60, duration: 80 },
            { name: 'Discrete Mathematics Lec', time: '3:30 PM - 4:50 PM', room: 'C201', color: 'orange', start: 15 * 60 + 30, duration: 80 },

        ]
    },
    {
        day: 'Tue',
        items: [
            { name: 'Data and Visual Analytics Lab', time: '9:00 AM - 10:20 AM', room: 'C201 / C202', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'System Design Lecture', time: '10:30 AM - 11:50 AM', room: 'C301', color: 'purple', start: 10 * 60 + 30, duration: 80 },
            { name: 'Minor', time: '12:00 PM - 12:50 PM', room: 'A410', color: 'pink', start: 12 * 60, duration: 50 },
            { name: 'Lunch', time: '1:00 PM - 2:00 PM', color: 'yellow', start: 13 * 60, duration: 60 },
            { name: 'Intro to Gen AI Lab', time: '2:00 PM - 3:20 PM', room: 'A403 / A405', color: 'blue', start: 14 * 60, duration: 80 },
            { name: 'System Design Lab', time: '3:30 PM - 4:50 PM', room: 'A403 / A405', color: 'purple', start: 15 * 60 + 30, duration: 80 },

        ]
    },
    {
        day: 'Wed',
        items: [
            { name: 'Data and Visual Analytics Lec', time: '9:00 AM - 10:20 AM', room: 'A409', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'Discrete Mathematics Lab', time: '10:30 AM - 11:50 AM', room: 'Lab 1: A409, Lab 2: A410', color: 'orange', start: 10 * 60 + 30, duration: 80 },
            { name: 'Lunch', time: '12:00 PM - 1:00 PM', color: 'yellow', start: 12 * 60, duration: 60 },
            { name: 'Intro to Gen AI Lec', time: '1:30 PM - 2:50 PM', room: 'C201', color: 'orange', start: 13 * 60 + 30, duration: 80 },
            { name: 'Discrete Mathematics Lec', time: '3:00 PM - 4:20 PM', room: 'C201', color: 'blue', start: 15 * 60, duration: 80 },

        ]
    },
    {
        day: 'Thurs',
        items: [
            { name: 'Data and Visual Analytics Lab', time: '9:00 AM - 10:20 AM', room: 'C201 / C202', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'System Design Lecture', time: '10:30 AM - 11:50 AM', room: 'C201', color: 'purple', start: 10 * 60 + 30, duration: 80 },
            { name: 'Intro to Gen AI Lab', time: '12:00 PM - 1:20 PM', room: 'C201 / C202', color: 'blue', start: 12 * 60, duration: 80 },
            { name: 'Lunch', time: '1:20 PM - 2:00 PM', color: 'yellow', start: 13 * 60 + 20, duration: 40 },
            { name: 'Minor', time: '2:30 PM - 3:20 PM', room: 'A410', color: 'pink', start: 14 * 60 + 30, duration: 50 },
            { name: 'System Design Lab', time: '4:30 PM - 5:50 PM', room: 'A501 / A502', color: 'purple', start: 16 * 60 + 30, duration: 80 },

        ]
    },
    {
        day: 'Fri',
        items: [
            { name: 'Contest', time: '9:00 AM - 12:00 PM', color: 'white', start: 9 * 60, duration: 180 },
            { name: 'Lunch', time: '12:00 PM - 1:00 PM', color: 'yellow', start: 12 * 60, duration: 60 },
            { name: 'Minor', time: '2:30 PM - 3:20 PM', room: 'A410', color: 'pink', start: 14 * 60 + 30, duration: 50 }
        ]
    }
];

export const SEM5_SCHEDULE_DATA = [
    {
        day: 'Mon',
        items: [
            { name: 'Advanced Machine Learning Lec', time: '8:40 AM - 10:00 AM', room: 'A409', color: 'purple', start: 8 * 60 + 40, duration: 80 },
            { name: 'Entrepreneurship - 1 (SBG)', time: '10:10 AM - 11:10 AM', room: 'C104', color: 'pink', start: 10 * 60 + 10, duration: 60 },
            { name: 'Entrepreneurship - 2 (CGE)', time: '11:20 AM - 12:20 PM', room: 'A410', color: 'pink', start: 11 * 60 + 20, duration: 60 },
            { name: 'Lunch Break', time: '12:30 PM - 1:30 PM', room: 'Dining Hall', color: 'yellow', start: 12 * 60 + 30, duration: 60 },
            { name: 'Deep Learning Lec', time: '1:30 PM - 2:50 PM', room: 'A409', color: 'green', start: 13 * 60 + 30, duration: 80 },
            { name: 'Modern Computer Architecture Lab', time: '2:55 PM - 4:15 PM', room: 'A409', color: 'orange', start: 14 * 60 + 55, duration: 80 },
            { name: 'Computer Networks Lec', time: '4:20 PM - 5:30 PM', room: 'A409', color: 'blue', start: 16 * 60 + 20, duration: 70 },
            { name: 'Evening Snacks Break', time: '5:30 PM - 6:00 PM', room: 'Cafeteria', color: 'yellow', start: 17 * 60 + 30, duration: 30 }
        ]
    },
    {
        day: 'Tue',
        items: [
            { name: 'Computer Networks Lab', time: '8:40 AM - 10:00 AM', room: 'A409', color: 'blue', start: 8 * 60 + 40, duration: 80 },
            { name: 'Entrepreneurship - 1 (SBG)', time: '10:10 AM - 11:10 AM', room: 'C104', color: 'pink', start: 10 * 60 + 10, duration: 60 },
            { name: 'Entrepreneurship - 2 (CGE)', time: '11:20 AM - 12:20 PM', room: 'A410', color: 'pink', start: 11 * 60 + 20, duration: 60 },
            { name: 'Lunch Break', time: '12:30 PM - 1:30 PM', room: 'Dining Hall', color: 'yellow', start: 12 * 60 + 30, duration: 60 },
            { name: 'Deep Learning Lab', time: '1:30 PM - 2:50 PM', room: 'Lab 2: A405', color: 'green', start: 13 * 60 + 30, duration: 80 },
            { name: 'Advanced Machine Learning Lab', time: '2:55 PM - 4:15 PM', room: 'Lab 2: A405', color: 'purple', start: 14 * 60 + 55, duration: 80 },
            { name: 'Modern Computer Architecture Lec', time: '4:20 PM - 5:30 PM', room: 'A409', color: 'orange', start: 16 * 60 + 20, duration: 70 },
            { name: 'Evening Snacks Break', time: '5:30 PM - 6:00 PM', room: 'Cafeteria', color: 'yellow', start: 17 * 60 + 30, duration: 30 }
        ]
    },
    {
        day: 'Wed',
        items: [
            { name: 'Advanced Machine Learning Lec', time: '8:40 AM - 10:00 AM', room: 'A409', color: 'purple', start: 8 * 60 + 40, duration: 80 },
            { name: 'Entrepreneurship - 1 (SBG)', time: '10:10 AM - 11:10 AM', room: 'C104', color: 'pink', start: 10 * 60 + 10, duration: 60 },
            { name: 'Entrepreneurship - 2 (CGE)', time: '11:20 AM - 12:20 PM', room: 'A410', color: 'pink', start: 11 * 60 + 20, duration: 60 },
            { name: 'Lunch Break', time: '12:30 PM - 1:30 PM', room: 'Dining Hall', color: 'yellow', start: 12 * 60 + 30, duration: 60 },
            { name: 'Deep Learning Lec', time: '1:30 PM - 2:50 PM', room: 'A409', color: 'green', start: 13 * 60 + 30, duration: 80 },
            { name: 'Modern Computer Architecture Lab', time: '2:55 PM - 4:15 PM', room: 'A409', color: 'orange', start: 14 * 60 + 55, duration: 80 },
            { name: 'Computer Networks Lec', time: '4:20 PM - 5:30 PM', room: 'A409', color: 'blue', start: 16 * 60 + 20, duration: 70 },
            { name: 'Evening Snacks Break', time: '5:30 PM - 6:00 PM', room: 'Cafeteria', color: 'yellow', start: 17 * 60 + 30, duration: 30 }
        ]
    },
    {
        day: 'Thurs',
        items: [
            { name: 'Advanced Machine Learning Lab', time: '8:40 AM - 10:00 AM', room: 'Lab 2: A502', color: 'purple', start: 8 * 60 + 40, duration: 80 },
            { name: 'Entrepreneurship - 1 (SBG)', time: '10:10 AM - 11:10 AM', room: 'C104', color: 'pink', start: 10 * 60 + 10, duration: 60 },
            { name: 'Entrepreneurship - 2 (CGE)', time: '11:20 AM - 12:20 PM', room: 'A410', color: 'pink', start: 11 * 60 + 20, duration: 60 },
            { name: 'Lunch Break', time: '12:30 PM - 1:30 PM', room: 'Dining Hall', color: 'yellow', start: 12 * 60 + 30, duration: 60 },
            { name: 'Computer Networks Lab', time: '1:30 PM - 2:50 PM', room: 'A409', color: 'blue', start: 13 * 60 + 30, duration: 80 },
            { name: 'Deep Learning Lab', time: '2:55 PM - 4:15 PM', room: 'Lab 2: A405', color: 'green', start: 14 * 60 + 55, duration: 80 },
            { name: 'Modern Computer Architecture Lec', time: '4:20 PM - 5:30 PM', room: 'A409', color: 'orange', start: 16 * 60 + 20, duration: 70 },
            { name: 'Evening Snacks Break', time: '5:30 PM - 6:00 PM', room: 'Cafeteria', color: 'yellow', start: 17 * 60 + 30, duration: 30 }
        ]
    },
    {
        day: 'Fri',
        items: [
            { name: 'Lunch Break', time: '12:30 PM - 1:30 PM', room: 'Dining Hall', color: 'yellow', start: 12 * 60 + 30, duration: 60 },
            { name: 'Assessment: Contests, Internals, Quizzes & Mock Interviews', time: '1:30 PM - 2:50 PM', room: 'Campus Lab / Testing Hall', color: 'orange', start: 13 * 60 + 30, duration: 80 },
            { name: 'Contest continues', time: '2:55 PM - 4:15 PM', color: 'white', start: 14 * 60 + 55, duration: 80 },
            { name: 'Evening Snacks Break', time: '5:30 PM - 6:00 PM', room: 'Cafeteria', color: 'yellow', start: 17 * 60 + 30, duration: 30 }
        ]
    }
];

export const COLORS = {
    green: { bg: '#d1fae5', border: '#10b981', text: '#064e3b' },
    orange: { bg: '#ffedd5', border: '#f97316', text: '#7c2d12' },
    pink: { bg: '#fce7f3', border: '#ec4899', text: '#831843' },
    yellow: { bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
    blue: { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
    purple: { bg: '#ede9fe', border: '#8b5cf6', text: '#4c1d95' },
    white: { bg: '#ffffff', border: '#e2e8f0', text: '#1e293b' }
};

const TIME_SLOTS = [
    '9:00', '9:30', '10:00', '10:20', '10:30', '11:00', '11:30', '11:50',
    '12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30',
    '4:00', '4:30', '5:00', '5:30', '6:00', '6:30'
];

function TimetableView({ activeSemester = '4' }) {
    const activeSchedule = activeSemester === '5' ? SEM5_SCHEDULE_DATA : SCHEDULE_DATA;
    const isSemester5 = activeSemester === '5';
    const START_TIME = isSemester5 ? 8 * 60 + 40 : 9 * 60;
    const END_TIME = isSemester5 ? 18 * 60 : 18 * 60 + 30;
    const TOTAL_DURATION = END_TIME - START_TIME;
    const timeMarkers = isSemester5
        ? [
            { label: '08:40', mins: 8 * 60 + 40 }, { label: '10:10', mins: 10 * 60 + 10 },
            { label: '11:20', mins: 11 * 60 + 20 }, { label: '12:30', mins: 12 * 60 + 30 },
            { label: '01:30', mins: 13 * 60 + 30 }, { label: '02:55', mins: 14 * 60 + 55 },
            { label: '04:20', mins: 16 * 60 + 20 }, { label: '05:30', mins: 17 * 60 + 30 },
            { label: '06:00', mins: 18 * 60 }
        ]
        : TIME_SLOTS.map(slot => {
            const [hour, minute] = slot.split(':').map(Number);
            const mins = hour < 9 ? (hour + 12) * 60 + minute : hour * 60 + minute;
            return { label: `${slot} ${hour >= 9 && hour < 12 ? 'AM' : 'PM'}`, mins };
        });

    const getPositionStyle = (start, duration) => {
        const startPercent = ((start - START_TIME) / TOTAL_DURATION) * 100;
        const widthPercent = (duration / TOTAL_DURATION) * 100;
        return {
            left: `${startPercent}%`,
            width: `${widthPercent}%`
        };
    };

    return (
        <div className="timetable-container glass">
            <h2 className="timetable-title">Weekly Schedule ({activeSemester === '5' ? 'Semester 5' : 'Semester 4'})</h2>
            <div className="timetable-wrapper">
                <div className="timetable-header">
                    <div className="day-col-header">Day</div>

                    <div className="timeline-header">
                        {timeMarkers.map(({ label, mins }) => {
                            const pos = ((mins - START_TIME) / TOTAL_DURATION) * 100;
                            if (pos < 0 || pos > 100) return null;
                            return (
                                <div
                                    key={label}
                                    className="time-marker"
                                    style={{ left: `${pos}%` }}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="timetable-body">
                    {activeSchedule.map((dayRow) => (
                        <div key={dayRow.day} className="timetable-row">
                            <div className="day-col">{dayRow.day}</div>

                            <div className="events-track">
                                {/* Grid lines for hours */}
                                {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                                    <div
                                        key={h}
                                        className="grid-line"
                                        style={{ left: `${((h * 60 - START_TIME) / TOTAL_DURATION) * 100}%` }}
                                    />
                                ))}

                                {dayRow.items.map((item, i) => {
                                    const style = getPositionStyle(item.start, item.duration);
                                    const color = COLORS[item.color];
                                    return (
                                        <div
                                            key={i}
                                            className="event-block"
                                            style={{
                                                ...style,
                                                backgroundColor: color.bg,
                                                borderLeft: `3px solid ${color.border}`,
                                                color: color.text
                                            }}
                                        >
                                            <div className="event-name">{item.name}</div>
                                            <div className="event-meta">
                                                <span className="event-room">{item.room}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default TimetableView;
