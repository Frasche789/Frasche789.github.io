/**
 * useTaskData.js
 * 
 * ⚠️ DEPRECATED: This hook is maintained for backward compatibility only.
 * New components should use useContainerTasks instead.
 * 
 * Migration timeline: This hook will be maintained until October 2025.
 * After that date, it will be removed and all components must use useContainerTasks.
 * 
 * Migration path:
 * 1. Import useContainerTasks and CONTAINER_TYPE from './useContainerTasks'
 * 2. Replace useTaskData() with useContainerTasks(CONTAINER_TYPE.CURRENT)
 * 3. Access container-specific tasks via the tasks property
 * 
 * Example:
 * Before: const { todayTasks, tomorrowTasks } = useTaskData();
 * After: const { tasks } = useContainerTasks(CONTAINER_TYPE.CURRENT);
 */
import { useContext, useMemo } from 'react';
import { TaskContext } from '../context/TaskContext';
import { useContainerTasks, CONTAINER_TYPE } from './useContainerTasks';
import { useRuleContext } from './useRuleContext';
import * as P from '../rules/predicates';
import * as ContainerRules from '../rules/containerRules';

export function useTaskData() {
    // Display deprecation warning in development environment
    if (process.env.NODE_ENV === 'development') {
        console.warn(
            '⚠️ DEPRECATED: useTaskData is deprecated and will be removed in October 2025. ' +
            'Use useContainerTasks instead. See useTaskData.js for migration instructions.'
        );
    }
    
    // Get tasks and task operations from TaskContext
    const { tasks, loading: tasksLoading, error: tasksError, completeTask, uncompleteTask } = useContext(TaskContext);
    
    // Get rule context data for filtering
    const { 
        todaySubjects, 
        tomorrowSubjects, 
        isLoading: contextLoading, 
        error: contextError 
    } = useRuleContext();
    
    // Use the new container hooks - we'll use their filtered results to build our legacy return object
    const currentContainer = useContainerTasks(CONTAINER_TYPE.CURRENT);
    const futureContainer = useContainerTasks(CONTAINER_TYPE.FUTURE);
    const archiveContainer = useContainerTasks(CONTAINER_TYPE.ARCHIVE);
    const examContainer = useContainerTasks(CONTAINER_TYPE.EXAM);
    
    // Combined loading and error states
    const isLoading = tasksLoading || contextLoading || 
                     currentContainer.isLoading || 
                     futureContainer.isLoading || 
                     archiveContainer.isLoading;
    
    const error = tasksError || contextError || 
                 currentContainer.error || 
                 futureContainer.error || 
                 archiveContainer.error;
    
    // Memoize filtered tasks to prevent recalculations on re-renders
    // This now primarily uses results from the container hooks, but applies
    // additional filtering for the legacy task categories
    const filteredTasks = useMemo(() => {
        // If still loading or error, return empty arrays
        if (isLoading || error || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return {
                todayTasks: [],
                todayClassTasks: [],
                tomorrowTasks: [],
                futureTasks: [],
                completedTasks: [],
                archiveTasks: []
            };
        }
        
        // Get today's tasks specifically (due today, not completed)
        const todayRule = P.matchesAll([P.isDueToday, P.isNotCompleted]);
        const todayTasks = ContainerRules.applyRule(tasks, todayRule);
        
        // Get today's class tasks (for today's classes, not completed, not an exam)
        const todayClassRule = P.matchesAll([
            P.forTodaysClasses(todaySubjects),
            P.isNotCompleted,
            P.not(P.isOverdue),
            P.isNotExam
        ]);
        const todayClassTasks = ContainerRules.applyRule(tasks, todayClassRule);
        
        // Get tomorrow's tasks (due tomorrow or for tomorrow's classes, not completed)
        const tomorrowRule = P.matchesAny([
            P.matchesAll([P.isDueTomorrow, P.isNotCompleted]),
            P.matchesAll([
                P.forTomorrowsClasses(tomorrowSubjects),
                P.isNotCompleted,
                P.not(P.isOverdue),
                P.isNotExam
            ])
        ]);
        const tomorrowTasks = ContainerRules.applyRule(tasks, tomorrowRule);
        
        // Use the container results for other task types
        const futureTasks = futureContainer.tasks;
        const completedTasks = ContainerRules.applyRule(tasks, P.isCompleted);
        const archiveTasks = archiveContainer.tasks;
        
        // Sort tasks consistently - fixing potential bug in date comparison
        const sortByDate = (tasks) => {
            return [...tasks].sort((a, b) => {
                const aDate = a.date_added ? new Date(a.date_added) : (a.due_date ? new Date(a.due_date) : new Date(0));
                const bDate = b.date_added ? new Date(b.date_added) : (b.due_date ? new Date(b.due_date) : new Date(0));
                return aDate - bDate; // Oldest first
            });
        };
        
        return {
            todayTasks: sortByDate(todayTasks),
            todayClassTasks: sortByDate(todayClassTasks),
            tomorrowTasks: sortByDate(tomorrowTasks),
            futureTasks: sortByDate(futureTasks),
            completedTasks: sortByDate(completedTasks),
            archiveTasks: sortByDate(archiveTasks)
        };
    }, [
        tasks, 
        isLoading, 
        error, 
        todaySubjects, 
        tomorrowSubjects, 
        futureContainer.tasks, 
        archiveContainer.tasks
    ]);
    
    // Return the filtered tasks and loading states - maintaining the same interface
    return {
        ...filteredTasks,
        isLoading,
        error,
        completeTask,
        uncompleteTask
    };
}

export default useTaskData;