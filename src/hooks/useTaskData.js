// Hook to access and filter task data
import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useTaskData() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function fetchTasks() {
            try {
                setLoading(true);
                const tasksRef = collection(db, 'tasks');
                const tasksSnapshot = await getDocs(tasksRef);
                
                const fetchedTasks = [];
                tasksSnapshot.forEach(doc => {
                    fetchedTasks.push({ id: doc.id, ...doc.data() });
                });
                
                setTasks(fetchedTasks);
            } catch (error) {
                console.error("Error fetching tasks:", error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchTasks();
    }, []);
    
    // Filter tasks by due date
    const getTodayTasks = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            return dueDate.getTime() === today.getTime();
        });
    };
    
    const getTomorrowTasks = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            return dueDate.getTime() === tomorrow.getTime();
        });
    };
    
    const getFutureTasks = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        
        return tasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            return dueDate.getTime() >= twoDaysFromNow.getTime();
        });
    };
    
    const getArchiveTasks = () => {
        return tasks.filter(task => task.completed);
    };
    
    const completeTask = async (taskId) => {
        try {
            const taskRef = doc(db, 'tasks', taskId);
            await updateDoc(taskRef, {
                completed: true,
                completedDate: new Date().toLocaleDateString('fi-FI').replace(/\//g, '.')
            });
            
            // Update local state
            setTasks(prevTasks => 
                prevTasks.map(task => 
                    task.id === taskId ? { ...task, completed: true } : task
                )
            );
            
        } catch (error) {
            console.error("Error completing task:", error);
        }
    };
    
    return {
        todayTasks: getTodayTasks(),
        tomorrowTasks: getTomorrowTasks(),
        futureTasks: getFutureTasks(),
        archiveTasks: getArchiveTasks(),
        completeTask,
        loading
    };
}