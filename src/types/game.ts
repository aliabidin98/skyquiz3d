export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  theme: 'city' | 'beach' | 'rainbow' | 'space' | 'antarctica' | 'sunset' | 'tropical' | 'dawn' | 'night';
  questions: Question[];
}

export interface AnswerRecord {
  questionId: string;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  timeSpentSec: number;
  explanation: string;
}

export type GameState = 'START' | 'PLAYING' | 'FEEDBACK' | 'LEVEL_TRANSITION' | 'GAME_OVER';

export type FlightDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type CruiseDurationMode = 'SHORT' | 'MEDIUM' | 'LONG'; // 8s, 14s, 22s

export interface StudentAnswerRecord {
  questionId: string;
  questionIndex: number;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  scoreGained: number;
  timeSpentSec: number;
  answeredAt: number;
}

export interface StudentSession {
  id: string;
  name: string;
  studentClass: string;
  examCode: string;
  aircraftType: string;
  score: number;
  combo: number;
  maxCombo: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  status: 'READY' | 'PLAYING' | 'COMPLETED';
  answers: StudentAnswerRecord[];
  joinedAt: number;
  lastUpdated: number;
}

export type UserRole = 'STUDENT' | 'TEACHER';

export interface ExamSettings {
  examCode: string;
  shuffleQuestions: boolean;
  scorePerQuestion: number;
  useComboBonus: boolean;
}


