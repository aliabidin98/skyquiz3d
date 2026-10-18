import { QuizTopic, Question } from '../types/game';

// 5 Soal Ujian Terstandar Kurikulum Interaktif
export const DEFAULT_5_QUESTIONS: Question[] = [
  {
    id: 'soal-1',
    question: 'Organ tubuh manusia yang berfungsi utama memompa darah kaya oksigen ke seluruh bagian tubuh melalui sistem peredaran darah adalah?',
    options: ['Paru-paru', 'Jantung', 'Hati', 'Ginjal'],
    correctIndex: 1,
    explanation: 'Jantung adalah organ berotot yang memompa darah ke seluruh tubuh melalui sistem peredaran darah.',
  },
  {
    id: 'soal-2',
    question: 'Berapakah hasil akhir dari perhitungan operasi matematika campuran berikut ini: (15 × 4) + 25?',
    options: ['75', '80', '85', '90'],
    correctIndex: 2,
    explanation: '(15 × 4) = 60, kemudian 60 + 25 = 85.',
  },
  {
    id: 'soal-3',
    question: 'Dalam kalimat bahasa Inggris: "The brilliant student solved the complex physics problem very quickly", kata yang bersinonim paling tepat dengan "BRILLIANT" adalah?',
    options: ['Careless and lazy in doing tasks', 'Clever, smart, and highly intelligent', 'Angry and emotionally frustrated', 'Heavy and difficult to understand'],
    correctIndex: 1,
    explanation: '"Brilliant" memiliki arti yang sama dengan clever, smart, atau cerdas luar biasa.',
  },
  {
    id: 'soal-4',
    question: 'Danau vulkanik dan tektonik terbesar di Indonesia sekaligus merupakan danau vulkanik terbesar di Asia Tenggara adalah?',
    options: ['Danau Singkarak', 'Danau Maninjau', 'Danau Toba', 'Danau Poso'],
    correctIndex: 2,
    explanation: 'Danau Toba di Sumatera Utara merupakan danau kaldera vulkanik terbesar di Asia Tenggara.',
  },
  {
    id: 'soal-5',
    question: 'Planet apakah yang memiliki ukuran diameter serta volume fisik paling besar di dalam sistem tata surya kita?',
    options: ['Saturnus', 'Jupiter', 'Uranus', 'Neptunus'],
    correctIndex: 1,
    explanation: 'Jupiter adalah planet gas raksasa terbesar di tata surya dengan massa lebih dari dua kali lipat gabungan seluruh planet lainnya.',
  },
];

export const DEFAULT_QUIZ_TOPIC: QuizTopic = {
  id: 'edusky-soal-ujian',
  title: 'Soal Ujian SkyQuiz 3D',
  description: '5 Soal Ujian Kurikulum Terstandar Interaktif',
  icon: 'Sparkles',
  theme: 'beach',
  questions: DEFAULT_5_QUESTIONS,
};

// Storage helper for questions customization by teacher
const QUESTIONS_STORAGE_KEY = 'skyquiz_active_questions';

export function getActiveQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return DEFAULT_5_QUESTIONS;
}

export function saveActiveQuestions(questions: Question[]) {
  try {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
  } catch {
    // Ignore
  }
}

export function saveCustomTopic(topic: QuizTopic) {
  saveActiveQuestions(topic.questions);
}

export function deleteCustomTopic(_topicId: string) {
  resetToDefaultQuestions();
}

export function resetToDefaultQuestions(): Question[] {
  try {
    localStorage.removeItem(QUESTIONS_STORAGE_KEY);
  } catch {
    // Ignore
  }
  return DEFAULT_5_QUESTIONS;
}
