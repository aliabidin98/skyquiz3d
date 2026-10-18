import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

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

// 5 Soal Ujian Terstandar Kurikulum Interaktif
const DEFAULT_5_EXAM_QUESTIONS: ServerQuestion[] = [
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

export interface ExamSettings {
  examCode: string;
  shuffleQuestions: boolean;
  scorePerQuestion: number;
  useComboBonus: boolean;
}

function generateRandomExamCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const prefix = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

let activeQuestions: ServerQuestion[] = [...DEFAULT_5_EXAM_QUESTIONS];
let activeSettings: ExamSettings = {
  examCode: generateRandomExamCode(),
  shuffleQuestions: false,
  scorePerQuestion: 20,
  useComboBonus: false,
};

const studentsMap = new Map<string, StudentSession>();

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data: object) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST Endpoints
app.get('/api/session', (_req, res) => {
  res.json({
    questions: activeQuestions,
    students: Array.from(studentsMap.values()),
    settings: activeSettings,
  });
});

app.post('/api/student/join', (req, res) => {
  const { id, name, studentClass, examCode, aircraftType } = req.body;
  if (!name || !studentClass) {
    return res.status(400).json({ error: 'Nama dan Kelas wajib diisi' });
  }

  const studentId = id || `std-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const existing = studentsMap.get(studentId);

  // If student was already marked COMPLETED and hasn't been reset by teacher
  if (existing && existing.status === 'COMPLETED') {
    return res.json({
      success: true,
      student: existing,
      questions: activeQuestions,
      isCompleted: true,
      message: 'Siswa sudah menyelesaikan sesi ujian.',
    });
  }

  const student: StudentSession = {
    id: studentId,
    name: name.trim(),
    studentClass: studentClass.trim(),
    examCode: (examCode || existing?.examCode || activeSettings.examCode).trim().toUpperCase(),
    aircraftType: aircraftType || 'PROPELLER',
    score: existing?.score ?? 0,
    combo: existing?.combo ?? 0,
    maxCombo: existing?.maxCombo ?? 0,
    currentQuestionIndex: existing?.currentQuestionIndex ?? 0,
    totalQuestions: activeQuestions.length,
    status: existing?.status ?? 'READY',
    answers: existing?.answers ?? [],
    joinedAt: existing?.joinedAt ?? Date.now(),
    lastUpdated: Date.now(),
  };

  studentsMap.set(studentId, student);
  broadcast({ type: 'student:updated', student });

  res.json({ success: true, student, questions: activeQuestions, isCompleted: student.status === 'COMPLETED' });
});

app.post('/api/student/progress', (req, res) => {
  const { studentId, questionIndex, score, combo, status } = req.body;
  const student = studentsMap.get(studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  student.currentQuestionIndex = questionIndex ?? student.currentQuestionIndex;
  student.score = score ?? student.score;
  student.combo = combo ?? student.combo;
  if (student.combo > student.maxCombo) {
    student.maxCombo = student.combo;
  }
  if (status) {
    student.status = status;
  }
  student.lastUpdated = Date.now();

  broadcast({ type: 'student:updated', student });
  res.json({ success: true, student });
});

app.post('/api/student/answer', (req, res) => {
  const {
    studentId,
    questionId,
    questionIndex,
    questionText,
    selectedOption,
    correctOption,
    isCorrect,
    scoreGained,
    timeSpentSec,
  } = req.body;

  const student = studentsMap.get(studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Idempotent record check for same question
  const existingIndex = student.answers.findIndex((a) => a.questionId === questionId || a.questionIndex === questionIndex);
  const record: StudentAnswerRecord = {
    questionId: questionId || `q-${questionIndex}`,
    questionIndex: questionIndex ?? student.answers.length,
    questionText: questionText || '',
    selectedOption: selectedOption || '',
    correctOption: correctOption || '',
    isCorrect: !!isCorrect,
    scoreGained: scoreGained || 0,
    timeSpentSec: timeSpentSec || 0,
    answeredAt: Date.now(),
  };

  if (existingIndex >= 0) {
    student.answers[existingIndex] = record;
  } else {
    student.answers.push(record);
  }

  student.score = (student.score || 0) + (scoreGained || 0);
  if (isCorrect) {
    student.combo = (student.combo || 0) + 1;
    if (student.combo > student.maxCombo) {
      student.maxCombo = student.combo;
    }
  } else {
    student.combo = 0;
  }

  if (student.answers.length >= activeQuestions.length) {
    student.status = 'COMPLETED';
  } else {
    student.status = 'PLAYING';
  }

  student.currentQuestionIndex = student.answers.length;
  student.lastUpdated = Date.now();

  broadcast({ type: 'student:updated', student });
  res.json({ success: true, student });
});

// Teacher Endpoints
app.post('/api/teacher/reset-student', (req, res) => {
  const { accessCode, studentId } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }
  if (!studentId) {
    return res.status(400).json({ error: 'ID Siswa wajib disediakan' });
  }

  const existing = studentsMap.get(studentId);
  if (existing) {
    // Reset student answers, score, combo, and status
    existing.answers = [];
    existing.score = 0;
    existing.combo = 0;
    existing.maxCombo = 0;
    existing.currentQuestionIndex = 0;
    existing.status = 'READY';
    existing.lastUpdated = Date.now();
    studentsMap.set(studentId, existing);
    broadcast({ type: 'student:reset', studentId, student: existing });
  } else {
    broadcast({ type: 'student:reset', studentId });
  }

  broadcast({ type: 'students:list', students: Array.from(studentsMap.values()) });
  res.json({ success: true, message: 'Kesempatan ujian siswa berhasil direset' });
});

app.post('/api/teacher/reset-session', (req, res) => {
  const { accessCode } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }

  studentsMap.clear();
  broadcast({ type: 'session:reset' });
  res.json({ success: true, message: 'Semua data siswa berhasil direset' });
});

app.post('/api/teacher/update-questions', (req, res) => {
  const { accessCode, questions } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Daftar pertanyaan tidak valid' });
  }

  activeQuestions = questions;
  broadcast({ type: 'questions:updated', questions: activeQuestions });
  res.json({ success: true, questions: activeQuestions });
});

app.post('/api/teacher/generate-exam-code', (req, res) => {
  const { accessCode } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }

  activeSettings.examCode = generateRandomExamCode();
  broadcast({ type: 'settings:updated', settings: activeSettings });
  res.json({ success: true, settings: activeSettings });
});

app.post('/api/teacher/update-settings', (req, res) => {
  const { accessCode, settings } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }

  if (settings) {
    if (typeof settings.examCode === 'string' && settings.examCode.trim()) {
      activeSettings.examCode = settings.examCode.trim().toUpperCase();
    }
    if (typeof settings.shuffleQuestions === 'boolean') {
      activeSettings.shuffleQuestions = settings.shuffleQuestions;
    }
    if (typeof settings.scorePerQuestion === 'number' && settings.scorePerQuestion > 0) {
      activeSettings.scorePerQuestion = settings.scorePerQuestion;
    }
    if (typeof settings.useComboBonus === 'boolean') {
      activeSettings.useComboBonus = settings.useComboBonus;
    }
  }

  broadcast({ type: 'settings:updated', settings: activeSettings });
  res.json({ success: true, settings: activeSettings });
});

// WebSocket Connection Handlers
wss.on('connection', (ws) => {
  // Send current state on connect
  ws.send(
    JSON.stringify({
      type: 'init',
      questions: activeQuestions,
      students: Array.from(studentsMap.values()),
      settings: activeSettings,
    })
  );

  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // Ignore malformed messages
    }
  });
});

// Vite or Static file serving
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`SkyQuiz 3D Server running on http://localhost:${port}`);
  });
}

setupServer();
