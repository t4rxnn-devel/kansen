import React, { useState } from 'react';
import { FabModule } from '../types';
import { CheckCircle2, Award, ShieldCheck, Zap, Sliders } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import confetti from 'canvas-confetti';

interface FabCertificationViewProps {
  module: FabModule;
  onCompleteModule: (moduleId: string) => void;
}

export const FabCertificationView: React.FC<FabCertificationViewProps> = ({
  module,
  onCompleteModule
}) => {
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [sliderVals, setSliderVals] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    module.steps.forEach((step, idx) => {
      if (step.interactiveControl) {
        initial[idx] = step.interactiveControl.defaultVal;
      }
    });
    return initial;
  });

  const activeStep = module.steps[activeStepIdx];

  const handleSliderChange = (stepIdx: number, val: number) => {
    setSliderVals(prev => ({ ...prev, [stepIdx]: val }));
  };

  const handleQuizSelect = (qIdx: number, optIdx: number) => {
    soundFx.playClick();
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleGradeQuiz = () => {
    let correctCount = 0;
    module.quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    setQuizSubmitted(true);
    if (correctCount === module.quiz.length) {
      soundFx.playSynthPass();
      setQuizPassed(true);
      onCompleteModule(module.id);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Confetti fallback
      }
    } else {
      soundFx.playError();
      setQuizPassed(false);
    }
  };

  return (
    <div className="flex-1 bg-[#000000] border border-[#18181b] rounded overflow-y-auto p-4 flex flex-col gap-4 font-mono select-none">
      {/* Module Banner Header */}
      <div className="bg-[#050505] border border-[#dc2626] p-4 rounded relative shadow-[0_0_20px_rgba(220,38,38,0.2)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#dc2626]/20 text-[#dc2626] text-[10px] font-bold px-2 py-0.5 rounded border border-[#dc2626]/40">
                {module.clearanceLevel}
              </span>
              <span className="text-xs text-white font-bold font-tech">
                WAFER LAYER: {module.waferLayer.toUpperCase()}
              </span>
            </div>
            <h2 className="font-orbitron font-black text-xl text-white tracking-wider">
              {module.title}
            </h2>
            <p className="text-zinc-300 text-xs font-tech mt-1 max-w-3xl">
              {module.description}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            {module.completed ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/60 rounded font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                {module.badgeName}
              </div>
            ) : (
              <div className="text-[10px] text-[#dc2626] bg-[#dc2626]/10 border border-[#dc2626]/40 px-2.5 py-1 rounded">
                CERTIFICATION INCOMPLETE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Physics Steps Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {module.steps.map((step, idx) => (
          <button
            key={step.stepNumber}
            onClick={() => {
              soundFx.playClick();
              setActiveStepIdx(idx);
            }}
            className={`p-3 rounded border text-left transition relative ${
              activeStepIdx === idx 
                ? 'bg-[#dc2626]/20 border-[#dc2626] text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                : 'bg-[#050505] hover:bg-zinc-900 border-[#18181b] text-zinc-400'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold mb-1">
              <span>STEP 0{step.stepNumber}</span>
              {step.interactiveControl && <Sliders className="w-3 h-3 text-[#dc2626]" />}
            </div>
            <div className="font-bold text-xs text-white truncate">{step.title}</div>
            <div className="text-[10px] text-zinc-400 truncate mt-0.5">{step.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Selected Walkthrough Step Details */}
      {activeStep && (
        <div className="bg-[#050505] border border-[#18181b] p-4 rounded space-y-3">
          <div className="flex items-center justify-between border-b border-[#18181b] pb-2">
            <h3 className="font-orbitron font-bold text-sm text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#dc2626]" />
              STEP 0{activeStep.stepNumber}: {activeStep.title}
            </h3>
            <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
              {activeStep.keyMetric}
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {activeStep.description}
          </p>

          {activeStep.formulaOrParam && (
            <div className="bg-[#000000] border border-[#18181b] p-2.5 rounded text-xs font-mono text-white">
              <span className="text-zinc-500 font-bold">PHYSICAL GOVERNING EQUATION: </span>
              {activeStep.formulaOrParam}
            </div>
          )}

          {/* Interactive Parameter Tuning Slider */}
          {activeStep.interactiveControl && (
            <div className="bg-[#000000] border border-zinc-800 p-3 rounded space-y-2 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#dc2626]" />
                  TUNING PARAMETER: {activeStep.interactiveControl.name}
                </span>
                <span className="font-tech text-white font-bold bg-[#050505] px-2 py-0.5 rounded border border-zinc-800">
                  {sliderVals[activeStepIdx] ?? activeStep.interactiveControl.defaultVal} {activeStep.interactiveControl.unit}
                </span>
              </div>

              <input
                type="range"
                min={activeStep.interactiveControl.min}
                max={activeStep.interactiveControl.max}
                value={sliderVals[activeStepIdx] ?? activeStep.interactiveControl.defaultVal}
                onChange={(e) => handleSliderChange(activeStepIdx, Number(e.target.value))}
                className="w-full accent-[#dc2626] cursor-pointer"
              />

              <p className="text-[11px] text-zinc-400">
                {activeStep.interactiveControl.impactDescription}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Certification Knowledge Quiz Section */}
      <div className="bg-[#050505] border border-[#18181b] p-4 rounded space-y-4">
        <div className="flex items-center justify-between border-b border-[#18181b] pb-2">
          <h3 className="font-orbitron font-bold text-sm text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-[#dc2626]" />
            FAB KNOWLEDGE EXAMINATION & BADGE VERIFICATION
          </h3>
          <span className="text-[10px] text-zinc-400">SCORE 100% TO CERTIFY</span>
        </div>

        <div className="space-y-4">
          {module.quiz.map((q, qIdx) => (
            <div key={qIdx} className="bg-[#000000] border border-zinc-800 p-3 rounded space-y-2">
              <div className="text-xs font-bold text-zinc-200">
                Q{qIdx + 1}: {q.question}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {q.options.map((opt, optIdx) => {
                  const isSelected = quizAnswers[qIdx] === optIdx;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleQuizSelect(qIdx, optIdx)}
                      className={`p-2 rounded text-left border transition ${
                        isSelected 
                          ? 'bg-[#dc2626]/20 border-[#dc2626] text-white font-bold' 
                          : 'bg-[#050505] hover:bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {quizSubmitted && (
                <div className={`text-[11px] p-2 rounded ${
                  quizAnswers[qIdx] === q.correctAnswer 
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' 
                    : 'bg-rose-950/40 text-rose-300 border border-rose-800'
                }`}>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleGradeQuiz}
            className="px-5 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-orbitron font-bold text-xs rounded border border-[#dc2626] shadow-[0_0_15px_rgba(220,38,38,0.4)] transition flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            SUBMIT EXAMINATION & CLAIM BADGE
          </button>
        </div>
      </div>
    </div>
  );
};
