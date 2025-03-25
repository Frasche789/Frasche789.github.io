// Manages subject data and schedule information
export const SubjectContext = React.createContext();

export function SubjectProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState({});
  
  // Load subjects and schedule data
  useEffect(() => {
    // Fetch from Firebase
  }, []);
  
  const getTomorrowSubjects = () => {
    // Return subjects for tomorrow based on schedule
  };
  
  return (
    <SubjectContext.Provider value={{
      subjects,
      schedule, 
      getTomorrowSubjects
    }}>
      {children}
    </SubjectContext.Provider>
  );
}