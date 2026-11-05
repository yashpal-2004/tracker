export function isAttendanceRecorded(task) {
  return task.attendanceRecorded !== false && task.present !== null;
}

export function getAttendanceStats(lectures, meta, subjectName) {
  const recordedLectures = lectures.filter(isAttendanceRecorded);
  const baseline = meta?.myAttendanceBySubject?.[subjectName];
  if (!baseline) {
    return {
      attended: recordedLectures.filter(task => task.present !== false).length,
      total: recordedLectures.length
    };
  }

  const asOfDay = (meta.myAttendanceAsOf || '').slice(0, 10);
  const laterLectures = recordedLectures.filter(task => task.date && task.date > asOfDay);
  return {
    attended: Number(baseline.attended) + laterLectures.filter(task => task.present !== false).length,
    total: Number(baseline.total) + laterLectures.length
  };
}
