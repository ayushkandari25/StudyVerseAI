import React, { useState, useEffect } from 'react';
import { studyAPI } from '../api/study';
import { 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Brain, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

const Flashcards = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
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

  const fetchFlashcards = async (subjectId) => {
    setLoading(true);
    try {
      const data = await studyAPI.getFlashcards(subjectId);
      setFlashcards(data.flashcards || []);
      setCurrentCard(0);
      setIsFlipped(false);
    } catch (error) {
      toast.error('Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async (subjectId) => {
    setLoading(true);
    try {
      await studyAPI.generateFlashcards(subjectId);
      toast.success('Flashcards generated successfully!');
      fetchFlashcards(subjectId);
    } catch (error) {
      toast.error('Failed to generate flashcards');
      setLoading(false);
    }
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    if (subject.hasFlashcards) {
      fetchFlashcards(subject.id);
    }
  };

  const nextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setIsFlipped(false);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>
          <p className="text-gray-600 mt-1">
            Study with AI-generated flashcards for better retention
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="h-8 w-8 text-primary-600" />
          <span className="text-sm text-gray-600">AI-Powered</span>
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
                  {subject.hasFlashcards ? (
                    <span className="text-accent-600">✓ Flashcards available</span>
                  ) : (
                    <span className="text-gray-500">No flashcards yet</span>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                {subject.hasFlashcards ? (
                  <button
                    onClick={() => handleSubjectSelect(subject)}
                    className="btn-primary w-full flex items-center justify-center text-sm"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Study Flashcards
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedSubject(subject);
                      generateFlashcards(subject.id);
                    }}
                    className="btn-secondary w-full flex items-center justify-center text-sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Flashcards
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flashcard Study Interface */
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedSubject(null)}
            className="btn-secondary flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </button>

          {loading ? (
            <div className="flex items-center justify-center min-h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : flashcards.length > 0 ? (
            <>
              {/* Progress */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedSubject.name}</h2>
                <div className="text-sm text-gray-600">
                  {currentCard + 1} of {flashcards.length}
                </div>
              </div>

              {/* Flashcard */}
              <div className="max-w-2xl mx-auto">
                <div 
                  className="relative h-80 cursor-pointer"
                  onClick={flipCard}
                >
                  <div className={`absolute inset-0 w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}>
                    {/* Front of card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden">
                      <div className="card h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-200">
                        <div className="mb-4">
                          <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                            <Brain className="h-6 w-6 text-primary-600" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Question</h3>
                        <p className="text-gray-700 text-lg leading-relaxed">
                          {flashcards[currentCard]?.question}
                        </p>
                        <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>
                      </div>
                    </div>

                    {/* Back of card */}
                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                      <div className="card h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-accent-50 to-primary-50 border-2 border-accent-200">
                        <div className="mb-4">
                          <div className="h-12 w-12 bg-accent-100 rounded-full flex items-center justify-center mx-auto">
                            <RotateCcw className="h-6 w-6 text-accent-600" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Answer</h3>
                        <p className="text-gray-700 text-lg leading-relaxed">
                          {flashcards[currentCard]?.answer}
                        </p>
                        <p className="text-sm text-gray-500 mt-4">Click to see question</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={prevCard}
                    disabled={currentCard === 0}
                    className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </button>

                  <div className="flex space-x-2">
                    {flashcards.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          index === currentCard ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextCard}
                    disabled={currentCard === flashcards.length - 1}
                    className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Generate Flashcards */
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Generate flashcards for {selectedSubject.name}
              </h3>
              <p className="text-gray-500 mb-4">
                Our AI will create personalized flashcards based on your syllabus
              </p>
              <button
                onClick={() => generateFlashcards(selectedSubject.id)}
                className="btn-primary"
              >
                Generate Flashcards
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {subjects.length === 0 && (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects available</h3>
          <p className="text-gray-500 mb-4">
            Add subjects in the Study Plans section to generate flashcards
          </p>
        </div>
      )}
    </div>
  );
};

export default Flashcards;