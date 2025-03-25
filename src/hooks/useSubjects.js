// Hook to access subject information
export function useSubjects() {
  const context = useContext(SubjectContext);
  
  return {
    allSubjects: context.subjects,
    tomorrowSubjects: context.getTomorrowSubjects(),
    getSubjectColor: (subjectName) => {
      // Return color for a subject
    }
  };
}