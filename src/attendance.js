export function getAttendanceStats(lectures, meta, subjectName) {
  const baseline = meta?.myAttendanceBySubject?.[subjectName];
  if (!baseline) {
    return {
      attended: lectures.filter(task => task.present !== false).length,
      total: lectures.length
    };
  }

  const asOfDay = (meta.myAttendanceAsOf || '').slice(0, 10);
  const laterLectures = lectures.filter(task => task.date && task.date > asOfDay);
  return {
    attended: Number(baseline.attended) + laterLectures.filter(task => task.present !== false).length,
    total: Number(baseline.total) + laterLectures.length
  };
}
