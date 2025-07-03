import React, { useState, useEffect } from 'react';
import { studyAPI } from '../api/study';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  BookOpen,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

const Quizzes = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await studyAPI.getSubjects();
      setSubjects(data.subjects || []);
    } catch (error) {
      toast.error('Failed to load subjects');
    }
  };

  const fetchQuiz = async (subjectId) => {
    setLoading(true);
    try {
      const data = await studyAPI.getQuiz(subjectId);
      setQuiz(data.quiz);
      setCurrentQuestion(0);
      setUserAnswers([]);
      setShowResult(false);
      setQuizComplete(false);
    } catch (error) {
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async (subjectId) => {
    setLoading(true);
    try {
      await studyAPI.generateQuiz(subjectId);
      toast.success('Quiz generated successfully!');
      fetchQuiz(subjectId);
    } catch (error) {
      toast.error('Failed to generate quiz');
      setLoading(false);
    }
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    if (subject.hasQuiz) {
      fetchQuiz(subject.id);
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestion] = selectedAnswer;
    setUserAnswers(newUserAnswers);

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      // Quiz complete
      setQuizComplete(true);
      calculateResults(newUserAnswers);
    }
  };

  const calculateResults = (answers) => {
    const correctAnswers = answers.filter((answer, index) => 
      answer === quiz.questions[index].correctAnswer
    ).length;
    
    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    setShowResult({ score, correctAnswers, totalQuestions: quiz.questions.length });
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setUserAnswers([]);
    setShowResult(false);
    setQuizComplete(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quizzes</h1>
          <p className="text-gray-600 mt-1">
            Test your knowledge with AI-generated quizzes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Target className="h-8 w-8 text-primary-600" />
          <span className="text-sm text-gray-600">Practice Tests</span>
        </div>
      </div>

      {!selectedSubject ? (
        /* Subject Selection */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <div key={subject.id} className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer">
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
                <div className="text-sm text-gray-600">
                  {subject.hasQuiz ? (
                    <span className="text-accent-600">✓ Quiz available</span>
                  ) : (
                    <span className="text-gray-500">No quiz yet</span>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                {subject.hasQuiz ? (
                  <button
                    onClick={() => handleSubjectSelect(subject)}
                    className="btn-primary w-full flex items-center justify-center text-sm"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Take Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedSubject(subject);
                      generateQuiz(subject.id);
                    }}
                    className="btn-secondary w-full flex items-center justify-center text-sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Quiz
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Quiz Interface */
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedSubject(null)}
            className="btn-secondary flex items-center"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Back to Subjects
          </button>

          {loading ? (
            <div className="flex items-center justify-center min-h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : quiz && !quizComplete ? (
            <>
              {/* Progress */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedSubject.name} Quiz</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    Question {currentQuestion + 1} of {quiz.questions.length}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <div className="card max-w-2xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {quiz.questions[currentQuestion].question}
                  </h3>
                  
                  <div className="space-y-3">
                    {quiz.questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                          selectedAnswer === index
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                            selectedAnswer === index
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedAnswer === index && (
                              <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                            )}
                          </div>
                          <span className="text-gray-700">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleNextQuestion}
                    disabled={selectedAnswer === null}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentQuestion === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  </button>
                </div>
              </div>
            </>
          ) : showResult ? (
            /* Results */
            <div className="card max-w-2xl mx-auto text-center">
              <div className="mb-6">
                {showResult.score >= 70 ? (
                  <CheckCircle className="h-16 w-16 text-accent-500 mx-auto mb-4" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                )}
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Quiz Complete!
                </h2>
                
                <div className="text-4xl font-bold mb-4">
                  <span className={showResult.score >= 70 ? 'text-accent-600' : 'text-red-600'}>
                    {showResult.score}%
                  </span>
                </div>
                
                <p className="text-gray-600 mb-6">
                  You got {showResult.correctAnswers} out of {showResult.totalQuestions} questions correct
                </p>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resetQuiz}
                    className="btn-secondary flex items-center"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake Quiz
                  </button>
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className="btn-primary"
                  >
                    Try Another Subject
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Generate Quiz */
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Generate quiz for {selectedSubject.name}
              </h3>
              <p className="text-gray-500 mb-4">
                Our AI will create a personalized quiz based on your syllabus
              </p>
              <button
                onClick={() => generateQuiz(selectedSubject.id)}
                className="btn-primary"
              >
                Generate Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {subjects.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects available</h3>
          <p className="text-gray-500 mb-4">
            Add subjects in the Study Plans section to generate quizzes
          </p>
        </div>
      )}
    </div>
  );
};

export default Quizzes;