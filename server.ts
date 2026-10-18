import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import archiver from 'archiver';

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

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'students_db.json');

const studentsMap = new Map<string, StudentSession>();

function saveDatabaseToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      sessions: Array.from(studentsMap.values()),
      settings: activeSettings,
      questions: activeQuestions,
      savedAt: Date.now(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save exam database to disk:', err);
  }
}

function loadDatabaseFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.sessions)) {
        for (const s of data.sessions) {
          if (s && s.id) {
            studentsMap.set(s.id, s);
          }
        }
      }
      if (data.settings && data.settings.examCode) {
        activeSettings = { ...activeSettings, ...data.settings };
      }
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        activeQuestions = data.questions;
      }
    } else {
      saveDatabaseToDisk();
    }
  } catch (err) {
    console.warn('Could not load database from disk:', err);
  }
}

loadDatabaseFromDisk();

function getLocalIpAddresses(): string[] {
  const ips: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (ifaceList) {
        for (const iface of ifaceList) {
          if (iface.family === 'IPv4' && !iface.internal) {
            ips.push(iface.address);
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return ips;
}

const app = express();

// Full CORS middleware to allow student connections from any device / browser / IP / tunnel
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data: object) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch {
        // ignore send error
      }
    }
  });
}

// REST Endpoints
app.get('/api/session', (_req, res) => {
  res.json({
    questions: activeQuestions,
    students: Array.from(studentsMap.values()),
    settings: activeSettings,
    serverIps: getLocalIpAddresses(),
    serverTime: Date.now(),
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
  saveDatabaseToDisk();
  broadcast({ type: 'student:updated', student });

  res.json({ success: true, student, questions: activeQuestions, isCompleted: student.status === 'COMPLETED' });
});

app.post('/api/student/progress', (req, res) => {
  const { studentId, questionIndex, score, combo, status } = req.body;
  let student = studentsMap.get(studentId);
  if (!student) {
    // Auto-create student if not present so progress is never lost across server restarts or devices
    student = {
      id: studentId,
      name: 'Peserta Ujian',
      studentClass: '-',
      examCode: activeSettings.examCode,
      aircraftType: 'PROPELLER',
      score: score || 0,
      combo: combo || 0,
      maxCombo: combo || 0,
      currentQuestionIndex: questionIndex || 0,
      totalQuestions: activeQuestions.length,
      status: status || 'PLAYING',
      answers: [],
      joinedAt: Date.now(),
      lastUpdated: Date.now(),
    };
    studentsMap.set(studentId, student);
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

  saveDatabaseToDisk();
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

  let student = studentsMap.get(studentId);
  if (!student) {
    // Auto-create student to guarantee answers from different devices are NEVER lost
    student = {
      id: studentId,
      name: 'Peserta Ujian',
      studentClass: '-',
      examCode: activeSettings.examCode,
      aircraftType: 'PROPELLER',
      score: 0,
      combo: 0,
      maxCombo: 0,
      currentQuestionIndex: 0,
      totalQuestions: activeQuestions.length,
      status: 'PLAYING',
      answers: [],
      joinedAt: Date.now(),
      lastUpdated: Date.now(),
    };
    studentsMap.set(studentId, student);
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

  saveDatabaseToDisk();
  broadcast({ type: 'student:updated', student });
  res.json({ success: true, student });
});

// Sync endpoint for offline recovery or multi-device data merge
app.post('/api/student/sync', (req, res) => {
  const { student } = req.body;
  if (!student || !student.id) {
    return res.status(400).json({ error: 'Data siswa tidak valid' });
  }

  const existing = studentsMap.get(student.id);
  if (!existing || (student.lastUpdated && student.lastUpdated > existing.lastUpdated)) {
    studentsMap.set(student.id, student);
    saveDatabaseToDisk();
    broadcast({ type: 'student:updated', student });
  }

  res.json({ success: true, student: studentsMap.get(student.id) });
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

  saveDatabaseToDisk();
  broadcast({ type: 'students:list', students: Array.from(studentsMap.values()) });
  res.json({ success: true, message: 'Kesempatan ujian siswa berhasil direset' });
});

app.post('/api/teacher/reset-session', (req, res) => {
  const { accessCode } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }

  studentsMap.clear();
  saveDatabaseToDisk();
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
  saveDatabaseToDisk();
  broadcast({ type: 'questions:updated', questions: activeQuestions });
  res.json({ success: true, questions: activeQuestions });
});

app.post('/api/teacher/generate-exam-code', (req, res) => {
  const { accessCode } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }

  activeSettings.examCode = generateRandomExamCode();
  saveDatabaseToDisk();
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

  saveDatabaseToDisk();
  broadcast({ type: 'settings:updated', settings: activeSettings });
  res.json({ success: true, settings: activeSettings });
});

// Deployment & Docs Folder Endpoints for GitHub Pages
app.get('/api/teacher/docs-status', (_req, res) => {
  const docsDir = path.resolve(__dirname, 'docs');
  const indexPath = path.join(docsDir, 'index.html');
  const exists = fs.existsSync(indexPath);
  let lastModified: number | null = null;
  let fileCount = 0;

  if (exists) {
    try {
      const stat = fs.statSync(indexPath);
      lastModified = stat.mtimeMs;
      const countFiles = (dir: string): number => {
        let count = 0;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const full = path.join(dir, item);
          if (fs.statSync(full).isDirectory()) {
            count += countFiles(full);
          } else {
            count++;
          }
        }
        return count;
      };
      fileCount = countFiles(docsDir);
    } catch {
      // ignore
    }
  }

  res.json({
    exists,
    lastModified,
    fileCount,
    docsPath: 'docs/',
  });
});

app.post('/api/teacher/build-docs', (req, res) => {
  const { accessCode } = req.body;
  if (accessCode !== 'TBRSKY') {
    return res.status(403).json({ error: 'Kode akses salah!' });
  }

  try {
    const scriptPath = path.resolve(__dirname, 'scripts', 'build-docs.js');
    execSync(`node "${scriptPath}"`, {
      cwd: __dirname,
      stdio: 'pipe',
      env: { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' },
    });

    const docsDir = path.resolve(__dirname, 'docs');
    const indexPath = path.join(docsDir, 'index.html');
    const stat = fs.existsSync(indexPath) ? fs.statSync(indexPath) : null;

    res.json({
      success: true,
      message: 'Folder /docs berhasil dibuat & siap untuk GitHub Pages!',
      lastModified: stat ? stat.mtimeMs : Date.now(),
    });
  } catch (err: any) {
    console.error('Error building docs:', err);
    res.status(500).json({
      error: 'Gagal membangun folder /docs: ' + (err?.message || String(err)),
    });
  }
});

app.get('/api/teacher/download-docs-zip', (_req, res) => {
  const docsDir = path.resolve(__dirname, 'docs');
  const indexPath = path.join(docsDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    try {
      const scriptPath = path.resolve(__dirname, 'scripts', 'build-docs.js');
      execSync(`node "${scriptPath}"`, {
        cwd: __dirname,
        stdio: 'pipe',
        env: { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true' },
      });
    } catch (err: any) {
      return res.status(500).send('Gagal membuat folder /docs: ' + (err?.message || ''));
    }
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="skyquiz3d-docs-github-pages.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);
  archive.directory(docsDir, false);
  archive.finalize();
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
    const staticDir = fs.existsSync(path.resolve(__dirname, 'dist'))
      ? path.resolve(__dirname, 'dist')
      : path.resolve(__dirname, 'docs');
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`SkyQuiz 3D Server running on port ${port}`);
    const ips = getLocalIpAddresses();
    if (ips.length > 0) {
      console.log(`Accessible on local network via: http://${ips[0]}:${port}`);
    }
  });
}

setupServer();
