import * as THREE from 'three';
import { Question, QuizTopic, FlightDifficulty, AnswerRecord } from '../types/game';
import { Aircraft, AircraftType } from './aircraft';
import { ALL_THEMES, EnvironmentTheme, GameEnvironment } from './environment';
import { QuestionGateSet } from './gates';
import { ParticleSystem } from './particles';
import { soundEngine } from './audio';

export interface FlightEngineCallbacks {
  onQuestionStart: (question: Question, questionIndex: number, totalQuestions: number, currentTheme: EnvironmentTheme) => void;
  onGatePierced: (
    question: Question,
    questionIndex: number,
    totalQuestions: number,
    gateLetter: string,
    nextTheme: EnvironmentTheme
  ) => void;
  onGameComplete: (records: AnswerRecord[], finalScore: number, maxCombo: number) => void;
  onSpeedUpdate: (speed: number) => void;
  onTrackChanged: (theme: EnvironmentTheme) => void;
}

export class FlightEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private animFrameId: number | null = null;

  // Components
  public aircraft: Aircraft;
  public environment: GameEnvironment;
  public particles: ParticleSystem;
  private activeGateSet: QuestionGateSet | null = null;

  // Quiz State
  private currentTopic: QuizTopic;
  private questions: Question[] = [];
  private currentQuestionIndex: number = 0;
  private questionStartTime: number = 0;
  private records: AnswerRecord[] = [];
  private difficulty: FlightDifficulty = 'EASY';
  public currentTheme: EnvironmentTheme = 'beach';

  // Flight Stats
  public score: number = 0;
  public combo: number = 0;
  public maxCombo: number = 0;
  private callbacks: FlightEngineCallbacks;

  // Speed and Cruise Distance directly determined by difficulty setting
  public baseSpeed: number = 20;
  public cruiseDistance: number = 380; // Distance to spawn gates ahead
  public speedMultiplier: number = 1.0;
  public isBoosting: boolean = false;
  public isPaused: boolean = false;
  private pauseDelayTimer: number = 0;
  private pendingGateResult: {
    gateLetter: string;
  } | null = null;

  private targetPos = new THREE.Vector3(0, 1.0, 0);
  private currentPos = new THREE.Vector3(0, 1.0, 0);
  private targetRoll: number = 0;
  private targetPitch: number = 0;
  private targetYaw: number = 0;

  // Input states
  private inputMove = { x: 0, y: 0 };
  private mouseControlEnabled: boolean = false;
  private mouseNormalized = { x: 0, y: 0 };

  // Corridor Limits
  private readonly MIN_X = -17;
  private readonly MAX_X = 17;
  private readonly MIN_Y = -3.5;
  private readonly MAX_Y = 6.8;

  private isRunning: boolean = false;

  constructor(
    container: HTMLElement,
    topic: QuizTopic,
    difficulty: FlightDifficulty,
    aircraftType: AircraftType = 'PROPELLER',
    callbacks: FlightEngineCallbacks
  ) {
    this.container = container;
    this.currentTopic = topic;
    this.questions = [...topic.questions];
    this.difficulty = difficulty;
    this.callbacks = callbacks;

    // Kecepatan terbang & durasi jelajah ke gerbang berdasarkan pilihan tingkat kecepatan
    if (difficulty === 'EASY') {
      this.baseSpeed = 20;
      this.cruiseDistance = 380; // ~19 detik jelajah santai
    } else if (difficulty === 'MEDIUM') {
      this.baseSpeed = 26;
      this.cruiseDistance = 320; // ~12 detik jelajah standar
    } else {
      this.baseSpeed = 34;
      this.cruiseDistance = 270; // ~8 detik jelajah cepat
    }

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 720;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 1000);
    this.camera.position.set(0, 4, 9);

    // 2. Renderer setup per Three.js directives
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Environment & Aircraft
    this.environment = new GameEnvironment(this.scene);
    this.currentTheme = 'beach';
    this.environment.setTheme('beach');

    this.aircraft = new Aircraft(aircraftType);
    this.aircraft.mesh.position.copy(this.currentPos);
    this.scene.add(this.aircraft.mesh);

    this.particles = new ParticleSystem(this.scene);

    this.clock = new THREE.Clock();

    this.bindEvents();
    soundEngine.startEngine();
  }

  private touchStart = { x: 0, y: 0 };
  private isTouchDragging: boolean = false;

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd);
    this.container.addEventListener('touchcancel', this.onTouchEnd);
  }

  private unbindEvents() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onTouchEnd);
    this.container.removeEventListener('touchcancel', this.onTouchEnd);
  }

  private onTouchStart = (e: TouchEvent) => {
    if (this.isPaused || e.touches.length === 0) return;
    this.isTouchDragging = true;
    const t = e.touches[0];
    this.touchStart = { x: t.clientX, y: t.clientY };
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.isPaused || !this.isTouchDragging || e.touches.length === 0) return;
    const t = e.touches[0];
    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;

    // Smooth direct touch steering
    const sens = 0.012;
    this.inputMove.x = THREE.MathUtils.clamp(dx * sens, -1, 1);
    this.inputMove.y = THREE.MathUtils.clamp(-dy * sens, -1, 1);
  };

  private onTouchEnd = () => {
    this.isTouchDragging = false;
    this.inputMove.x = 0;
    this.inputMove.y = 0;
  };

  private onResize = () => {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth || window.innerWidth || 1280;
    const h = this.container.clientHeight || window.innerHeight || 720;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'a') this.inputMove.x = -1;
    if (key === 'arrowright' || key === 'd') this.inputMove.x = 1;
    if (key === 'arrowup' || key === 'w') this.inputMove.y = 1;
    if (key === 'arrowdown' || key === 's') this.inputMove.y = -1;
    if (key === ' ' || key === 'shift') {
      this.isBoosting = true;
      soundEngine.playWhooshSound();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if ((key === 'arrowleft' || key === 'a') && this.inputMove.x === -1) this.inputMove.x = 0;
    if ((key === 'arrowright' || key === 'd') && this.inputMove.x === 1) this.inputMove.x = 0;
    if ((key === 'arrowup' || key === 'w') && this.inputMove.y === 1) this.inputMove.y = 0;
    if ((key === 'arrowdown' || key === 's') && this.inputMove.y === -1) this.inputMove.y = 0;
    if (key === ' ' || key === 'shift') {
      this.isBoosting = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.mouseControlEnabled || this.isPaused) return;
    const rect = this.container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.mouseNormalized.x = Math.max(-1, Math.min(1, x));
    this.mouseNormalized.y = Math.max(-1, Math.min(1, y));
  };

  public setDirectSteering(x: number, y: number) {
    if (this.isPaused) return;
    this.inputMove.x = Math.max(-1, Math.min(1, x));
    this.inputMove.y = Math.max(-1, Math.min(1, y));
  }

  public setBoosting(boosting: boolean) {
    if (this.isPaused) return;
    this.isBoosting = boosting;
    if (boosting) soundEngine.playWhooshSound();
  }

  public toggleMouseControl(): boolean {
    this.mouseControlEnabled = !this.mouseControlEnabled;
    return this.mouseControlEnabled;
  }

  public isMouseControlActive(): boolean {
    return this.mouseControlEnabled;
  }

  public setAircraftModel(type: AircraftType) {
    this.aircraft.setAircraftType(type);
  }

  public setAircraftVisible(visible: boolean) {
    if (this.aircraft?.mesh) {
      this.aircraft.mesh.visible = visible;
    }
  }

  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.pauseDelayTimer = 0;
    this.pendingGateResult = null;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.records = [];
    this.clock.start();

    // Spawn first question gates at configured distance
    this.spawnQuestionGate(0);

    // Launch loop
    this.tick();
  }

  private spawnQuestionGate(index: number) {
    if (this.activeGateSet) {
      this.activeGateSet.dispose(this.scene);
      this.activeGateSet = null;
    }

    if (index >= this.questions.length) {
      this.finishGame();
      return;
    }

    const question = this.questions[index];
    this.currentQuestionIndex = index;
    this.questionStartTime = Date.now();

    const spawnZ = this.aircraft.mesh.position.z - this.cruiseDistance;
    this.activeGateSet = new QuestionGateSet(this.scene, question, spawnZ);

    this.callbacks.onQuestionStart(question, index, this.questions.length, this.currentTheme);
  }

  private handleGatePass(gateIndex: number) {
    const letters = ['A', 'B', 'C', 'D'];
    const gateLetter = letters[gateIndex] || 'A';

    this.particles.emitGateBurst(this.aircraft.mesh.position, true);
    soundEngine.playWhooshSound();

    this.pendingGateResult = { gateLetter };
    this.pauseDelayTimer = 0.4;
  }

  public recordAnswer(isCorrect: boolean, selectedOptionIndex: number, scoreGained: number) {
    const currentQ = this.questions[this.currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D'];
    const timeSpent = Math.max(1, Math.round((Date.now() - this.questionStartTime) / 1000));

    if (isCorrect) {
      this.combo += 1;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.score += scoreGained;
    } else {
      this.combo = 0;
    }

    const record: AnswerRecord = {
      questionId: currentQ.id,
      questionText: currentQ.question,
      selectedOption: `${letters[selectedOptionIndex] || '?'}: ${currentQ.options[selectedOptionIndex]}`,
      correctOption: `${letters[currentQ.correctIndex]}: ${currentQ.options[currentQ.correctIndex]}`,
      isCorrect,
      timeSpentSec: timeSpent,
      explanation: currentQ.explanation,
    };

    this.records.push(record);
  }

  public proceedToNextTrack() {
    if (this.activeGateSet) {
      this.activeGateSet.dispose(this.scene);
      this.activeGateSet = null;
    }

    const nextIndex = this.currentQuestionIndex + 1;
    if (nextIndex >= this.questions.length) {
      this.finishGame();
      return;
    }

    // Shift to next dynamic environment track!
    const nextTheme = ALL_THEMES[nextIndex % ALL_THEMES.length];
    this.currentTheme = nextTheme;
    this.environment.setTheme(nextTheme);
    this.callbacks.onTrackChanged(nextTheme);

    // Re-engage flight
    this.isPaused = false;
    this.pendingGateResult = null;
    this.pauseDelayTimer = 0;

    soundEngine.playWhooshSound();

    // Spawn next question gates ahead in this new track with the cruise distance
    this.spawnQuestionGate(nextIndex);
  }

  private finishGame() {
    this.isRunning = false;
    this.isPaused = false;
    soundEngine.playVictoryFanfare();
    this.callbacks.onGameComplete(this.records, this.score, this.maxCombo);
  }

  private tick = () => {
    if (!this.isRunning) return;

    this.animFrameId = requestAnimationFrame(this.tick);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.pauseDelayTimer > 0) {
      this.pauseDelayTimer -= delta;
      if (this.pauseDelayTimer <= 0 && this.pendingGateResult) {
        this.isPaused = true;
        const currentQ = this.questions[this.currentQuestionIndex];
        const nextTheme = ALL_THEMES[(this.currentQuestionIndex + 1) % ALL_THEMES.length];
        this.callbacks.onGatePierced(
          currentQ,
          this.currentQuestionIndex,
          this.questions.length,
          this.pendingGateResult.gateLetter,
          nextTheme
        );
      }
    }

    // 1. Calculate flight speed
    let currentSpeed = 0;
    const boostMult = this.isBoosting ? 1.55 : 1.0;

    if (!this.isPaused) {
      currentSpeed = this.baseSpeed * boostMult;
      soundEngine.updateEnginePitch(this.isBoosting ? 1.5 : 1.0);
      this.callbacks.onSpeedUpdate(Math.round(currentSpeed * 4.5));

      // 2. Update Aircraft Forward Velocity along -Z
      this.currentPos.z -= currentSpeed * delta;

      // 3. User Steering Physics
      let steerX = this.inputMove.x;
      let steerY = this.inputMove.y;

      if (this.mouseControlEnabled) {
        steerX = this.mouseNormalized.x * 1.5;
        steerY = this.mouseNormalized.y * 1.2;
      }

      const turnSpeedX = 18.0;
      const turnSpeedY = 14.0;
      this.targetPos.x += steerX * turnSpeedX * delta;
      this.targetPos.y += steerY * turnSpeedY * delta;

      this.targetPos.x = THREE.MathUtils.clamp(this.targetPos.x, this.MIN_X, this.MAX_X);
      this.targetPos.y = THREE.MathUtils.clamp(this.targetPos.y, this.MIN_Y, this.MAX_Y);

      this.currentPos.x = THREE.MathUtils.damp(this.currentPos.x, this.targetPos.x, 8.0, delta);
      this.currentPos.y = THREE.MathUtils.damp(this.currentPos.y, this.targetPos.y, 8.0, delta);
      this.aircraft.mesh.position.copy(this.currentPos);

      // Aircraft dynamic banking and pitching angles
      this.targetRoll = -steerX * 0.55;
      this.targetYaw = steerX * 0.18;
      this.targetPitch = steerY * 0.28;

      this.aircraft.mesh.rotation.z = THREE.MathUtils.damp(this.aircraft.mesh.rotation.z, this.targetRoll, 7.0, delta);
      this.aircraft.mesh.rotation.y = THREE.MathUtils.damp(this.aircraft.mesh.rotation.y, this.targetYaw, 6.0, delta);
      this.aircraft.mesh.rotation.x = THREE.MathUtils.damp(this.aircraft.mesh.rotation.x, this.targetPitch, 6.0, delta);

      // Contrail particle emissions from wingtips
      const leftTipWorld = this.aircraft.wingLeftTip.clone().applyMatrix4(this.aircraft.mesh.matrixWorld);
      const rightTipWorld = this.aircraft.wingRightTip.clone().applyMatrix4(this.aircraft.mesh.matrixWorld);
      this.particles.emitTrail(leftTipWorld, rightTipWorld);
    } else {
      this.callbacks.onSpeedUpdate(0);
      soundEngine.updateEnginePitch(0.1);
      this.aircraft.mesh.rotation.z = THREE.MathUtils.damp(this.aircraft.mesh.rotation.z, 0, 4.0, delta);
      this.aircraft.mesh.rotation.x = THREE.MathUtils.damp(this.aircraft.mesh.rotation.x, 0, 4.0, delta);
    }

    // Aircraft updates (rotors/props spin)
    this.aircraft.update(delta, this.isPaused ? 0.35 : boostMult);

    // Third-Person Chase Camera Follow
    const cameraTargetX = this.currentPos.x * 0.72;
    const cameraTargetY = this.currentPos.y * 0.45 + 3.2;
    const cameraTargetZ = this.currentPos.z + (this.isPaused ? 7.2 : 8.5);

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, cameraTargetX, 7.0, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, cameraTargetY, 7.0, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, cameraTargetZ, 12.0, delta);

    const lookTarget = new THREE.Vector3(
      this.currentPos.x * 0.8,
      this.currentPos.y * 0.5 + 0.6,
      this.currentPos.z - 22
    );
    this.camera.lookAt(lookTarget);

    // Environment & Clouds update
    this.environment.update(delta, this.currentPos.z, currentSpeed);

    // Question Gates Update & Collision Check
    if (this.activeGateSet && !this.isPaused && this.pauseDelayTimer <= 0) {
      const collisionResult = this.activeGateSet.update(delta, this.currentPos);
      if (collisionResult && collisionResult.answered) {
        this.handleGatePass(collisionResult.gateIndex);
      }
    }

    this.particles.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  public restart(topic: QuizTopic, difficulty: FlightDifficulty) {
    this.currentTopic = topic;
    this.questions = [...topic.questions];
    this.difficulty = difficulty;

    if (difficulty === 'EASY') {
      this.baseSpeed = 20;
      this.cruiseDistance = 380;
    } else if (difficulty === 'MEDIUM') {
      this.baseSpeed = 26;
      this.cruiseDistance = 320;
    } else {
      this.baseSpeed = 34;
      this.cruiseDistance = 270;
    }

    this.environment.setTheme('beach');

    this.currentPos.set(0, 1.0, 0);
    this.targetPos.set(0, 1.0, 0);
    this.aircraft.mesh.position.copy(this.currentPos);
    this.aircraft.mesh.rotation.set(0, 0, 0);

    this.camera.position.set(0, 4, 9);
    this.start();
  }

  public dispose() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.unbindEvents();
    soundEngine.stopAll();

    if (this.activeGateSet) {
      this.activeGateSet.dispose(this.scene);
    }

    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
