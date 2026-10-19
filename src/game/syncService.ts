import { StudentSession, Question, StudentAnswerRecord, ExamSettings } from '../types/game';
import { getActiveQuestions, saveActiveQuestions } from '../data/quizData';

type StudentsListener = (students: StudentSession[]) => void;
type QuestionsListener = (questions: Question[]) => void;
type ResetListener = () => void;
type StudentResetListener = (studentId: string) => void;
type SettingsListener = (settings: ExamSettings) => void;

class RealtimeSyncService {
  private socket: WebSocket | null = null;
  private studentsListeners: Set<StudentsListener> = new Set();
  private questionsListeners: Set<QuestionsListener> = new Set();
  private resetListeners: Set<ResetListener> = new Set();
  private studentResetListeners: Set<StudentResetListener> = new Set();
  private settingsListeners: Set<SettingsListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentStudentId: string | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isOnline: boolean = true;
  private serverIps: string[] = [];

  private cachedSettings: ExamSettings = {
    examCode: 'SKY-2026',
    shuffleQuestions: false,
    scorePerQuestion: 20,
    useComboBonus: false,
  };

  constructor() {
    try {
      this.currentStudentId = typeof localStorage !== 'undefined' ? localStorage.getItem('skyquiz_student_id') : null;
    } catch {
      this.currentStudentId = null;
    }
    this.loadCachedSettings();
    this.initBroadcastChannel();
    this.connectWebSocket();
    this.startPolling();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.fetchLatestSession();
        this.syncPendingStudentData();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private loadCachedSettings() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('skyquiz_exam_settings');
        if (stored) {
          this.cachedSettings = { ...this.cachedSettings, ...JSON.parse(stored) };
        }
      }
    } catch {
      // use default
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('skyquiz_realtime_sync');
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      } catch {
        this.broadcastChannel = null;
      }
    }
  }

  private broadcastMessage(message: unknown) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {
        // ignore
      }
    }
  }

  private handleBroadcastMessage(data: any) {
    if (!data || typeof data !== 'object') return;
    try {
      if (data.type === 'settings:updated' && data.settings) {
        this.cachedSettings = data.settings;
        this.notifySettings(data.settings);
      } else if (data.type === 'questions:updated' && data.questions) {
        saveActiveQuestions(data.questions);
        this.notifyQuestions(data.questions);
      } else if (data.type === 'students:updated' && data.students) {
        this.notifyStudents(data.students);
      } else if (data.type === 'student:reset' && data.studentId) {
        this.notifyStudentReset(data.studentId);
        this.syncLocalStudents();
      } else if (data.type === 'session:reset') {
        this.notifyReset();
        this.notifyStudents([]);
      }
    } catch (e) {
      console.warn('Broadcast sync error', e);
    }
  }

  public getLocalStudents(): StudentSession[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('skyquiz_students_list');
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return [];
  }

  private saveLocalStudents(students: StudentSession[]) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skyquiz_students_list', JSON.stringify(students));
      }
    } catch {
      // ignore
    }
    this.notifyStudents(students);
    this.broadcastMessage({ type: 'students:updated', students });
  }

  private syncLocalStudents() {
    const students = this.getLocalStudents();
    this.notifyStudents(students);
  }

  private getWsUrl(): string {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const wsUrl = this.getWsUrl();
      if (!wsUrl) return;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.isOnline = true;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            if (Array.isArray(data.students)) {
              this.mergeAndSaveStudents(data.students);
            }
            if (data.questions && Array.isArray(data.questions)) {
              this.notifyQuestions(data.questions);
            }
            if (data.settings) {
              this.cachedSettings = data.settings;
              this.notifySettings(data.settings);
            }
          } else if (data.type === 'student:updated' && data.student) {
            this.handleStudentUpdated(data.student);
          } else if (data.type === 'students:list' && Array.isArray(data.students)) {
            this.mergeAndSaveStudents(data.students);
          } else if (data.type === 'student:reset') {
            if (data.studentId) {
              this.notifyStudentReset(data.studentId);
            }
            this.fetchLatestSession();
          } else if (data.type === 'session:reset') {
            this.saveLocalStudents([]);
            this.notifyReset();
          } else if (data.type === 'questions:updated') {
            if (data.questions) {
              this.notifyQuestions(data.questions);
            }
          } else if (data.type === 'settings:updated') {
            if (data.settings) {
              this.cachedSettings = data.settings;
              this.notifySettings(data.settings);
            }
          }
        } catch (err) {
          console.error('WS parse error', err);
        }
      };

      ws.onclose = () => {
        this.socket = null;
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
          }, 3500);
        }
      };

      ws.onerror = () => {
        // Polling fallback ensures continuous updates
      };

      this.socket = ws;
    } catch {
      // WS fallback
    }
  }

  private handleStudentUpdated(student: StudentSession) {
    const list = this.getLocalStudents();
    const idx = list.findIndex((s) => s.id === student.id);
    let nextList: StudentSession[];
    if (idx >= 0) {
      nextList = [...list];
      nextList[idx] = student;
    } else {
      nextList = [...list, student];
    }
    this.saveLocalStudents(nextList);
  }

  private mergeAndSaveStudents(incoming: StudentSession[]) {
    const local = this.getLocalStudents();
    const map = new Map<string, StudentSession>();
    for (const s of local) map.set(s.id, s);
    for (const s of incoming) {
      const existing = map.get(s.id);
      if (!existing || (s.lastUpdated && s.lastUpdated >= (existing.lastUpdated || 0))) {
        map.set(s.id, s);
      }
    }
    const merged = Array.from(map.values());
    this.saveLocalStudents(merged);
  }

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    // Continuous heartbeat polling: ensures cross-device sync even if WebSockets are blocked
    this.pollInterval = setInterval(() => {
      this.fetchLatestSession();
    }, 2500);
  }

  public async fetchLatestSession(): Promise<{ questions: Question[]; students: StudentSession[]; settings?: ExamSettings; serverIps?: string[] } | null> {
    try {
      const res = await fetch('/api/session', { cache: 'no-store' });
      if (!res.ok) {
        return { questions: getActiveQuestions(), students: this.getLocalStudents(), settings: this.cachedSettings };
      }

      this.isOnline = true;
      const data = await res.json();

      if (data.serverIps && Array.isArray(data.serverIps)) {
        this.serverIps = data.serverIps;
      }

      if (Array.isArray(data.students)) {
        this.mergeAndSaveStudents(data.students);
      }

      if (data.questions && Array.isArray(data.questions)) {
        saveActiveQuestions(data.questions);
        this.notifyQuestions(data.questions);
      }

      if (data.settings) {
        this.cachedSettings = data.settings;
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('skyquiz_exam_settings', JSON.stringify(data.settings));
          }
        } catch {
          // ignore
        }
        this.notifySettings(data.settings);
      }

      // Check if current student has local progress that needs to be synced to server
      this.syncPendingStudentData();

      return {
        questions: data.questions || getActiveQuestions(),
        students: this.getLocalStudents(),
        settings: this.cachedSettings,
        serverIps: this.serverIps,
      };
    } catch {
      return { questions: getActiveQuestions(), students: this.getLocalStudents(), settings: this.cachedSettings };
    }
  }

  private async syncPendingStudentData() {
    if (!this.currentStudentId) return;
    const local = this.getLocalStudents();
    const mySession = local.find((s) => s.id === this.currentStudentId);
    if (!mySession) return;

    try {
      await fetch('/api/student/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student: mySession }),
      });
    } catch {
      // ignore
    }
  }

  public getServerIps(): string[] {
    return this.serverIps;
  }

  public onStudentsUpdate(listener: StudentsListener) {
    this.studentsListeners.add(listener);
    // Immediately emit local state
    listener(this.getLocalStudents());
    return () => {
      this.studentsListeners.delete(listener);
    };
  }

  public onQuestionsUpdate(listener: QuestionsListener) {
    this.questionsListeners.add(listener);
    return () => {
      this.questionsListeners.delete(listener);
    };
  }

  public onSessionReset(listener: ResetListener) {
    this.resetListeners.add(listener);
    return () => {
      this.resetListeners.delete(listener);
    };
  }

  public onStudentReset(listener: StudentResetListener) {
    this.studentResetListeners.add(listener);
    return () => {
      this.studentResetListeners.delete(listener);
    };
  }

  public onSettingsUpdate(listener: SettingsListener) {
    this.settingsListeners.add(listener);
    listener(this.cachedSettings);
    return () => {
      this.settingsListeners.delete(listener);
    };
  }

  private notifyStudents(students: StudentSession[]) {
    this.studentsListeners.forEach((l) => l(students));
  }

  private notifyQuestions(questions: Question[]) {
    this.questionsListeners.forEach((l) => l(questions));
  }

  private notifyReset() {
    this.resetListeners.forEach((l) => l());
  }

  private notifyStudentReset(studentId: string) {
    this.studentResetListeners.forEach((l) => l(studentId));
  }

  private notifySettings(settings: ExamSettings) {
    this.settingsListeners.forEach((l) => l(settings));
  }

  // Student Actions
  public async joinAsStudent(
    name: string,
    studentClass: string,
    aircraftType: string,
    examCode: string = 'UMUM'
  ): Promise<{ student: StudentSession; questions: Question[]; isCompleted?: boolean } | null> {
    const storedId = typeof localStorage !== 'undefined' ? localStorage.getItem('skyquiz_student_id') : null;
    const clientGeneratedId = storedId || `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentStudentId = clientGeneratedId;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skyquiz_student_id', clientGeneratedId);
    }

    try {
      const res = await fetch('/api/student/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clientGeneratedId,
          name,
          studentClass,
          examCode,
          aircraftType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.student?.id) {
          this.currentStudentId = data.student.id;
          localStorage.setItem('skyquiz_student_id', data.student.id);
          this.handleStudentUpdated(data.student);
        }
        return data;
      }
    } catch {
      // Offline fallback
    }

    // Local update fallback if offline
    const students = this.getLocalStudents();
    const existing = students.find((s) => s.id === clientGeneratedId);
    const isCompleted = existing?.status === 'COMPLETED' || (typeof localStorage !== 'undefined' && localStorage.getItem(`skyquiz_student_completed_${clientGeneratedId}`) === 'true');

    const now = Date.now();
    const questions = getActiveQuestions();
    const updatedStudent: StudentSession = existing
      ? { ...existing, name, studentClass, examCode, aircraftType, lastUpdated: now }
      : {
          id: clientGeneratedId,
          name,
          studentClass,
          examCode,
          aircraftType,
          score: 0,
          currentQuestionIndex: 0,
          totalQuestions: questions.length,
          combo: 0,
          maxCombo: 0,
          status: 'READY',
          joinedAt: now,
          lastUpdated: now,
          answers: [],
        };

    const nextStudents = existing ? students.map((s) => (s.id === clientGeneratedId ? updatedStudent : s)) : [...students, updatedStudent];
    this.saveLocalStudents(nextStudents);

    return {
      student: updatedStudent,
      questions,
      isCompleted: Boolean(isCompleted),
    };
  }

  public async submitAnswer(
    studentId: string,
    record: Omit<StudentAnswerRecord, 'answeredAt'>
  ): Promise<boolean> {
    const fullRecord: StudentAnswerRecord = {
      ...record,
      answeredAt: Date.now(),
    };

    // Update local immediately so UI is responsive
    const students = this.getLocalStudents();
    const existing = students.find((s) => s.id === studentId);
    if (existing) {
      const filteredAnswers = existing.answers.filter((a) => a.questionId !== record.questionId);
      const updatedAnswers = [...filteredAnswers, fullRecord];
      const isCorrect = !!record.isCorrect;
      const nextScore = (existing.score || 0) + (record.scoreGained || 0);
      const nextCombo = isCorrect ? (existing.combo || 0) + 1 : 0;
      const nextMaxCombo = Math.max(existing.maxCombo || 0, nextCombo);
      const isCompleted = updatedAnswers.length >= (existing.totalQuestions || 5);

      const updatedStudent: StudentSession = {
        ...existing,
        answers: updatedAnswers,
        score: nextScore,
        combo: nextCombo,
        maxCombo: nextMaxCombo,
        currentQuestionIndex: updatedAnswers.length,
        status: isCompleted ? 'COMPLETED' : 'PLAYING',
        lastUpdated: Date.now(),
      };

      this.handleStudentUpdated(updatedStudent);
    }

    // Send to server
    try {
      const res = await fetch('/api/student/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, ...record }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.student) {
          this.handleStudentUpdated(data.student);
        }
        return true;
      }
    } catch {
      // Server offline; client state saved locally and will sync on reconnect
    }

    return true;
  }

  public async updateProgress(
    studentId: string,
    questionIndex: number,
    score: number,
    combo: number,
    status?: 'READY' | 'PLAYING' | 'COMPLETED'
  ): Promise<boolean> {
    // Update local immediately
    const students = this.getLocalStudents();
    const nextStudents = students.map((s) => {
      if (s.id !== studentId) return s;
      const maxCombo = Math.max(s.maxCombo, combo);
      return {
        ...s,
        currentQuestionIndex: questionIndex,
        score,
        combo,
        maxCombo,
        status: status || s.status,
        lastUpdated: Date.now(),
      };
    });
    this.saveLocalStudents(nextStudents);

    // Send to server
    try {
      const res = await fetch('/api/student/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          questionIndex,
          score,
          combo,
          status,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.student) {
          this.handleStudentUpdated(data.student);
        }
        return true;
      }
    } catch {
      // Server offline
    }

    return true;
  }

  // Teacher Actions
  public async resetStudent(accessCode: string, studentId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/teacher/reset-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, studentId }),
      });
      if (res.ok) {
        this.fetchLatestSession();
        return true;
      }
    } catch {
      // fallback
    }

    // Local reset
    const students = this.getLocalStudents();
    const next = students.filter((s) => s.id !== studentId);
    this.saveLocalStudents(next);
    this.notifyStudentReset(studentId);
    this.broadcastMessage({ type: 'student:reset', studentId });
    return true;
  }

  public async resetSession(accessCode: string): Promise<boolean> {
    try {
      const res = await fetch('/api/teacher/reset-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });
      if (res.ok) {
        this.saveLocalStudents([]);
        return true;
      }
    } catch {
      // fallback
    }

    this.saveLocalStudents([]);
    this.notifyReset();
    this.broadcastMessage({ type: 'session:reset' });
    return true;
  }

  public async updateQuestions(accessCode: string, questions: Question[]): Promise<Question[] | null> {
    try {
      const res = await fetch('/api/teacher/update-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, questions }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.questions) {
          saveActiveQuestions(data.questions);
          this.notifyQuestions(data.questions);
          return data.questions;
        }
      }
    } catch {
      // fallback
    }

    saveActiveQuestions(questions);
    this.notifyQuestions(questions);
    this.broadcastMessage({ type: 'questions:updated', questions });
    return questions;
  }

  public async generateExamCode(accessCode: string): Promise<ExamSettings | null> {
    try {
      const res = await fetch('/api/teacher/generate-exam-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          this.cachedSettings = data.settings;
          this.notifySettings(data.settings);
          return data.settings;
        }
      }
    } catch {
      // fallback
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefix = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const num = Math.floor(100 + Math.random() * 900);
    this.cachedSettings = { ...this.cachedSettings, examCode: `${prefix}-${num}` };
    this.notifySettings(this.cachedSettings);
    this.broadcastMessage({ type: 'settings:updated', settings: this.cachedSettings });
    return this.cachedSettings;
  }

  public async updateSettings(accessCode: string, settings: Partial<ExamSettings>): Promise<ExamSettings | null> {
    try {
      const res = await fetch('/api/teacher/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, settings }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          this.cachedSettings = data.settings;
          this.notifySettings(data.settings);
          return data.settings;
        }
      }
    } catch {
      // fallback
    }

    this.cachedSettings = { ...this.cachedSettings, ...settings };
    this.notifySettings(this.cachedSettings);
    this.broadcastMessage({ type: 'settings:updated', settings: this.cachedSettings });
    return this.cachedSettings;
  }

  public getCachedSettings(): ExamSettings {
    return this.cachedSettings;
  }

  public getCurrentStudentId(): string | null {
    if (this.currentStudentId) return this.currentStudentId;
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('skyquiz_student_id') : null;
    } catch {
      return null;
    }
  }

  public async testGasConnection(gasUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/google-sheets/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gagal terhubung ke Google Apps Script' };
    }
  }

  public async syncResultsToGoogleSheets(accessCode: string, gasUrl?: string): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/google-sheets/sync-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, gasUrl }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengirim data ke Google Sheet' };
    }
  }

  public async fetchQuestionsFromGoogleSheet(accessCode: string, sheetUrl: string): Promise<{ success: boolean; count?: number; questions?: Question[]; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/google-sheets/fetch-sheet-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, sheetUrl }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal mengambil soal dari Google Sheet' };
    }
  }

  public async getDocsStatus(): Promise<{ exists: boolean; lastModified: number | null; fileCount: number } | null> {
    try {
      const res = await fetch('/api/teacher/docs-status');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return null;
  }

  public async buildDocsFolder(accessCode: string): Promise<{ success: boolean; message: string; lastModified?: number } | null> {
    try {
      const res = await fetch('/api/teacher/build-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export const syncService = new RealtimeSyncService();
