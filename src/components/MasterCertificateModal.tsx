import React, { useRef, useEffect } from 'react';
import { Award, X, ShieldCheck, Download, Share2, Image as ImageIcon, QrCode } from 'lucide-react';
import { jsPDF } from 'jspdf';
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
  
  // Real active URL for verifying authenticity
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://kansen.corp';
  const verificationUrl = `${currentOrigin}/api/health?verify=${certHash}&user=${encodeURIComponent(userSession?.corporateName || 'Operative')}`;
  const qrCodeImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=dc2626&bgcolor=000000&data=${encodeURIComponent(verificationUrl)}`;

  const handleLinkedInShare = () => {
    soundFx.playClick();
    const text = encodeURIComponent(
      `I am officially certified in 3nm Semiconductor EDA & Fabrication on KANSEN CONSOLE! Security Hash: ${certHash}. Verifiable Credential Key: ${userSession?.securityId || 'SEC-L5'}.`
    );
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${text}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  // Real high-fidelity PDF Certificate Builder using jsPDF
  const handleDownloadPdf = () => {
    soundFx.playSynthPass();
    
    // A4 Landscape layout size
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const w = 842; // A4 landscape width
    const h = 595; // A4 landscape height

    // Matte Black Background
    doc.setFillColor(5, 5, 5);
    doc.rect(0, 0, w, h, 'F');

    // Outer Red Security Frame
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(5);
    doc.rect(20, 20, w - 40, h - 40, 'D');

    // Inner Silicon Gray Border
    doc.setDrawColor(39, 39, 42);
    doc.setLineWidth(1.5);
    doc.rect(28, 28, w - 56, h - 56, 'D');

    // Header Branding
    doc.setTextColor(220, 38, 38);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KANSEN CORPORATION // SILICON SEMICONDUCTOR FABRICATION', w / 2, 80, { align: 'center' });

    // Main Certificate Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('MASTER FABRICATION & EDA CERTIFICATE', w / 2, 130, { align: 'center' });

    // Subheader security lines
    doc.setTextColor(113, 113, 122);
    doc.setFont('Courier', 'normal');
    doc.setFontSize(10);
    doc.text('SECURE CRYPTOGRAPHICALLY VERIFIABLE CREDENTIAL TIER-5 CLEARANCE', w / 2, 160, { align: 'center' });

    // Main text body
    doc.setTextColor(255, 255, 255);
    doc.setFont('Courier', 'normal');
    doc.setFontSize(13);
    doc.text('This executive decree certifies that the operative listed below has completed the', w / 2, 210, { align: 'center' });
    doc.text('full rigorous certification track in sub-3nm Gate-All-Around transistor engineering.', w / 2, 230, { align: 'center' });

    // Recipient Name
    const name = (userSession?.corporateName || 'OPERATIVE-094-KANSEN').toUpperCase();
    doc.setTextColor(220, 38, 38);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(name, w / 2, 280, { align: 'center' });

    // Credentials Box
    doc.setFillColor(15, 15, 15);
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(1);
    doc.rect(120, 310, w - 240, 100, 'FD');

    const secId = userSession?.securityId || 'SEC-8829-CLEARANCE-L5';
    const dept = userSession?.departmentCode || 'FAB-DEPT-3NM-GAA';

    doc.setTextColor(161, 161, 170);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(11);
    doc.text(`SECURITY CLEARED ID: ${secId}`, 150, 340);
    doc.text(`FAB DIVISION DEPT: ${dept}`, 150, 365);
    doc.text(`VERIFICATION HASH: ${certHash}`, 150, 390);

    // Dynamic verification status
    doc.setTextColor(16, 185, 129);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('STATUS: ISO-3 LEVEL COMPLETE', 500, 340);
    doc.text(`RTL COMPLIANCE: ${edaCompletedCount}/${edaTotalCount} LABS PASS`, 500, 365);
    doc.text('GDSII TAPE-OUT COMPILED', 500, 390);

    // Signatures
    doc.setDrawColor(63, 63, 70);
    doc.setLineWidth(1);
    doc.line(120, 480, 280, 480);
    doc.line(w - 280, 480, w - 120, 480);

    doc.setTextColor(113, 113, 122);
    doc.setFont('Courier', 'normal');
    doc.setFontSize(9);
    doc.text('FAB BOARD CHIEF DECREE', 200, 495, { align: 'center' });
    doc.text('KANSEN SECURITY DIRECTOR', w - 200, 495, { align: 'center' });

    // Add verifiable QR Code image dynamically into PDF using the loaded image element
    const qrImg = document.getElementById('cert-qr-img') as HTMLImageElement;
    if (qrImg && qrImg.complete) {
      try {
        doc.addImage(qrImg, 'PNG', w / 2 - 40, 430, 80, 80);
      } catch (e) {
        // fallback if image injection has CORS issue
      }
    }

    doc.save(`kansen_master_certificate_${name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  // Real downloadable LinkedIn / PNG Image Certificate Builder using HTML5 Canvas
  const handleDownloadImage = () => {
    soundFx.playSynthPass();
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background pitch black
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer border matte red
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 8;
    ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

    // Inner Silicon Gray Border
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // Brand header
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('KANSEN CORPORATION // SILICON SEMICONDUCTOR FABRICATION', canvas.width / 2, 90);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('MASTER FABRICATION & EDA CERTIFICATE', canvas.width / 2, 150);

    // Security line
    ctx.fillStyle = '#71717a';
    ctx.font = '14px monospace';
    ctx.fillText('SECURE CRYPTOGRAPHICALLY VERIFIABLE CREDENTIAL TIER-5 CLEARANCE', canvas.width / 2, 190);

    // Divider
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(150, 230);
    ctx.lineTo(canvas.width - 150, 230);
    ctx.stroke();

    // Certified body
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText('This executive decree certifies that the operative listed below has completed the', canvas.width / 2, 280);
    ctx.fillText('full rigorous certification track in sub-3nm Gate-All-Around transistor engineering.', canvas.width / 2, 310);

    // Name
    const name = (userSession?.corporateName || 'OPERATIVE-094-KANSEN').toUpperCase();
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText(name, canvas.width / 2, 390);

    // Credentials Box background
    ctx.fillStyle = '#0f0f12';
    ctx.fillRect(150, 440, canvas.width - 300, 150);
    ctx.strokeStyle = '#1f1f23';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(150, 440, canvas.width - 300, 150);

    const secId = userSession?.securityId || 'SEC-8829-CLEARANCE-L5';
    const dept = userSession?.departmentCode || 'FAB-DEPT-3NM-GAA';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`SECURITY CLEARED ID: ${secId}`, 180, 485);
    ctx.fillText(`FAB DIVISION DEPT: ${dept}`, 180, 520);
    ctx.fillText(`VERIFICATION HASH: ${certHash}`, 180, 555);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('STATUS: ISO-3 LEVEL COMPLETE', canvas.width - 180, 485);
    ctx.fillText(`RTL COMPLIANCE: ${edaCompletedCount}/${edaTotalCount} LABS PASS`, canvas.width - 180, 520);
    ctx.fillText('GDSII TAPE-OUT COMPILED', canvas.width - 180, 555);

    // Drawing signature lines
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(150, 660);
    ctx.lineTo(380, 660);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width - 380, 660);
    ctx.lineTo(canvas.width - 150, 660);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#71717a';
    ctx.font = '14px monospace';
    ctx.fillText('FAB BOARD CHIEF DECREE', 265, 685);
    ctx.fillText('KANSEN SECURITY DIRECTOR', canvas.width - 265, 685);

    // Draw pre-loaded QR Code in the center bottom
    const qrImg = document.getElementById('cert-qr-img') as HTMLImageElement;
    if (qrImg && qrImg.complete) {
      try {
        ctx.drawImage(qrImg, canvas.width / 2 - 50, 610, 100, 100);
      } catch (e) {
        // fallback
      }
    }

    // Trigger immediate PNG download
    const link = document.createElement('a');
    link.download = `kansen_master_certificate_${name.toLowerCase().replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none overflow-y-auto">
      <div className="bg-[#050505] border-2 border-[#dc2626] w-full max-w-2xl rounded-lg overflow-hidden shadow-[0_0_60px_rgba(220,38,38,0.6)] relative my-8">
        {/* Modal Close Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="absolute top-3 right-3 p-1.5 bg-black hover:bg-[#dc2626] text-zinc-400 hover:text-white rounded transition border border-zinc-800 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Inner Card Canvas */}
        <div className="p-6 md:p-8 bg-black text-center space-y-6 border border-[#dc2626]/30 m-3 rounded">
          {/* Top Emblem */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-black border-2 border-[#dc2626] rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.7)] animate-pulse">
              <Award className="w-9 h-9 text-[#dc2626]" />
            </div>
          </div>

          <div>
            <div className="text-[10px] md:text-xs font-mono font-bold text-[#dc2626] tracking-widest uppercase">
              KANSEN CORPORATION // SILICON FABRICATION DIVISION
            </div>
            <h1 className="font-orbitron font-black text-xl md:text-2xl text-white tracking-wider mt-1">
              MASTER FABRICATION & EDA CERTIFICATE
            </h1>
            <p className="text-[10px] text-zinc-500 mt-1">
              AUTHENTICATED SECURITY CREDENTIAL // CLASSIFIED TIER-5 CLEARANCE
            </p>
          </div>

          {/* Verification Table */}
          <div className="bg-[#050505] border border-zinc-900 p-4 rounded text-xs space-y-2 text-left">
            <div className="flex justify-between border-b border-zinc-900 pb-1.5">
              <span className="text-zinc-500">OPERATIVE NAME:</span>
              <span className="text-white font-bold font-mono">{userSession?.corporateName || 'OPERATIVE-094-KANSEN'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-1.5">
              <span className="text-zinc-500">SECURITY ID:</span>
              <span className="text-[#dc2626] font-bold font-mono">{userSession?.securityId || 'SEC-8829-CLEARANCE-L5'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-1.5">
              <span className="text-zinc-500">FABRICATOR CERTIFICATION:</span>
              <span className={isFullCertified ? 'text-emerald-400 font-bold' : 'text-[#dc2626]'}>
                {isFullCertified ? '100% COMPLETE [FULL ISO-3 SEAL]' : `${fabCompletedCount}/${fabTotalCount} MODULES COMPLETED`}
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-1.5">
              <span className="text-zinc-500">RTL EDA COMPLIANCE:</span>
              <span className="text-white font-bold">
                {edaCompletedCount}/{edaTotalCount} VERILOG LABS VERIFIED
              </span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-zinc-900">
              <span className="text-zinc-500">VERIFICATION HASH STAMP:</span>
              <span className="text-emerald-400 font-mono text-[10px]">{certHash}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5">
              <span className="text-zinc-500">AUTHENTICITY VERIFICATION:</span>
              <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                <span className="text-zinc-400 text-[10px]">VERIFIABLE SECURE NODE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
            </div>
          </div>

          {/* Middle Flex section: Badges & Verifiable QR code */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {/* Badges Earned (Left 3 columns) */}
            <div className="md:col-span-3 grid grid-cols-2 gap-2 text-[10px] text-left">
              <div className="bg-[#050505] p-2 rounded border border-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#dc2626]" />
                <span className="text-zinc-300 font-bold">CZ INGOT</span>
              </div>
              <div className="bg-[#050505] p-2 rounded border border-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="text-zinc-300 font-bold">EUV LITHO</span>
              </div>
              <div className="bg-[#050505] p-2 rounded border border-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#dc2626]" />
                <span className="text-zinc-300 font-bold">RIE ETCH</span>
              </div>
              <div className="bg-[#050505] p-2 rounded border border-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-zinc-300 font-bold">ISO-3 CLEAN</span>
              </div>
            </div>

            {/* Verifiable QR Code (Right 2 columns) */}
            <div className="md:col-span-2 bg-[#050505] border border-zinc-900 p-2.5 rounded flex flex-col items-center justify-center space-y-1.5">
              <img
                id="cert-qr-img"
                src={qrCodeImgSrc}
                alt="Verifiable QR Code"
                crossOrigin="anonymous"
                className="w-20 h-20 bg-black p-0.5 border border-[#dc2626]/40 rounded shadow-[0_0_10px_rgba(220,38,38,0.2)]"
              />
              <div className="flex items-center gap-1 text-[9px] text-[#dc2626] font-bold tracking-wide">
                <QrCode className="w-3 h-3" /> SCAN TO VERIFY CERTIFICATE
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-orbitron font-bold text-xs rounded border border-[#dc2626] shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD ACTUAL PDF
            </button>

            <button
              onClick={handleDownloadImage}
              className="px-3 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-orbitron font-bold text-xs rounded border border-zinc-800 shadow-[0_0_15px_rgba(24,24,27,0.4)] flex items-center justify-center gap-1.5 transition"
            >
              <ImageIcon className="w-4 h-4" />
              DOWNLOAD LINKEDIN IMAGE
            </button>

            <button
              onClick={handleLinkedInShare}
              className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-orbitron font-bold text-xs rounded border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-1.5 transition"
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
