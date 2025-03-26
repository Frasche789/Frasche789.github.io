// Hook to access and filter task data
import { useState, useEffect, useContext, useMemo } from 'react';
import { TaskContext } from '../context/TaskContext';
import { useSubjects } from './useSubjects';

export function useTaskData() {
    // Get tasks and subjects data from context and hooks
    const { tasks, loading: tasksLoading, error: tasksError, completeTask } = useContext(TaskContext);
    const { tomorrowSubjects, allSubjects, isLoading: subjectsLoading, error: subjectsError } = useSubjects();
    
    // Derived loading and error states
    const isLoading = tasksLoading || subjectsLoading;
    const error = tasksError || subjectsError;
    
    // Memoize filtered tasks to prevent recalculations on re-renders
    const filteredTasks = useMemo(() => {
        // If still loading or error, return empty arrays
        if (isLoading || error || !tasks.length) {
            return {
                todayTasks: [],
                tomorrowTasks: [],
                futureTasks: [],
                completedTasks: []
            };
        }
        
        // Date calculations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        // Filter completed tasks
        const completedTasks = tasks.filter(task => task.completed);
        
        // Filter tasks for today
        const todayTasks = tasks.filter(task => {
            if (task.completed) return false;
            
            if (!task.due_date) return false;
            
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            return dueDate.getTime() === today.getTime();
        });
        
        // Get subject IDs for tomorrow to filter tomorrow's tasks
        const tomorrowSubjectIds = tomorrowSubjects.map(subject => subject.id);
        const tomorrowSubjectNames = tomorrowSubjects
            .map(subject => subject.name?.toLowerCase())
            .filter(Boolean);
        
        // Filter tasks for tomorrow's subjects
        const tomorrowTasks = tasks.filter(task => {
            // Skip completed tasks
            if (task.completed) return false;
            
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
        });
        
        // Filter tasks for future days
        const futureTasks = tasks.filter(task => {
            if (task.completed) return false;
            
            if (!task.due_date) return false;
            
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            
            return dueDate.getTime() >= dayAfterTomorrow.getTime();
        });
        
        return {
            todayTasks,
            tomorrowTasks,
            futureTasks,
            completedTasks
        };
    }, [tasks, tomorrowSubjects, isLoading, error]);
    
    // Return the filtered tasks and loading states
    return {
        ...filteredTasks,
        isLoading,
        error,
        completeTask
    };
}