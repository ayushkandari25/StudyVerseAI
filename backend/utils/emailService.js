import nodemailer from 'nodemailer';
import User from '../models/User.js';
import StudyPlan from '../models/StudyPlan.js';

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use a real email service in production
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // For development, log to console
    return {
      sendMail: async (options) => {
        console.log('📧 Email would be sent:');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Content:', options.text || options.html);
        return { messageId: 'dev-mode-' + Date.now() };
      }
    };
  }
};

export const sendDailyReminders = async () => {
  try {
    const users = await User.find({ 
      isActive: true,
      'preferences.notifications.dailyReminders': true 
    });

    const transporter = createTransporter();

    for (const user of users) {
      try {
        // Get today's study tasks
        const studyPlans = await StudyPlan.find({ 
          user: user._id, 
          isActive: true 
        }).populate('subject');

        let todaysTasks = [];
        for (const plan of studyPlans) {
          const tasks = plan.getTodaysTasks();
          todaysTasks.push(...tasks);
        }

        if (todaysTasks.length > 0) {
          const emailContent = generateDailyReminderEmail(user, todaysTasks);
          
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@studygenie.com',
            to: user.email,
            subject: `📚 Your Daily Study Reminder - ${todaysTasks.length} tasks today`,
            html: emailContent,
            text: `Hi ${user.name}, you have ${todaysTasks.length} study tasks scheduled for today. Check your StudyGenie dashboard for details.`
          });

          console.log(`✅ Daily reminder sent to ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error sending reminder to ${user.email}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error in sendDailyReminders:', error);
  }
};

const generateDailyReminderEmail = (user, tasks) => {
  const tasksList = tasks.map(task => `
    <li style="margin-bottom: 10px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #3b82f6; border-radius: 4px;">
      <strong>${task.topic}</strong><br>
      <span style="color: #6b7280; font-size: 14px;">${task.description}</span><br>
      <span style="color: #059669; font-size: 12px;">⏱️ ${task.estimatedTime}</span>
    </li>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Study Reminder</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">📚 StudyGenie</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Your AI Study Companion</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${user.name}! 👋</h2>
        
        <p style="font-size: 16px; margin-bottom: 25px;">
          You have <strong>${tasks.length} study task${tasks.length > 1 ? 's' : ''}</strong> scheduled for today. 
          Let's keep your learning momentum going!
        </p>
        
        <h3 style="color: #3b82f6; margin-bottom: 15px;">📋 Today's Study Tasks:</h3>
        <ul style="list-style: none; padding: 0;">
          ${tasksList}
        </ul>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
             style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Open StudyGenie Dashboard
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
            💡 <strong>Study Tip:</strong> Break your study sessions into 25-minute focused blocks with 5-minute breaks.
          </p>
          <p style="color: #6b7280; font-size: 12px;">
            Don't want these reminders? Update your preferences in your 
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings" style="color: #3b82f6;">account settings</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendExamReminder = async (user, subject, daysUntilExam) => {
  try {
    const transporter = createTransporter();
    
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Exam Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">⚠️ Exam Alert</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">StudyGenie Reminder</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${user.name}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Your <strong>${subject.name}</strong> exam is in <strong>${daysUntilExam} day${daysUntilExam > 1 ? 's' : ''}</strong>!
          </p>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Exam Date: <strong>${new Date(subject.examDate).toLocaleDateString()}</strong>
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
               style="background: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Review Your Study Plan
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@studygenie.com',
      to: user.email,
      subject: `⚠️ Exam Alert: ${subject.name} in ${daysUntilExam} day${daysUntilExam > 1 ? 's' : ''}`,
      html: emailContent,
      text: `Hi ${user.name}, your ${subject.name} exam is in ${daysUntilExam} day${daysUntilExam > 1 ? 's' : ''}. Check your StudyGenie dashboard to review your study plan.`
    });

    console.log(`✅ Exam reminder sent to ${user.email} for ${subject.name}`);
  } catch (error) {
    console.error('❌ Error sending exam reminder:', error);
  }
};

export const sendWelcomeEmail = async (user) => {
  try {
    const transporter = createTransporter();
    
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to StudyGenie</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to StudyGenie!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your AI-Powered Study Companion</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${user.name}! 👋</h2>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Welcome to StudyGenie! We're excited to help you on your learning journey with AI-powered study tools.
          </p>
          
          <h3 style="color: #3b82f6; margin-bottom: 15px;">🚀 Get Started:</h3>
          <ul style="margin-bottom: 25px;">
            <li style="margin-bottom: 10px;">📚 Add your subjects and syllabi</li>
            <li style="margin-bottom: 10px;">🤖 Generate AI-powered study plans</li>
            <li style="margin-bottom: 10px;">🧠 Create flashcards and quizzes</li>
            <li style="margin-bottom: 10px;">📈 Track your progress and achievements</li>
          </ul>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
               style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@studygenie.com',
      to: user.email,
      subject: '🎉 Welcome to StudyGenie - Your AI Study Companion!',
      html: emailContent,
      text: `Hi ${user.name}, welcome to StudyGenie! Your AI-powered study companion is ready to help you succeed. Get started by adding your subjects and generating study plans.`
    });

    console.log(`✅ Welcome email sent to ${user.email}`);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};