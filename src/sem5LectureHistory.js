const dates = (monthDays) => Object.entries(monthDays)
  .sort(([a], [b]) => Number(a) - Number(b))
  .flatMap(([month, days]) => days.map(day => `2026-${month}-${String(day).padStart(2, '0')}`));

const subjectHistory = [
  {
    subject: 'CN Class', name: 'Computer Networks Lec', byMonth: {
      '08': [10, 12, 17, 19, 24, 26, 31], '09': [2, 7, 9, 14, 16, 21, 23, 28, 30],
      '10': [5, 7, 21, 26, 28], '11': [2, 4]
    }
  },
  {
    subject: 'CN Lab', name: 'Computer Networks Lab', byMonth: {
      '08': [11, 13, 18, 20, 25, 27], '09': [1, 3, 8, 10, 15, 17, 22, 24, 29],
      '10': [1, 6, 8, 22, 27, 29], '11': [3]
    }
  },
  {
    subject: 'MCA Class', name: 'Modern Computer Architecture Lec', byMonth: {
      '08': [11, 13, 18, 20, 25, 27], '09': [1, 3, 8, 10, 15, 17, 22, 24, 29],
      '10': [1, 6, 8, 19, 22, 27, 29], '11': [3]
    }
  },
  {
    subject: 'MCA Lab', name: 'Modern Computer Architecture Lab', byMonth: {
      '08': [10, 12, 17, 19, 24, 26, 31], '09': [2, 7, 9, 14, 16, 21, 23, 28, 30],
      '10': [5, 7, 19, 21, 26, 28], '11': [2, 4]
    }
  },
  {
    subject: 'DL Class', name: 'Deep Learning Lec', byMonth: {
      '08': [10, 12, 17, 19, 24, 26, 31], '09': [2, 7, 9, 14, 16, 21, 23, 28, 30],
      '10': [5, 7, 19, 21, 26, 28], '11': [2, 4]
    }
  },
  {
    subject: 'DL Lab', name: 'Deep Learning Lab', byMonth: {
      '08': [11, 13, 18, 20, 25, 27], '09': [1, 3, 8, 10, 15, 17, 22, 24, 29],
      '10': [1, 6, 8, 22, 27, 29], '11': [3]
    }
  },
  {
    subject: 'AML Class', name: 'Advanced Machine Learning Lec', byMonth: {
      '08': [12, 17, 19, 24, 26, 31], '09': [2, 7, 9, 14, 16, 21, 23, 28, 30],
      '10': [5, 7, 19, 21], '11': [4]
    }
  },
  {
    subject: 'AML Lab', name: 'Advanced Machine Learning Lab', byMonth: {
      '08': [11, 13, 18, 20, 25, 27], '09': [1, 3, 8, 10, 15, 17, 22, 24, 29],
      '10': [1, 6, 8, 22], '11': [3, 5]
    }
  }
];

export const SEM5_LECTURE_HISTORY = subjectHistory.flatMap(({ subject, name, byMonth }) =>
  dates(byMonth).map(date => ({ subject, name, date }))
);

export const SEM5_LECTURE_HISTORY_TOTALS = Object.fromEntries(subjectHistory.map(({ subject, byMonth }) =>
  [subject, dates(byMonth).length]
));


const absentBySubject = {
  'CN Class': { '08': [24], '09': [14, 21, 23] },
  'CN Lab': { '08': [25], '09': [22] },
  'MCA Class': { '09': [22] },
  'MCA Lab': { '08': [24], '09': [14, 21, 23] },
  'DL Class': { '08': [24], '09': [14, 21, 23], '10': [26] },
  'DL Lab': { '09': [22] },
  'AML Class': { '08': [17, 24], '09': [9, 14, 21, 23, 30] },
  'AML Lab': { '09': [22, 24] }
};

export const SEM5_ABSENT_LECTURES = new Set(Object.entries(absentBySubject).flatMap(([subject, byMonth]) =>
  dates(byMonth).map(date => `${subject}|${date}`)
));
