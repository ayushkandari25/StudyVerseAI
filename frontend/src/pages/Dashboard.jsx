import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { studyAPI } from '../api/study';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Target, 
  TrendingUp, 
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    todayTasks: [],
    subjects: [],
    progress: {},
    upcomingExams: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await studyAPI.getDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (topicId) => {
    try {
      await studyAPI.markTopicComplete(topicId);
      toast.success('Topic marked as complete!');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to mark topic as complete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Ready to continue your learning journey?
          </p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add Subject
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.todayTasks?.length || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Study Streak</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.progress?.streak || 0} days
              </p>
            </div>
            <div className="h-12 w-12 bg-accent-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subjects</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.subjects?.length || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-secondary-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-secondary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.progress?.completionRate || 0}%
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Tasks */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Today's Study Tasks</h2>
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
            
            {dashboardData.todayTasks?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.todayTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`h-3 w-3 rounded-full ${task.completed ? 'bg-accent-500' : 'bg-gray-300'}`} />
                      <div>
                        <p className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-500">{task.subject} • {task.estimatedTime}</p>
                      </div>
                    </div>
                    {!task.completed && (
                      <button
                        onClick={() => handleMarkComplete(task.id)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No tasks scheduled for today</p>
                <p className="text-sm text-gray-400 mt-1">Add a subject to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Exams</h2>
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
            
            {dashboardData.upcomingExams?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcomingExams.map((exam) => (
                  <div key={exam.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="font-medium text-gray-900">{exam.subject}</p>
                    <p className="text-sm text-orange-600">{exam.daysLeft} days left</p>
                    <p className="text-xs text-gray-500">{exam.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No upcoming exams
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full p-3 text-left bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-200">
                <p className="font-medium text-primary-700">Generate Study Plan</p>
                <p className="text-sm text-primary-600">Create AI-powered study schedule</p>
              </button>
              <button className="w-full p-3 text-left bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors duration-200">
                <p className="font-medium text-secondary-700">Practice Flashcards</p>
                <p className="text-sm text-secondary-600">Review with AI-generated cards</p>
              </button>
              <button className="w-full p-3 text-left bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors duration-200">
                <p className="font-medium text-accent-700">Take a Quiz</p>
                <p className="text-sm text-accent-600">Test your knowledge</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;