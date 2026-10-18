import { useEffect, useRef, useState } from 'react';
import { QuizTopic, Question, AnswerRecord, GameState, FlightDifficulty, UserRole, ExamSettings } from './types/game';
import { DEFAULT_QUIZ_TOPIC, getActiveQuestions, saveActiveQuestions } from './data/quizData';
import { FlightEngine } from './game/flightEngine';
import { soundEngine } from './game/audio';
import { EnvironmentTheme, THEME_CONFIGS } from './game/environment';
import { AircraftType } from './game/aircraft';
import { syncService } from './game/syncService';
import { QuestionOverlay } from './components/QuestionOverlay';
import { TouchControls } from './components/TouchControls';
import { BottomControlDock } from './components/BottomControlDock';
import { StudentStartScreen } from './components/StudentStartScreen';
import { TeacherDashboard } from './components/TeacherDashboard';
import { RoleSelectModal } from './components/RoleSelectModal';
import { ReportModal } from './components/ReportModal';
import { CustomQuizModal } from './components/CustomQuizModal';
import { AnswerQuizModal } from './components/AnswerQuizModal';
import { Compass, ArrowLeft } from 'lucide-react';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function safeGetItem(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FlightEngine | null>(null);

  // User Role State
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    return (safeGetItem('skyquiz_user_role') as UserRole) || null;
  });
  const [showRoleSelectModal, setShowRoleSelectModal] = useState<boolean>(() => {
    return !safeGetItem('skyquiz_user_role');
  });

  // Simulator mode flag (when teacher tests flight)
  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(false);

  // Student Identity
  const [studentName, setStudentName] = useState<string>(() => {
    return safeGetItem('skyquiz_student_name') || '';
  });
  const [studentClass, setStudentClass] = useState<string>(() => {
    return safeGetItem('skyquiz_student_class') || '';
  });
  const [examCode, setExamCode] = useState<string>(() => {
    return safeGetItem('skyquiz_exam_code') || 'PAS-1';
  });
  const [studentId, setStudentId] = useState<string | null>(() => {
    return safeGetItem('skyquiz_student_id') || null;
  });

  // 1-Play Only Constraint for Students: track if student already completed exam
  const [hasCompletedExam, setHasCompletedExam] = useState<boolean>(() => {
    const sid = safeGetItem('skyquiz_student_id');
    if (sid && safeGetItem(`skyquiz_student_completed_${sid}`) === 'true') {
      return true;
    }
    return safeGetItem('skyquiz_student_completed') === 'true';
  });

  // Questions & Topic (Soal Ujian)
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(() => getActiveQuestions());
  const [difficulty, setDifficulty] = useState<FlightDifficulty>('EASY');
  const [selectedAircraftType, setSelectedAircraftType] = useState<AircraftType>('PROPELLER');

  // Game Lifecycle States
  const [gameState, setGameState] = useState<GameState>('START');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(110);
  const [trackNotification, setTrackNotification] = useState<string | null>(null);

  // Active Quiz Answering Modal Data (appears when airplane pierces the gate)
  const [activeQuizModal, setActiveQuizModal] = useState<{
    question: Question;
    questionIndex: number;
    totalQuestions: number;
    gateLetter: string;
    nextTheme: EnvironmentTheme;
  } | null>(null);

  // Modals & Controls State
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [mouseControl, setMouseControl] = useState<boolean>(false);
  const [touchControlsVisible, setTouchControlsVisible] = useState<boolean>(() => {
    return typeof window !== 'undefined'
      ? (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches)
      : false;
  });

  // Exam Settings (Acak Soal, Skor per Soal, Kode Ujian)
  const [settings, setSettings] = useState<ExamSettings>(() => syncService.getCachedSettings());

  // Hides 3D aircraft model when student is answering questions ("saat siswa mulai mengerjakan")
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAircraftVisible(!activeQuizModal);
    }
  }, [activeQuizModal]);

  // Sync questions, settings & listen to teacher resets
  useEffect(() => {
    syncService.fetchLatestSession().then((data) => {
      if (data?.questions && data.questions.length > 0) {
        setActiveQuestions(data.questions);
        saveActiveQuestions(data.questions);
      }
      if (data?.settings) {
        setSettings(data.settings);
        if (data.settings.examCode && (!examCode || examCode === 'PAS-1')) {
          setExamCode(data.settings.examCode);
        }
      }
      // Check if current student is already completed on server
      const currentSid = studentId || safeGetItem('skyquiz_student_id');
      if (currentSid && data?.students) {
        const found = data.students.find((s) => s.id === currentSid);
        if (found?.status === 'COMPLETED') {
          setHasCompletedExam(true);
          safeSetItem(`skyquiz_student_completed_${currentSid}`, 'true');
        }
      }
    });

    const unsubscribeQuestions = syncService.onQuestionsUpdate((updated) => {
      setActiveQuestions(updated);
      saveActiveQuestions(updated);
    });

    const unsubscribeSettings = syncService.onSettingsUpdate((updatedSettings) => {
      setSettings(updatedSettings);
      if (updatedSettings.examCode) {
        setExamCode(updatedSettings.examCode);
      }
    });

    // Listen to single student reset from teacher
    const unsubscribeStudentReset = syncService.onStudentReset((resetSid) => {
      const currentSid = studentId || safeGetItem('skyquiz_student_id');
      if (resetSid === currentSid || !currentSid) {
        setHasCompletedExam(false);
        if (currentSid) {
          safeRemoveItem(`skyquiz_student_completed_${currentSid}`);
        }
        safeRemoveItem('skyquiz_student_completed');
      }
    });

    // Listen to session-wide reset from teacher
    const unsubscribeSessionReset = syncService.onSessionReset(() => {
      setHasCompletedExam(false);
      const currentSid = studentId || safeGetItem('skyquiz_student_id');
      if (currentSid) {
        safeRemoveItem(`skyquiz_student_completed_${currentSid}`);
      }
      safeRemoveItem('skyquiz_student_completed');
    });

    return () => {
      unsubscribeQuestions();
      unsubscribeSettings();
      unsubscribeStudentReset();
      unsubscribeSessionReset();
    };
  }, [studentId, examCode]);

  const handleSelectRole = (role: UserRole) => {
    setUserRole(role);
    safeSetItem('skyquiz_user_role', role);
    setShowRoleSelectModal(false);
  };

  const handleExitTeacherMode = () => {
    setShowRoleSelectModal(true);
  };

  // Launch Flight (Both Student and Teacher Simulator)
  const handleStartGame = async (forSimulator: boolean = false) => {
    if (!canvasMountRef.current) return;

    if (!forSimulator && userRole === 'STUDENT' && hasCompletedExam) {
      alert('Anda sudah menyelesaikan ujian ini (hanya 1x kesempatan bermain). Minta guru mereset jika ingin mengulang.');
      return;
    }

    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    setIsSimulatorMode(forSimulator);

    // Save Student Identity if actual student
    if (!forSimulator && userRole === 'STUDENT') {
      safeSetItem('skyquiz_student_name', studentName);
      safeSetItem('skyquiz_student_class', studentClass);
      safeSetItem('skyquiz_exam_code', examCode);

      const joinRes = await syncService.joinAsStudent(studentName, studentClass, selectedAircraftType, examCode);
      if (joinRes?.student?.id) {
        setStudentId(joinRes.student.id);
        if (joinRes.isCompleted) {
          setHasCompletedExam(true);
          safeSetItem(`skyquiz_student_completed_${joinRes.student.id}`, 'true');
          alert('Anda sudah menyelesaikan ujian ini sebelumnya. Minta guru mereset jika ingin mengulang.');
          return;
        }
      }
    }

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setRecords([]);
    setActiveQuizModal(null);
    setTrackNotification(THEME_CONFIGS.beach.name);
    setTimeout(() => setTrackNotification(null), 3500);
    setGameState('PLAYING');

    // If teacher enabled shuffle questions, randomize order for this session
    const questionsToRun = (!forSimulator && settings.shuffleQuestions)
      ? shuffleArray(activeQuestions)
      : activeQuestions;

    const topicConfig: QuizTopic = {
      ...DEFAULT_QUIZ_TOPIC,
      questions: questionsToRun,
    };

    const engine = new FlightEngine(
      canvasMountRef.current,
      topicConfig,
      difficulty,
      selectedAircraftType,
      {
        onQuestionStart: (q, idx, total, _theme) => {
          setCurrentQuestion(q);
          setQuestionIndex(idx);
          setTotalQuestions(total);
          setActiveQuizModal(null);

          if (!forSimulator && userRole === 'STUDENT') {
            const currentSid = studentId || safeGetItem('skyquiz_student_id');
            if (currentSid) {
              syncService.updateProgress(currentSid, idx, score, combo, 'PLAYING');
            }
          }
        },
        onGatePierced: (
          q,
          idx,
          total,
          gateLetter,
          nextTheme
        ) => {
          setActiveQuizModal({
            question: q,
            questionIndex: idx,
            totalQuestions: total,
            gateLetter,
            nextTheme,
          });
        },
        onGameComplete: (recs, finalScore, highestCombo) => {
          setRecords(recs);
          setScore(finalScore);
          setMaxCombo(highestCombo);
          setActiveQuizModal(null);
          setGameState('GAME_OVER');

          // Mark exam as completed for student - 1-Play only rule!
          if (!forSimulator && userRole === 'STUDENT') {
            setHasCompletedExam(true);
            const currentSid = studentId || safeGetItem('skyquiz_student_id');
            if (currentSid) {
              safeSetItem(`skyquiz_student_completed_${currentSid}`, 'true');
              syncService.updateProgress(currentSid, activeQuestions.length, finalScore, highestCombo, 'COMPLETED');
            }
            safeSetItem('skyquiz_student_completed', 'true');
          }
        },
        onSpeedUpdate: (spd) => {
          setSpeed(spd);
        },
        onTrackChanged: (newTheme) => {
          const name = THEME_CONFIGS[newTheme]?.name || 'Lintasan Baru';
          setTrackNotification(`🌐 Memasuki ${name}`);
          setTimeout(() => setTrackNotification(null), 3500);
        },
      }
    );

    engine.start();
    engineRef.current = engine;
  };

  const handleAnswerSubmitted = (isCorrect: boolean, selectedIndex: number, scoreGained: number) => {
    let currentTotalScore = score;
    let nextCombo = combo;

    if (isCorrect) {
      currentTotalScore = score + scoreGained;
      setScore((prev) => prev + scoreGained);
      nextCombo = combo + 1;
      setCombo(nextCombo);
      if (nextCombo > maxCombo) setMaxCombo(nextCombo);
    } else {
      nextCombo = 0;
      setCombo(0);
    }

    if (engineRef.current) {
      engineRef.current.recordAnswer(isCorrect, selectedIndex, scoreGained);
    }

    // Only sync real student answers to Teacher Gradebook
    if (!isSimulatorMode && userRole === 'STUDENT') {
      const currentSid = studentId || safeGetItem('skyquiz_student_id');
      if (currentSid && currentQuestion) {
        const chosenText = currentQuestion.options[selectedIndex] || '';
        const correctText = currentQuestion.options[currentQuestion.correctIndex] || '';

        syncService.submitAnswer(currentSid, {
          questionId: currentQuestion.id,
          questionIndex,
          questionText: currentQuestion.question,
          selectedOption: chosenText,
          correctOption: correctText,
          isCorrect,
          scoreGained,
          timeSpentSec: 0,
        });

        syncService.updateProgress(currentSid, questionIndex + 1, currentTotalScore, nextCombo, 'PLAYING');
      }
    }
  };

  const handleProceedToNextTrack = () => {
    setActiveQuizModal(null);
    if (engineRef.current) {
      engineRef.current.proceedToNextTrack();
    }
  };

  const handlePlayAgain = () => {
    // Only allowed for teacher simulator mode! Students cannot replay.
    if (!isSimulatorMode && userRole === 'STUDENT') {
      alert('Siswa hanya dapat bermain 1 kali saja tanpa bermain ulang.');
      return;
    }

    setGameState('PLAYING');
    setActiveQuizModal(null);
    if (engineRef.current) {
      const topicConfig: QuizTopic = {
        ...DEFAULT_QUIZ_TOPIC,
        questions: activeQuestions,
      };
      engineRef.current.restart(topicConfig, difficulty);
    } else {
      handleStartGame(isSimulatorMode);
    }
  };

  const handleBackToMenu = () => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    setGameState('START');
    setActiveQuizModal(null);
    setIsSimulatorMode(false);
  };

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleMouseControl = () => {
    if (engineRef.current) {
      const active = engineRef.current.toggleMouseControl();
      setMouseControl(active);
    }
  };

  const handleSelectAircraftType = (type: AircraftType) => {
    setSelectedAircraftType(type);
    if (engineRef.current) {
      engineRef.current.setAircraftModel(type);
    }
  };

  const handleSteerTouch = (x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.setDirectSteering(x, y);
    }
  };

  const handleBoostTouch = (boosting: boolean) => {
    if (engineRef.current) {
      engineRef.current.setBoosting(boosting);
    }
  };

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Three.js WebGL Mount Container for 3D Flight Canvas: Permanently mounted with real dimensions */}
      <div
        ref={canvasMountRef}
        className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-300 ${
          gameState === 'PLAYING' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Role Selection Initial Topup Menu */}
      <RoleSelectModal
        isOpen={showRoleSelectModal}
        onSelectStudent={() => handleSelectRole('STUDENT')}
        onSelectTeacher={() => handleSelectRole('TEACHER')}
        onClose={userRole ? () => setShowRoleSelectModal(false) : undefined}
      />

      {/* 1. TEACHER MODE FULL DASHBOARD */}
      {userRole === 'TEACHER' && gameState === 'START' && (
        <div className="absolute inset-0 z-40 overflow-y-auto">
          <TeacherDashboard
            questions={activeQuestions}
            onLaunchSimulator={() => handleStartGame(true)}
            onExitTeacherMode={handleExitTeacherMode}
            onOpenQuestionManager={() => setShowCustomModal(true)}
          />
        </div>
      )}

      {/* 2. STUDENT START SCREEN */}
      {userRole === 'STUDENT' && gameState === 'START' && (
        <StudentStartScreen
          studentName={studentName}
          onStudentNameChange={setStudentName}
          studentClass={studentClass}
          onStudentClassChange={setStudentClass}
          examCode={examCode}
          onExamCodeChange={setExamCode}
          difficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          selectedAircraftType={selectedAircraftType}
          onSelectAircraftType={handleSelectAircraftType}
          hasCompletedExam={hasCompletedExam}
          onStartFlight={() => handleStartGame(false)}
          onOpenTeacherPasscode={() => setShowRoleSelectModal(true)}
        />
      )}

      {/* 3. PLAYING HUD: Flight HUD Overlay */}
      {gameState === 'PLAYING' && (
        <>
          <QuestionOverlay
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            topicTitle="Soal Ujian"
            score={score}
            combo={combo}
          />

          {/* Teacher Simulator Mode Exit Button in HUD */}
          {isSimulatorMode && (
            <div className="absolute top-20 right-4 z-30">
              <button
                type="button"
                onClick={handleBackToMenu}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-sky-400/40 text-xs font-black shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer backdrop-blur-md active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dashboard Guru</span>
              </button>
            </div>
          )}

          {/* Track Entrance Notification */}
          {trackNotification && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-slate-900/90 text-sky-200 border border-sky-400/50 px-5 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-bold">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>{trackNotification}</span>
              </div>
            </div>
          )}

          {/* Touch Controls for Tablet & Phone */}
          <TouchControls
            visible={touchControlsVisible && !activeQuizModal}
            onSteer={handleSteerTouch}
            onBoost={handleBoostTouch}
          />

          {/* Bottom Dock */}
          <BottomControlDock
            speed={speed}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            mouseControl={mouseControl}
            onToggleMouseControl={handleToggleMouseControl}
            touchControlsVisible={touchControlsVisible}
            onToggleTouchControls={() => setTouchControlsVisible(!touchControlsVisible)}
            currentAircraftType={selectedAircraftType}
            onSelectAircraftType={handleSelectAircraftType}
            hideAircraftSelector={!isSimulatorMode && userRole === 'STUDENT'}
            onExitGame={handleBackToMenu}
          />

          {/* Answering Menu (When plane pierces the round gate) */}
          {activeQuizModal && (
            <AnswerQuizModal
              question={activeQuizModal.question}
              questionIndex={activeQuizModal.questionIndex}
              totalQuestions={activeQuizModal.totalQuestions}
              topicTitle="Soal Ujian"
              gateLetter={activeQuizModal.gateLetter}
              currentCombo={combo}
              nextTheme={activeQuizModal.nextTheme}
              scorePerQuestion={settings.scorePerQuestion}
              useComboBonus={settings.useComboBonus}
              onAnswerSubmitted={handleAnswerSubmitted}
              onProceedToNextTrack={handleProceedToNextTrack}
            />
          )}
        </>
      )}

      {/* 4. Learning Outcome Report Modal */}
      {gameState === 'GAME_OVER' && (
        <ReportModal
          records={records}
          finalScore={score}
          maxCombo={maxCombo}
          topicTitle={isSimulatorMode ? 'Uji Simulator Guru' : 'Soal Ujian Kurikulum'}
          isStudentOnly={userRole === 'STUDENT' && !isSimulatorMode}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {/* 5. Custom Quiz & Excel Import Modal for Teachers */}
      {showCustomModal && (
        <CustomQuizModal
          onClose={() => setShowCustomModal(false)}
          onSaved={(newTopic) => {
            setShowCustomModal(false);
            setActiveQuestions(newTopic.questions);
            saveActiveQuestions(newTopic.questions);
            syncService.updateQuestions('TBRSKY', newTopic.questions);
          }}
        />
      )}
    </div>
  );
}
