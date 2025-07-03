import React, { useState, useEffect } from 'react';
import { studyAPI } from '../api/study';
import { 
  Plus, 
  Calendar, 
  Clock, 
  BookOpen, 
  Upload, 
  FileText,
  Sparkles,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudyPlans = () => {
  const [subjects, setSubjects] = useState([]);
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    syllabus: '',
    examDate: '',
    description: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchStudyPlan();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await studyAPI.getSubjects();
      setSubjects(data.subjects || []);
    } catch (error) {
      toast.error('Failed to load subjects');
    }
  };

  const fetchStudyPlan = async () => {
    try {
      const data = await studyAPI.getStudyPlan();
      setStudyPlan(data);
    } catch (error) {
      // Study plan might not exist yet
      setStudyPlan(null);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await studyAPI.uploadSyllabus(formData);
      toast.success('Subject added successfully!');
      setFormData({ name: '', syllabus: '', examDate: '', description: '' });
      setShowAddSubject(false);
      fetchSubjects();
    } catch (error) {
      toast.error('Failed to add subject');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStudyPlan = async (subjectId) => {
    setLoading(true);
    try {
      await studyAPI.generateStudyPlan(subjectId);
      toast.success('Study plan generated successfully!');
      fetchStudyPlan();
    } catch (error) {
      toast.error('Failed to generate study plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study Plans</h1>
          <p className="text-gray-600 mt-1">
            Manage your subjects and AI-generated study schedules
          </p>
        </div>
        <button
          onClick={() => setShowAddSubject(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Subject
        </button>
      </div>

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Subject</h2>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field"
                  placeholder="e.g., Mathematics, Physics"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.examDate}
                  onChange={(e) => setFormData({...formData, examDate: e.target.value})}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Syllabus Content
                </label>
                <textarea
                  required
                  value={formData.syllabus}
                  onChange={(e) => setFormData({...formData, syllabus: e.target.value})}
                  className="input-field h-32"
                  placeholder="Enter syllabus topics, chapters, or upload content..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-field h-20"
                  placeholder="Additional notes about this subject..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div key={subject.id} className="card hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                <p className="text-sm text-gray-600">{subject.description}</p>
              </div>
              <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                Exam: {new Date(subject.examDate).toLocaleDateString()}
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                {subject.daysLeft} days remaining
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-2" />
                {subject.topicsCount} topics
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleGenerateStudyPlan(subject.id)}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center text-sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Study Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Study Plan Section */}
      {studyPlan && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Your Study Plan</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Target className="h-4 w-4" />
              <span>{studyPlan.progress}% Complete</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studyPlan.dailyTasks?.map((task, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Day {index + 1}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.completed 
                      ? 'bg-accent-100 text-accent-800' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {task.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{task.topic}</p>
                <p className="text-xs text-gray-500 mt-1">{task.estimatedTime}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {subjects.length === 0 && (
        <div className="text-center py-12">
          <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects added yet</h3>
          <p className="text-gray-500 mb-4">
            Add your first subject to get started with AI-powered study planning
          </p>
          <button
            onClick={() => setShowAddSubject(true)}
            className="btn-primary"
          >
            Add Your First Subject
          </button>
        </div>
      )}
    </div>
  );
};

export default StudyPlans;