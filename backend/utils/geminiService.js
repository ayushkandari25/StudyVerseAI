import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async generateStudyPlan(syllabus, subjectName, examDate, currentDate = new Date()) {
    const daysUntilExam = Math.ceil((new Date(examDate) - currentDate) / (1000 * 60 * 60 * 24));
    
    const prompt = `
      Create a detailed study plan for the following subject and syllabus:
      
      Subject: ${subjectName}
      Exam Date: ${examDate}
      Days until exam: ${daysUntilExam}
      
      Syllabus:
      ${syllabus}
      
      Please create a day-by-day study plan that includes:
      1. Daily topics to cover
      2. Estimated time for each topic (in hours and minutes)
      3. Difficulty level (easy, medium, hard)
      4. Brief description of what to focus on each day
      
      Make sure the plan is realistic and accounts for revision time before the exam.
      
      Return the response in the following JSON format:
      {
        "title": "Study Plan for [Subject]",
        "description": "Brief description of the study plan",
        "totalDuration": ${daysUntilExam},
        "dailyTasks": [
          {
            "day": 1,
            "topic": "Topic name",
            "description": "What to study and focus on",
            "estimatedTime": "2 hours",
            "difficulty": "medium"
          }
        ]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not extract JSON from AI response');
    } catch (error) {
      console.error('Error generating study plan:', error);
      throw new Error('Failed to generate study plan');
    }
  }

  async generateFlashcards(syllabus, subjectName, topicName = '') {
    const prompt = `
      Create educational flashcards for the following subject and syllabus:
      
      Subject: ${subjectName}
      ${topicName ? `Specific Topic: ${topicName}` : ''}
      
      Syllabus:
      ${syllabus}
      
      Generate 10-15 flashcards with:
      1. Clear, concise questions
      2. Accurate, detailed answers
      3. Appropriate difficulty level
      4. Relevant topics from the syllabus
      
      Return the response in the following JSON format:
      {
        "flashcards": [
          {
            "question": "Question text here",
            "answer": "Answer text here",
            "topic": "Topic name",
            "difficulty": "easy/medium/hard",
            "tags": ["tag1", "tag2"]
          }
        ]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not extract JSON from AI response');
    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw new Error('Failed to generate flashcards');
    }
  }

  async generateQuiz(syllabus, subjectName, numberOfQuestions = 10) {
    const prompt = `
      Create a multiple-choice quiz for the following subject and syllabus:
      
      Subject: ${subjectName}
      Number of Questions: ${numberOfQuestions}
      
      Syllabus:
      ${syllabus}
      
      Generate a quiz with:
      1. Clear, well-structured questions
      2. 4 multiple-choice options for each question
      3. Correct answer index (0-3)
      4. Brief explanation for each answer
      5. Appropriate difficulty distribution
      6. Questions covering different topics from the syllabus
      
      Return the response in the following JSON format:
      {
        "title": "Quiz: ${subjectName}",
        "description": "Test your knowledge of ${subjectName}",
        "questions": [
          {
            "question": "Question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0,
            "explanation": "Brief explanation of the correct answer",
            "difficulty": "easy/medium/hard",
            "topic": "Topic name"
          }
        ]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not extract JSON from AI response');
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw new Error('Failed to generate quiz');
    }
  }

  async extractTopicsFromSyllabus(syllabus) {
    const prompt = `
      Extract and organize the main topics from the following syllabus content:
      
      Syllabus:
      ${syllabus}
      
      Please identify:
      1. Main topics/chapters
      2. Subtopics under each main topic
      3. Estimated study time for each topic
      4. Difficulty level of each topic
      
      Return the response in the following JSON format:
      {
        "topics": [
          {
            "name": "Topic name",
            "description": "Brief description",
            "estimatedTime": 120,
            "difficulty": "easy/medium/hard"
          }
        ]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not extract JSON from AI response');
    } catch (error) {
      console.error('Error extracting topics:', error);
      throw new Error('Failed to extract topics from syllabus');
    }
  }
}

export default new GeminiService();