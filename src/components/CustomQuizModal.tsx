import React, { useState, useRef } from 'react';
import { QuizTopic, Question } from '../types/game';
import { saveCustomTopic } from '../data/quizData';
import {
  Plus,
  Trash2,
  X,
  Sparkles,
  Download,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CustomQuizModalProps {
  onClose: () => void;
  onSaved: (topic: QuizTopic) => void;
}

export const CustomQuizModal: React.FC<CustomQuizModalProps> = ({ onClose, onSaved }) => {
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'custom-1',
      question: 'Berapakah hasil dari 25 x 4?',
      options: ['80', '100', '120', '150'],
      correctIndex: 1,
      explanation: '25 dikali 4 sama dengan 100.',
    },
    {
      id: 'custom-2',
      question: 'Planet terdekat dengan Matahari dalam tata surya adalah?',
      options: ['Venus', 'Bumi', 'Merkurius', 'Mars'],
      correctIndex: 2,
      explanation: 'Merkurius adalah planet terdekat dari Matahari.',
    },
  ]);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${prev.length + 1}`,
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index].question = text;
      return updated;
    });
  };

  const updateOption = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex].options[optIndex] = text;
      return updated;
    });
  };

  const updateCorrectIndex = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex].correctIndex = optIndex;
      return updated;
    });
  };

  // Unduh Template Excel (.xlsx)
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        'No': 1,
        'Pertanyaan': 'Berapakah hasil dari 15 x 6?',
        'Pilihan A': '70',
        'Pilihan B': '85',
        'Pilihan C': '90',
        'Pilihan D': '95',
        'Kunci Jawaban (A/B/C/D)': 'C',
      },
      {
        'No': 2,
        'Pertanyaan': 'Organ tubuh manusia yang berfungsi memompa darah adalah?',
        'Pilihan A': 'Paru-paru',
        'Pilihan B': 'Jantung',
        'Pilihan C': 'Hati',
        'Pilihan D': 'Ginjal',
        'Kunci Jawaban (A/B/C/D)': 'B',
      },
      {
        'No': 3,
        'Pertanyaan': 'Ibukota negara Indonesia saat ini adalah?',
        'Pilihan A': 'Jakarta',
        'Pilihan B': 'Surabaya',
        'Pilihan C': 'Medan',
        'Pilihan D': 'Bandung',
        'Kunci Jawaban (A/B/C/D)': 'A',
      },
      {
        'No': 4,
        'Pertanyaan': 'What is the opposite of "Fast"?',
        'Pilihan A': 'Quick',
        'Pilihan B': 'Slow',
        'Pilihan C': 'Loud',
        'Pilihan D': 'Heavy',
        'Kunci Jawaban (A/B/C/D)': 'B',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 50 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 26 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Soal_Kuis');
    XLSX.writeFile(workbook, 'Template_Soal_SkyQuiz.xlsx');
  };

  // Unduh Template CSV (.csv)
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Kunci Jawaban (A/B/C/D)\n' +
      '1,Berapakah hasil dari 15 x 6?,70,85,90,95,C\n' +
      '2,Organ tubuh manusia yang memompa darah adalah?,Paru-paru,Jantung,Hati,Ginjal,B\n' +
      '3,Ibukota negara Indonesia adalah?,Jakarta,Surabaya,Medan,Bandung,A\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Soal_SkyQuiz.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Process Excel/CSV File
  const processUploadedFile = (file: File) => {
    setErrorMessage(null);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Safe conversion to 2D array
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[];
        const rows = rawJson as (string | number | undefined)[][];

        if (!rows || rows.length < 2) {
          setErrorMessage('Berkas Excel/CSV kosong atau tidak memiliki baris data!');
          return;
        }

        const importedQuestions: Question[] = [];

        // Skip header row at index 0
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          let qText = '';
          let optA = '';
          let optB = '';
          let optC = '';
          let optD = '';
          let rawKey = 'A';

          if (row.length >= 7) {
            qText = String(row[1] ?? '').trim();
            optA = String(row[2] ?? '').trim();
            optB = String(row[3] ?? '').trim();
            optC = String(row[4] ?? '').trim();
            optD = String(row[5] ?? '').trim();
            rawKey = String(row[6] ?? 'A').trim().toUpperCase();
          } else if (row.length >= 6) {
            qText = String(row[0] ?? '').trim();
            optA = String(row[1] ?? '').trim();
            optB = String(row[2] ?? '').trim();
            optC = String(row[3] ?? '').trim();
            optD = String(row[4] ?? '').trim();
            rawKey = String(row[5] ?? 'A').trim().toUpperCase();
          }

          if (!qText || !optA) continue;

          let correctIdx = 0;
          if (rawKey.startsWith('B') || rawKey === '1' || rawKey === '2') {
            correctIdx = 1;
          } else if (rawKey.startsWith('C') || rawKey === '2' || rawKey === '3') {
            correctIdx = 2;
          } else if (rawKey.startsWith('D') || rawKey === '3' || rawKey === '4') {
            correctIdx = 3;
          }

          importedQuestions.push({
            id: `excel-${Date.now()}-${i}`,
            question: qText,
            options: [optA, optB || 'Pilihan B', optC || 'Pilihan C', optD || 'Pilihan D'],
            correctIndex: correctIdx,
            explanation: `Kunci jawaban yang benar adalah pilihan ${['A', 'B', 'C', 'D'][correctIdx]}.`,
          });
        }

        if (importedQuestions.length > 0) {
          setQuestions(importedQuestions);
          setImportStatus(`✅ Sukses mengimpor ${importedQuestions.length} soal dari "${file.name}"!`);
          setTimeout(() => setImportStatus(null), 5000);
        } else {
          setErrorMessage('Tidak ditemukan baris pertanyaan yang valid. Pastikan format kolom sesuai template.');
        }
      } catch (err) {
        console.error('File parsing error', err);
        setErrorMessage('Gagal memproses berkas. Pastikan format Excel (.xlsx) atau CSV valid.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleSaveAndLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMessage(`Pertanyaan #${i + 1} belum diisi!`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          setErrorMessage(`Pilihan ${['A', 'B', 'C', 'D'][j]} pada soal #${i + 1} belum diisi!`);
          return;
        }
      }
    }

    const autoTitle = `Kuis Mandiri (${questions.length} Soal)`;
    const newTopic: QuizTopic = {
      id: `custom-${Date.now()}`,
      title: autoTitle,
      description: `${questions.length} Soal kuis kustom siap dimainkan di angkasa.`,
      icon: 'BookOpen',
      theme: 'beach',
      questions,
    };

    saveCustomTopic(newTopic);
    onSaved(newTopic);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto select-none animate-in fade-in">
      <div className="bg-slate-900 border border-sky-500/30 rounded-3xl max-w-2xl w-full p-4 sm:p-6 text-white shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Buat Soal Kuis Sendiri
                <span className="text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full">
                  Instan
                </span>
              </h3>
              <p className="text-xs text-sky-200/80">Tulis langsung atau impor dari file Excel / CSV</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Excel Tools: Unduh Template & Impor Berkas */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`mt-4 p-3.5 rounded-2xl border transition-all ${
            isDragOver
              ? 'bg-sky-950/70 border-sky-400 ring-2 ring-sky-400/40'
              : 'bg-slate-800/80 border-slate-700/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                Impor & Template Excel:
              </span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Tarik & letakkan berkas Excel/CSV ke sini, atau klik tombol di bawah
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-sky-300 hover:text-white rounded-xl border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Unduh format tabel Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Template Excel</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95"
                title="Unduh format teks CSV"
              >
                <span>.CSV</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor File</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {importStatus && (
          <div className="mt-3 p-2.5 bg-emerald-950/70 border border-emerald-400/50 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{importStatus}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-2.5 bg-rose-950/70 border border-rose-500/50 rounded-xl text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Questions Editor */}
        <form onSubmit={handleSaveAndLaunch} className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Daftar Soal ({questions.length})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addQuestion}
                className="px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Soal</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="max-h-72 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-md">
                    Pertanyaan #{qIndex + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Pilih radio untuk jawaban benar:</span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        title="Hapus soal ini"
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  required
                  placeholder={`Tulis pertanyaan #${qIndex + 1}...`}
                  value={q.question}
                  onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400 font-semibold placeholder-slate-500"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {['A', 'B', 'C', 'D'].map((letter, optIndex) => (
                    <div
                      key={letter}
                      className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                        q.correctIndex === optIndex
                          ? 'bg-emerald-950/70 border-emerald-400 ring-1 ring-emerald-400/40 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-700/80 text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctIndex === optIndex}
                        onChange={() => updateCorrectIndex(qIndex, optIndex)}
                        className="accent-emerald-400 w-4 h-4 cursor-pointer ml-1"
                        title="Klik untuk menandai pilihan ini sebagai jawaban benar"
                      />
                      <span className="text-xs font-black text-sky-400">{letter}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`Pilihan ${letter}`}
                        value={q.options[optIndex]}
                        onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                        className="w-full bg-transparent text-xs text-white focus:outline-none placeholder-slate-500 font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              Total Soal Siap: <strong className="text-amber-300 font-bold">{questions.length}</strong>
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 hover:from-sky-300 hover:to-emerald-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-sky-500/25 cursor-pointer uppercase tracking-wider active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simpan & Mainkan</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
