// Form for creating and editing tasks
import React, { useState, useEffect } from 'react';
import { createTask, updateTask } from '../services/taskService';
import '../styles/components/task-form.css';

function TaskForm({ task, onClose }) {
  const [formData, setFormData] = useState({
    description: '',
    subject: '',
    date_added: '',
    due_date: '',
    topic: '',
    type: '',
    status: '',
    student_id: 1,
  });
  
  const isEditMode = Boolean(task);
  
  // If editing, populate form with task data
  useEffect(() => {
    if (task) {
      setFormData({
        description: task.description || '',
        subject: task.subject || '',
        date_added: task.date_added ? new Date(task.date_added.seconds * 1000).toISOString().split('T')[0] : '',
        due_date: task.due_date ? new Date(task.due_date.seconds * 1000).toISOString().split('T')[0] : '',
        topic: task.topic || '',
        type: task.type || '',
        status: task.status || '',
        student_id: task.student_id || 1,
      });
    }
  }, [task]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare data for firestore
    const taskData = {
      ...formData,
      due_date: formData.due_date ? new Date(formData.due_date) : null
    };
    
    try {
      if (isEditMode) {
        await updateTask(task.id, taskData);
      } else {
        await createTask(taskData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    }
  };
  
  return (
    <div className="task-form-overlay">
      <div className="task-form">
        <h2>{isEditMode ? 'Edit Task' : 'New Task'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            ></textarea>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="container">Subject</label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
              >
                <option value="english">English</option>
                <option value="math">Math</option>
                <option value="civics">Civics</option>
                <option value="history">History</option>
                <option value="art">Art</option>
                
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="gridColor">Grid Color</label>
              <select
                id="gridColor"
                name="gridColor"
                value={formData.gridColor}
                onChange={handleChange}
              >
                <option value="">None</option>
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="blue">Blue</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="">None</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="effort">Effort</label>
              <select
                id="effort"
                name="effort"
                value={formData.effort}
                onChange={handleChange}
              >
                <option value="">None</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="impact">Impact</label>
              <select
                id="impact"
                name="impact"
                value={formData.impact}
                onChange={handleChange}
              >
                <option value="">None</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="dueDate">Due Date</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              {isEditMode ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskForm;