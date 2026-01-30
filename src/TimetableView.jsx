import React from 'react';
import './App.css';

export const SCHEDULE_DATA = [
    {
        day: 'Mon',
        items: [
            { name: 'Data and Visual Analytics Lec', time: '9:00 - 10:20', room: 'A409', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'Discrete Mathematics Lab', time: '10:30 - 11:50', room: 'Lab 1: A409, Lab 2: A410', color: 'orange', start: 10 * 60 + 30, duration: 80 },
            { name: 'Minor', time: '12:00 - 12:50', room: 'A410', color: 'pink', start: 12 * 60, duration: 50 },
            { name: 'Lunch', time: '1:00 - 2:00', color: 'yellow', start: 13 * 60, duration: 60 },
            { name: 'Intro to Gen AI Lec', time: '2:00 - 3:20', room: 'C201', color: 'blue', start: 14 * 60, duration: 80 },
            { name: 'Discrete Mathematics Lec', time: '3:30 - 4:50', room: 'C201', color: 'orange', start: 15 * 60 + 30, duration: 80 },

        ]
    },
    {
        day: 'Tue',
        items: [
            { name: 'Data and Visual Analytics Lab', time: '9:00 - 10:20', room: 'C201 / C202', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'System Design Lecture', time: '10:30 - 11:50', room: 'C301', color: 'purple', start: 10 * 60 + 30, duration: 80 },
            { name: 'Minor', time: '12:00 - 12:50', room: 'A410', color: 'pink', start: 12 * 60, duration: 50 },
            { name: 'Lunch', time: '1:00 - 2:00', color: 'yellow', start: 13 * 60, duration: 60 },
            { name: 'Intro to Gen AI Lab', time: '2:00 - 3:20', room: 'A403 / A405', color: 'blue', start: 14 * 60, duration: 80 },
            { name: 'System Design Lab', time: '3:30 - 4:50', room: 'A403 / A405', color: 'purple', start: 15 * 60 + 30, duration: 80 },

        ]
    },
    {
        day: 'Wed',
        items: [
            { name: 'Data and Visual Analytics Lec', time: '9:00 - 10:20', room: 'A409', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'Discrete Mathematics Lab', time: '10:30 - 11:50', room: 'Lab 1: A409, Lab 2: A410', color: 'orange', start: 10 * 60 + 30, duration: 80 },
            { name: 'Lunch', time: '12:00 - 1:00', color: 'yellow', start: 12 * 60, duration: 60 },
            { name: 'Discrete Mathematics Lec', time: '1:30 - 2:50', room: 'C201', color: 'orange', start: 13 * 60 + 30, duration: 80 },
            { name: 'Intro to Gen AI Lec', time: '3:00 - 4:20', room: 'C201', color: 'blue', start: 15 * 60, duration: 80 },

        ]
    },
    {
        day: 'Thurs',
        items: [
            { name: 'Data and Visual Analytics Lab', time: '9:00 - 10:20', room: 'C201 / C202', color: 'green', start: 9 * 60, duration: 80 },
            { name: 'System Design Lecture', time: '10:30 - 11:50', room: 'C201', color: 'purple', start: 10 * 60 + 30, duration: 80 },
            { name: 'Intro to Gen AI Lab', time: '12:00 - 1:20', room: 'C201 / C202', color: 'blue', start: 12 * 60, duration: 80 },
            { name: 'Lunch', time: '1:20 - 2:00', color: 'yellow', start: 13 * 60 + 20, duration: 40 },
            { name: 'Minor', time: '2:30 - 3:20', room: 'A410', color: 'pink', start: 14 * 60 + 30, duration: 50 },
            { name: 'System Design Lab', time: '3:30 - 4:50', room: 'A501 / A502', color: 'purple', start: 15 * 60 + 30, duration: 80 },

        ]
    },
    {
        day: 'Fri',
        items: [
            { name: 'Contest', time: '9:00 AM - 12:00 PM', color: 'white', start: 9 * 60, duration: 180 },
            { name: 'Lunch', time: '12:00 - 1:00', color: 'yellow', start: 12 * 60, duration: 60 },
            { name: 'Minor', time: '2:30 - 3:20', room: 'A410', color: 'pink', start: 14 * 60 + 30, duration: 50 }
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

function TimetableView() {
    // Total mins from 9:00 to 18:30 (9.5 hours = 570 mins)
    const START_TIME = 9 * 60;
    const END_TIME = 18 * 60 + 30;
    const TOTAL_DURATION = END_TIME - START_TIME;

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
            <h2 className="timetable-title">Weekly Schedule</h2>
            <div className="timetable-wrapper">
                <div className="timetable-header">
                    <div className="day-col-header">Day</div>

                    <div className="timeline-header">
                        {TIME_SLOTS.map((slot, index) => {
                            // Approximate positions for the labels
                            // We'll just distribute them evenly-ish or use absolute positions if we want exact mapping,
                            // but a flex row is easier for checking.
                            // Actually, let's use the same scale logic for markers.
                            const [h, m] = slot.split(':').map(Number);
                            let mins = h * 60 + m;
                            if (h < 9) mins += 12 * 60; // handle PM if needed, but here 1:00 is 13:00 logic in data
                            if (h === 1) mins = 13 * 60 + m;
                            if (h === 2) mins = 14 * 60 + m;
                            if (h === 3) mins = 15 * 60 + m;
                            if (h === 4) mins = 16 * 60 + m;
                            if (h === 5) mins = 17 * 60 + m;
                            if (h === 6) mins = 18 * 60 + m;

                            // Note: The specific slots like 10:20 are tricky.
                            // Let's just use the visual labels from the image as a guide but position them evenly?
                            // The image has unequal columns. 9:00-9:30 is same visual width as 10:00-10:20? Maybe.
                            // Let's stick to true time scaling for accuracy.

                            const pos = ((mins - START_TIME) / TOTAL_DURATION) * 100;

                            // Don't render if out of bounds
                            if (pos < 0 || pos > 100) return null;

                            return (
                                <div
                                    key={slot}
                                    className="time-marker"
                                    style={{ left: `${pos}%` }}
                                >
                                    {slot}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="timetable-body">
                    {SCHEDULE_DATA.map((dayRow) => (
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
