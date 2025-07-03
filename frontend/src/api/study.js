import api from './config';

export const studyAPI = {
  // Syllabus and subjects
  uploadSyllabus: async (syllabusData) => {
    const response = await api.post('/syllabus', syllabusData);
    return response.data;
  },

  getSubjects: async () => {
    const response = await api.get('/subjects');
    return response.data;
  },

  // Study plans
  generateStudyPlan: async (subjectId) => {
    const response = await api.post('/study-plan', { subjectId });
    return response.data;
  },

  getStudyPlan: async () => {
    const response = await api.get('/study-plan');
    return response.data;
  },

  // Flashcards
  generateFlashcards: async (subjectId) => {
    const response = await api.post('/flashcards', { subjectId });
    return response.data;
  },

  getFlashcards: async (subjectId) => {
    const response = await api.get(`/flashcards/${subjectId}`);
    return response.data;
  },

  // Quizzes
  generateQuiz: async (subjectId) => {
    const response = await api.post('/quiz', { subjectId });
    return response.data;
  },

  getQuiz: async (subjectId) => {
    const response = await api.get(`/quiz/${subjectId}`);
    return response.data;
  },

  // Dashboard and progress
  getDashboard: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  markTopicComplete: async (topicId) => {
    const response = await api.patch('/mark-topic', { topicId });
    return response.data;
  }
};