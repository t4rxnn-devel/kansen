import React from 'react';
import { Award, X, ShieldCheck, Download, Share2 } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { UserSession } from './UserIdentityModal';

interface MasterCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  fabCompletedCount: number;
  fabTotalCount: number;
  edaCompletedCount: number;
  edaTotalCount: number;
  userSession?: UserSession;
}

export const MasterCertificateModal: React.FC<MasterCertificateModalProps> = ({
  isOpen,
  onClose,
  fabCompletedCount,
  fabTotalCount,
  edaCompletedCount,
  edaTotalCount,
  userSession
}) => {
  if (!isOpen) return null;

  const isFullCertified = fabCompletedCount === fabTotalCount;
  const certHash = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}-KANSEN-3NM`;

  const handleLinkedInShare = () => {
    soundFx.playClick();
    const text = encodeURIComponent(
      `I have officially earned the Master Semiconductor Fabrication & 3nm EDA Certificate on KANSEN SILICON NET V4.0! Security Clearance: ${userSession?.securityId || 'SEC-L5'}.`
    );
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${text}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#050505] border-2 border-[#dc2626] w-full max-w-2xl rounded-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.5)] relative">
        {/* Modal Close Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 p-1.5 bg-[#000000] hover:bg-[#dc2626] text-zinc-400 hover:text-white rounded transition border border-zinc-700 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Inner Canvas */}
        <div className="p-8 bg-[#000000] text-center space-y-6 border border-[#dc2626]/30 m-3 rounded">
          {/* Top Emblem */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#000000] border-2 border-[#dc2626] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-pulse">
              <Award className="w-9 h-9 text-[#dc2626]" />
            </div>
          </div>

          <div>
            <div className="text-xs font-mono font-bold text-[#dc2626] tracking-widest uppercase">
              KANSEN CORPORATION // SEMICONDUCTOR FAB DIVISION
            </div>
            <h1 className="font-orbitron font-black text-2xl text-white tracking-wider mt-1">
              MASTER FABRICATION & EDA CERTIFICATE
            </h1>
            <p className="text-xs text-zinc-400 font-tech mt-1">
              AUTHENTICATED SECURITY CREDENTIAL // CLASSIFIED TIER-5 CLEARANCE
            </p>
          </div>

          <div className="bg-[#050505] border border-[#18181b] p-4 rounded text-xs space-y-2 text-left">
            <div className="flex justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-zinc-500">OPERATIVE NAME:</span>
              <span className="text-white font-bold font-mono">{userSession?.corporateName || 'OPERATIVE-094-KANSEN'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-zinc-500">SECURITY ID:</span>
              <span className="text-[#dc2626] font-bold font-mono">{userSession?.securityId || 'SEC-8829-CLEARANCE-L5'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-zinc-500">DEPARTMENT CODE:</span>
              <span className="text-zinc-300 font-mono">{userSession?.departmentCode || 'FAB-DEPT-3NM-GAA'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-zinc-500">FABRICATOR CERTIFICATION:</span>
              <span className={isFullCertified ? 'text-emerald-400 font-bold' : 'text-[#dc2626]'}>
                {isFullCertified ? '100% COMPLETE [FULL ISO-3 SEAL]' : `${fabCompletedCount}/${fabTotalCount} MODULES COMPLETED`}
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-zinc-500">RTL EDA COMPLIANCE:</span>
              <span className="text-white font-bold">
                {edaCompletedCount}/{edaTotalCount} VERILOG LABS VERIFIED
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">VERIFICATION HASH STAMP:</span>
              <span className="text-emerald-400 font-mono text-[10px]">{certHash}</span>
            </div>
          </div>

          {/* Badges Earned Checklist */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-[#050505] p-2 rounded border border-zinc-800 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#dc2626]" />
              <span className="text-zinc-300 font-bold">CZ INGOT</span>
            </div>
            <div className="bg-[#050505] p-2 rounded border border-zinc-800 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span className="text-zinc-300 font-bold">EUV LITHO</span>
            </div>
            <div className="bg-[#050505] p-2 rounded border border-zinc-800 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#dc2626]" />
              <span className="text-zinc-300 font-bold">RIE ETCH</span>
            </div>
            <div className="bg-[#050505] p-2 rounded border border-zinc-800 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-300 font-bold">ISO-3 CLEAN</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => {
                soundFx.playClick();
                window.print();
              }}
              className="px-4 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-orbitron font-bold text-xs rounded border border-[#dc2626] shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PRINT / EXPORT PDF
            </button>
            <button
              onClick={handleLinkedInShare}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-orbitron font-bold text-xs rounded border border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              SHARE TO LINKEDIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

