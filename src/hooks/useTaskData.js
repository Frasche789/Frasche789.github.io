// Hook to access and filter task data
import { useContext, useMemo } from 'react';
import { TaskContext } from '../context/TaskContext';
import { useSubjects } from './useSubjects';

export function useTaskData() {
    // Get tasks and subjects data from context and hooks
    const { tasks, loading: tasksLoading, error: tasksError, completeTask, uncompleteTask } = useContext(TaskContext);
    const { tomorrowSubjects, todaySubjects, allSubjects, isLoading: subjectsLoading, error: subjectsError } = useSubjects();
    
    // Derived loading and error states
    const isLoading = tasksLoading || subjectsLoading;
    const error = tasksError || subjectsError;
    
    // Memoize filtered tasks to prevent recalculations on re-renders
    const filteredTasks = useMemo(() => {
        // If still loading or error, return empty arrays
        if (isLoading || error || !tasks.length) {
            return {
                todayTasks: [],
                todayClassTasks: [],
                tomorrowTasks: [],
                futureTasks: [],
                completedTasks: [],
                archiveTasks: []
            };
        }
        
        // Date calculations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        // Filter completed tasks and sort by date_added or due_date
        const completedTasks = tasks
            .filter(task => task.completed)
            .sort((a, b) => {
                const aDate = a.date_added ? new Date(a.date_added) : (a.due_date ? new Date(a.due_date) : new Date(0));
                const bDate = b.date_added ? new Date(b.date_added) : (b.due_date ? new Date(b.due_date) : new Date(0));
                return aDate - bDate; // Oldest first
            });
        
        // Filter tasks with past due dates for archive
        const archiveTasks = tasks.filter(task => {
            if (task.completed) return false;
            
            if (!task.due_date) return false;
            
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            return dueDate.getTime() < today.getTime();
        }).sort((a, b) => {
            const aDate = a.date_added ? new Date(a.date_added) : (a.due_date ? new Date(a.due_date) : new Date(0));
            const bDate = b.date_added ? new Date(b.date_added) : (b.due_date ? new Date(b.due_date) : new Date(0));
            return aDate - bDate; // Oldest first
        });
        
        // Helper function to check if a task is an exam
        const isExam = (task) => {
            // Check if task type is exam or if task title/description contains exam-related keywords
            return task.type === 'exam' || 
                  (task.title && task.title.toLowerCase().includes('exam')) 
        };
        
        // Filter tasks for today (including exams due today)
        const todayTasks = tasks.filter(task => {
            if (task.completed) return false;
            
            if (!task.due_date) return false;
            
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            return dueDate.getTime() === today.getTime();
        }).sort((a, b) => {
            const aDate = a.date_added ? new Date(a.date_added) : (a.due_date ? new Date(a.due_date) : new Date(0));
            const bDate = b.date_added ? new Date(b.date_added) : (b.due_date ? new Date(b.due_date) : new Date(0));
            return aDate - bDate; // Oldest first
        });

        // Get subject IDs for today to filter today's class tasks
        const todaySubjectIds = todaySubjects.map(subject => subject.id);
        const todaySubjectNames = todaySubjects
            .map(subject => subject.name?.toLowerCase())
            .filter(Boolean);
            
        // Filter tasks for today's classes (non-exam homework for classes today)
        const todayClassTasks = tasks.filter(task => {
            // Skip completed tasks
            if (task.completed) return false;
            
            // Skip exams (they're handled separately)
            const taskIsExam = isExam(task);
            if (taskIsExam) return false;
            
            // Skip tasks with past due dates
            if (task.due_date) {
                const dueDate = new Date(task.due_date);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate.getTime() < today.getTime()) return false;
            }
            
            // If no subject field, can't match
            if (!task.subject) return false;
            
            // Convert to lowercase string for comparison
            const taskSubject = String(task.subject).toLowerCase();
            
            // Check if matches by ID
            const matchesById = todaySubjectIds.includes(task.subject);
            
            // Check if matches by name
            const matchesByName = todaySubjectNames.some(name => 
                taskSubject.includes(name) || name.includes(taskSubject)
            );
            
            return matchesById || matchesByName;
        }).sort((a, b) => {
            const aDate = a.date_added ? new Date(a.date_added) : (a.due_date ? new Date(a.due_date) : new Date(0));
            const bDate = b.date_added ? new Date(b.date_added) : (b.due_date ? new Date(b.due_date) : new Date(0));
            return aDate - bDate; // Oldest first
        });
        
        // Get subject IDs for tomorrow to filter tomorrow's tasks
        const tomorrowSubjectIds = tomorrowSubjects.map(subject => subject.id);
        const tomorrowSubjectNames = tomorrowSubjects
            .map(subject => subject.name?.toLowerCase())
            .filter(Boolean);
        
        // Filter tasks for tomorrow - separate handling for exams and regular tasks
        const tomorrowTasks = tasks.filter(task => {
            // Skip completed tasks
            if (task.completed) return false;
            
            // Check if it's an exam
            const taskIsExam = isExam(task);
            
            // FIRST CHECK: Is this task specifically due tomorrow? If yes, include it regardless of subject
            if (task.due_date) {
                const dueDate = new Date(task.due_date);
                dueDate.setHours(0, 0, 0, 0);
                
                if (dueDate.getTime() === tomorrow.getTime()) {
                    return true; // Include ALL tasks due tomorrow (regardless of type or subject)
                }
                
                // Skip tasks with past due dates (they go to archive)
                if (dueDate.getTime() < today.getTime()) return false;
            }
            
            // For exams that aren't due tomorrow, skip them (they're handled elsewhere)
            if (taskIsExam) return false;
            
            // SECOND CHECK: For non-exam tasks, also include if they're for tomorrow's classes
            
            // If no subject field, can't match
            if (!task.subject) return false;
            
            // Convert to lowercase string for comparison
            const taskSubject = String(task.subject).toLowerCase();
            
            // Check if matches by ID
            const matchesById = tomorrowSubjectIds.includes(task.subject);
            
            // Check if matches by name
            const matchesByName = tomorrowSubjectNames.some(name => 
                taskSubject.includes(name) || name.includes(taskSubject)
            );
            
            return matchesById || matchesByName;
        }).sort((a, b) => {
            const aDate = a.date_added ? new Date(a.date_added) : (a.due_date ? new Date(a.due_date) : new Date(0));
            const bDate = b.date_added ? new Date(b.date_added) : (b.due_date ? new Date(b.due_date) : new Date(0));
            return aDate - bDate; // Oldest first
        });
        
        // Filter tasks for future days
        const futureTasks = tasks.filter(task => {
            if (task.completed) return false;
            
            // Calculate a task's ID to check against today and tomorrow tasks
            const taskId = task.id;
            const isInTodayTasks = todayTasks.some(t => t.id === taskId);
            const isInTomorrowTasks = tomorrowTasks.some(t => t.id === taskId);
            
            // Skip if this task is already in today or tomorrow tasks
            if (isInTodayTasks || isInTomorrowTasks) return false;
            
            // For tasks without due dates, include them in "upcoming" if they don't qualify for today/tomorrow
            if (!task.due_date) {
                // Only include non-exam tasks without due dates
                return !isExam(task); 
            }
            
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            // For exams, check if due date is after tomorrow
            if (isExam(task)) {
                return dueDate.getTime() > tomorrow.getTime();
            }
            
            // For non-exam tasks, check if due date is day after tomorrow or later
            return dueDate.getTime() >= dayAfterTomorrow.getTime();
        }).sort((a, b) => {
            const aDate = a.date_added ? new Date(a.date_added) : (a.due_date ? new Date(a.due_date) : new Date(0));
            const bDate = b.date_added ? new Date(b.date_added) : (b.due_date ? new Date(b.due_date) : new Date(0));
            return aDate - bDate; // Oldest first
        });
        
        return {
            todayTasks,
            todayClassTasks,
            tomorrowTasks,
            futureTasks,
            completedTasks,
            archiveTasks
        };
    }, [tasks, todaySubjects, tomorrowSubjects, isLoading, error]);
    
    // Return the filtered tasks and loading states
    return {
        ...filteredTasks,
        isLoading,
        error,
        completeTask,
        uncompleteTask
    };
}