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
  private consecutiveServerFailures = 0;
  private isStaticDeployment = false;

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

    // Check if hosted on GitHub Pages or static host
    if (typeof window !== 'undefined' && (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:')) {
      this.isStaticDeployment = true;
    }

    if (!this.isStaticDeployment) {
      this.connectWebSocket();
      this.startPollingFallback();
    } else {
      // In static deployment, load local students and questions into memory immediately
      this.syncLocalStudents();
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

  private getLocalStudents(): StudentSession[] {
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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  private connectWebSocket() {
    if (this.isStaticDeployment) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const wsUrl = this.getWsUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.consecutiveServerFailures = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'init') {
            if (data.students) {
              this.notifyStudents(data.students);
            }
            if (data.questions) {
              this.notifyQuestions(data.questions);
            }
            if (data.settings) {
              this.cachedSettings = data.settings;
              this.notifySettings(data.settings);
            }
          } else if (data.type === 'student:updated') {
            this.fetchLatestSession();
          } else if (data.type === 'student:reset') {
            if (data.studentId) {
              this.notifyStudentReset(data.studentId);
            }
            this.fetchLatestSession();
          } else if (data.type === 'session:reset') {
            this.notifyReset();
            this.notifyStudents([]);
          } else if (data.type === 'questions:updated') {
            if (data.questions) {
              this.notifyQuestions(data.questions);
            }
          } else if (data.type === 'students:list') {
            if (data.students) {
              this.notifyStudents(data.students);
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
        if (!this.reconnectTimer && !this.isStaticDeployment) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
          }, 5000);
        }
      };

      ws.onerror = () => {
        // Fallback polling will handle data sync
      };

      this.socket = ws;
    } catch {
      // WS fallback
    }
  }

  private startPollingFallback() {
    if (this.isStaticDeployment) return;
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.fetchLatestSession();
    }, 4000);
  }

  public async fetchLatestSession(): Promise<{ questions: Question[]; students: StudentSession[]; settings?: ExamSettings } | null> {
    if (this.isStaticDeployment) {
      const students = this.getLocalStudents();
      const questions = getActiveQuestions();
      return { questions, students, settings: this.cachedSettings };
    }

    try {
      const res = await fetch('/api/session');
      if (!res.ok) {
        this.consecutiveServerFailures++;
        if (this.consecutiveServerFailures >= 3) {
          this.isStaticDeployment = true;
          if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
          }
        }
        return { questions: getActiveQuestions(), students: this.getLocalStudents(), settings: this.cachedSettings };
      }
      this.consecutiveServerFailures = 0;
      const data = await res.json();
      if (data.students) {
        this.notifyStudents(data.students);
      }
      if (data.questions) {
        this.notifyQuestions(data.questions);
      }
      if (data.settings) {
        this.cachedSettings = data.settings;
        this.notifySettings(data.settings);
      }
      return data;
    } catch {
      this.consecutiveServerFailures++;
      if (this.consecutiveServerFailures >= 3) {
        this.isStaticDeployment = true;
      }
      return { questions: getActiveQuestions(), students: this.getLocalStudents(), settings: this.cachedSettings };
    }
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
    // Provide cached settings immediately
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

    if (!this.isStaticDeployment) {
      try {
        const res = await fetch('/api/student/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: storedId,
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
          }
          return data;
        }
      } catch {
        // Fallback to static mode
      }
    }

    // Local / Static Mode fallback (GitHub Pages)
    const id = storedId || `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentStudentId = id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skyquiz_student_id', id);
    }

    const students = this.getLocalStudents();
    const existing = students.find((s) => s.id === id);
    const isCompleted = existing?.status === 'COMPLETED' || (typeof localStorage !== 'undefined' && localStorage.getItem(`skyquiz_student_completed_${id}`) === 'true');

    const now = Date.now();
    const questions = getActiveQuestions();
    const updatedStudent: StudentSession = existing
      ? { ...existing, name, studentClass, examCode, aircraftType, lastUpdated: now }
      : {
          id,
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

    const nextStudents = existing ? students.map((s) => (s.id === id ? updatedStudent : s)) : [...students, updatedStudent];
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
    if (!this.isStaticDeployment) {
      try {
        const res = await fetch('/api/student/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, ...record }),
        });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }

    // Static local update
    const students = this.getLocalStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return false;

    const fullRecord: StudentAnswerRecord = {
      ...record,
      answeredAt: Date.now(),
    };

    const nextStudents = students.map((s) => {
      if (s.id !== studentId) return s;
      const filteredAnswers = s.answers.filter((a) => a.questionId !== record.questionId);
      return {
        ...s,
        answers: [...filteredAnswers, fullRecord],
      };
    });

    this.saveLocalStudents(nextStudents);
    return true;
  }

  public async updateProgress(
    studentId: string,
    questionIndex: number,
    score: number,
    combo: number,
    status?: 'READY' | 'PLAYING' | 'COMPLETED'
  ): Promise<boolean> {
    if (!this.isStaticDeployment) {
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
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }

    // Static local update
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
      };
    });

    this.saveLocalStudents(nextStudents);
    return true;
  }

  // Teacher Actions
  public async resetStudent(_accessCode: string, studentId: string): Promise<boolean> {
    if (!this.isStaticDeployment) {
      try {
        const res = await fetch('/api/teacher/reset-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: _accessCode, studentId }),
        });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }

    // Static local reset
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`skyquiz_student_completed_${studentId}`);
    }
    const students = this.getLocalStudents();
    const nextStudents = students.map((s) => {
      if (s.id !== studentId) return s;
      return {
        ...s,
        score: 0,
        currentQuestionIndex: 0,
        combo: 0,
        status: 'READY' as const,
        answers: [],
      };
    });
    this.saveLocalStudents(nextStudents);
    this.notifyStudentReset(studentId);
    this.broadcastMessage({ type: 'student:reset', studentId });
    return true;
  }

  public async resetSession(_accessCode: string): Promise<boolean> {
    if (!this.isStaticDeployment) {
      try {
        const res = await fetch('/api/teacher/reset-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: _accessCode }),
        });
        if (res.ok) return true;
      } catch {
        // fallback
      }
    }

    // Static local reset
    this.saveLocalStudents([]);
    this.notifyReset();
    this.broadcastMessage({ type: 'session:reset' });
    return true;
  }

  public async updateQuestions(_accessCode: string, questions: Question[]): Promise<boolean> {
    saveActiveQuestions(questions);
    this.notifyQuestions(questions);
    this.broadcastMessage({ type: 'questions:updated', questions });

    if (!this.isStaticDeployment) {
      try {
        const res = await fetch('/api/teacher/update-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: _accessCode, questions }),
        });
        return res.ok;
      } catch {
        // local already updated
      }
    }

    return true;
  }

  public async generateExamCode(_accessCode: string): Promise<ExamSettings | null> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const numPart = Math.floor(100 + Math.random() * 900);
    const newCode = `EXAM-${randomPart}-${numPart}`;

    const newSettings: ExamSettings = {
      ...this.cachedSettings,
      examCode: newCode,
    };

    if (!this.isStaticDeployment) {
      try {
        const res = await fetch('/api/teacher/generate-exam-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: _accessCode }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            this.cachedSettings = data.settings;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('skyquiz_exam_settings', JSON.stringify(data.settings));
            }
            this.notifySettings(data.settings);
            this.broadcastMessage({ type: 'settings:updated', settings: data.settings });
            return data.settings;
          }
        }
      } catch {
        // fallback
      }
    }

    // Static fallback
    this.cachedSettings = newSettings;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skyquiz_exam_settings', JSON.stringify(newSettings));
    }
    this.notifySettings(newSettings);
    this.broadcastMessage({ type: 'settings:updated', settings: newSettings });
    return newSettings;
  }

  public async updateSettings(_accessCode: string, settings: Partial<ExamSettings>): Promise<ExamSettings | null> {
    const newSettings: ExamSettings = {
      ...this.cachedSettings,
      ...settings,
    };

    if (!this.isStaticDeployment) {
      try {
        const res = await fetch('/api/teacher/update-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: _accessCode, settings }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            this.cachedSettings = data.settings;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('skyquiz_exam_settings', JSON.stringify(data.settings));
            }
            this.notifySettings(data.settings);
            this.broadcastMessage({ type: 'settings:updated', settings: data.settings });
            return data.settings;
          }
        }
      } catch {
        // fallback
      }
    }

    // Static fallback
    this.cachedSettings = newSettings;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skyquiz_exam_settings', JSON.stringify(newSettings));
    }
    this.notifySettings(newSettings);
    this.broadcastMessage({ type: 'settings:updated', settings: newSettings });
    return newSettings;
  }

  public getCurrentStudentId(): string | null {
    if (this.currentStudentId) return this.currentStudentId;
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('skyquiz_student_id') : null;
    } catch {
      return null;
    }
  }

  public getCachedSettings(): ExamSettings {
    return this.cachedSettings || {
      examCode: 'SKY-2026',
      shuffleQuestions: false,
      scorePerQuestion: 20,
      useComboBonus: false,
    };
  }
}

export const syncService = new RealtimeSyncService();
