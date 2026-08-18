import React, { useState } from 'react';
import { Shield, Lock, UserCheck, Key, Building, CheckCircle2, X, Github, Globe, User, Radio } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

export interface UserSession {
  corporateName: string;
  securityId: string;
  departmentCode: string;
  domainModule: string;
  sessionToken: string;
  authProvider?: 'CORPORATE' | 'GOOGLE' | 'GITHUB' | 'ANONYMOUS';
}

interface UserIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  onSaveSession: (newSession: UserSession) => void;
}

export const UserIdentityModal: React.FC<UserIdentityModalProps> = ({
  isOpen,
  onClose,
  session,
  onSaveSession
}) => {
  const [corporateName, setCorporateName] = useState(session?.corporateName || 'KANSEN-OPERATIVE-094');
  const [securityId, setSecurityId] = useState(session?.securityId || 'SEC-8829-CLEARANCE-L5');
  const [departmentCode, setDepartmentCode] = useState(session?.departmentCode || 'FAB-DEPT-3NM-GAA');
  const [domainModule, setDomainModule] = useState(session?.domainModule || '3nm FinFET Nanosheet Architecture');
  const [authProvider, setAuthProvider] = useState<'CORPORATE' | 'GOOGLE' | 'GITHUB' | 'ANONYMOUS'>(session?.authProvider || 'CORPORATE');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authTelemetry, setAuthTelemetry] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProviderSelect = (provider: 'CORPORATE' | 'GOOGLE' | 'GITHUB' | 'ANONYMOUS') => {
    soundFx.playClick();
    setAuthProvider(provider);
    setIsAuthenticating(true);
    setAuthTelemetry(`INITIALIZING FIREBASE AUTH PROTOCOL [${provider}]...`);

    setTimeout(() => {
      if (provider === 'GOOGLE') {
        setCorporateName('OP-GOOGLE-ENGINEER-3NM');
        setSecurityId('GOOG-SEC-TOKEN-902');
        setAuthTelemetry('FIREBASE GOOGLE OAUTH2 VALIDATED // JWT EXPIRES IN 24H');
      } else if (provider === 'GITHUB') {
        setCorporateName('OP-GITHUB-VERILOG-DEV');
        setSecurityId('GH-OAUTH-TOKEN-771');
        setAuthTelemetry('FIREBASE GITHUB SSH-KEY CERTIFIED // Clearance L4');
      } else if (provider === 'ANONYMOUS') {
        setCorporateName('ANONYMOUS-GUEST-GUEST_404');
        setSecurityId('GUEST-TMP-CLEARANCE-L1');
        setAuthTelemetry('GUEST ANONYMOUS FIREBASE SESSION CREATED // READ-ONLY PDK');
      } else {
        setAuthTelemetry('CORPORATE SSO PROTOCOL ENGAGED // HARDWARE SEC TOKEN ACTIVE');
      }
      setIsAuthenticating(false);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playSynthPass();
    const token = '0x' + Math.random().toString(16).substring(2, 10).toUpperCase() + `-${authProvider}`;
    const newSession: UserSession = {
      corporateName,
      securityId,
      departmentCode,
      domainModule,
      sessionToken: token,
      authProvider
    };
    onSaveSession(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#050505] border-2 border-[#dc2626] w-full max-w-lg rounded-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.4)] relative">
        {/* Header */}
        <div className="bg-[#000000] border-b border-[#18181b] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#dc2626]" />
            <h2 className="font-orbitron font-black text-sm text-white tracking-widest uppercase">
              ENTERPRISE AUTHENTICATION SUBSYSTEM
            </h2>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-Provider Selection Bar */}
        <div className="p-4 bg-[#000000] border-b border-[#18181b]">
          <div className="text-[10px] text-zinc-400 font-tech mb-2">SELECT MULTI-PROVIDER AUTHENTICATION METHOD:</div>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleProviderSelect('CORPORATE')}
              className={`p-2 rounded border flex flex-col items-center justify-center gap-1 text-[9px] font-bold transition ${
                authProvider === 'CORPORATE'
                  ? 'bg-[#dc2626]/20 border-[#dc2626] text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                  : 'bg-[#050505] border-[#18181b] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Building className="w-4 h-4 text-[#dc2626]" />
              <span>CORPORATE SSO</span>
            </button>
            <button
              type="button"
              onClick={() => handleProviderSelect('GOOGLE')}
              className={`p-2 rounded border flex flex-col items-center justify-center gap-1 text-[9px] font-bold transition ${
                authProvider === 'GOOGLE'
                  ? 'bg-blue-950/40 border-blue-600 text-blue-200 shadow-[0_0_10px_rgba(37,99,235,0.3)]'
                  : 'bg-[#050505] border-[#18181b] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Globe className="w-4 h-4 text-blue-400" />
              <span>GOOGLE AUTH</span>
            </button>
            <button
              type="button"
              onClick={() => handleProviderSelect('GITHUB')}
              className={`p-2 rounded border flex flex-col items-center justify-center gap-1 text-[9px] font-bold transition ${
                authProvider === 'GITHUB'
                  ? 'bg-purple-950/40 border-purple-600 text-purple-200 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                  : 'bg-[#050505] border-[#18181b] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Github className="w-4 h-4 text-purple-400" />
              <span>GITHUB OAUTH</span>
            </button>
            <button
              type="button"
              onClick={() => handleProviderSelect('ANONYMOUS')}
              className={`p-2 rounded border flex flex-col items-center justify-center gap-1 text-[9px] font-bold transition ${
                authProvider === 'ANONYMOUS'
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                  : 'bg-[#050505] border-[#18181b] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <User className="w-4 h-4 text-zinc-400" />
              <span>GUEST ANON</span>
            </button>
          </div>

          {authTelemetry && (
            <div className="mt-3 p-2 bg-[#050505] border border-[#dc2626]/60 rounded text-[9px] font-mono text-emerald-400 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[#dc2626] animate-pulse" />
              <span>{authTelemetry}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
              Full Corporate Name / Handle
            </label>
            <div className="flex items-center bg-[#000000] border border-[#18181b] rounded px-3 py-2 text-xs focus-within:border-[#dc2626]">
              <UserCheck className="w-4 h-4 text-zinc-500 mr-2" />
              <input
                type="text"
                value={corporateName}
                onChange={(e) => setCorporateName(e.target.value)}
                required
                className="bg-transparent w-full text-white outline-none font-mono"
                placeholder="e.g. Kansen Engineer"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
              Security ID / JWT Clearance Token
            </label>
            <div className="flex items-center bg-[#000000] border border-[#18181b] rounded px-3 py-2 text-xs focus-within:border-[#dc2626]">
              <Key className="w-4 h-4 text-zinc-500 mr-2" />
              <input
                type="text"
                value={securityId}
                onChange={(e) => setSecurityId(e.target.value)}
                required
                className="bg-transparent w-full text-white outline-none font-mono"
                placeholder="e.g. SEC-094-CLEARANCE-5"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
              Department Code
            </label>
            <div className="flex items-center bg-[#000000] border border-[#18181b] rounded px-3 py-2 text-xs focus-within:border-[#dc2626]">
              <Building className="w-4 h-4 text-zinc-500 mr-2" />
              <input
                type="text"
                value={departmentCode}
                onChange={(e) => setDepartmentCode(e.target.value)}
                required
                className="bg-transparent w-full text-white outline-none font-mono"
                placeholder="e.g. FAB-9-SOVEREIGN-RTL"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
              Foundational Domain Module Selection
            </label>
            <select
              value={domainModule}
              onChange={(e) => setDomainModule(e.target.value)}
              className="w-full bg-[#000000] border border-[#18181b] rounded px-3 py-2 text-xs text-white outline-none focus:border-[#dc2626] font-mono"
            >
              <option value="3nm FinFET Nanosheet Architecture">3nm FinFET Nanosheet Architecture</option>
              <option value="EUV Sub-Wavelength Lithography">EUV Sub-Wavelength Lithography</option>
              <option value="ISO Class 3 Cleanroom Governance">ISO Class 3 Cleanroom Governance</option>
              <option value="SystemVerilog UVM Verification Core">SystemVerilog UVM Verification Core</option>
            </select>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white font-orbitron font-bold text-xs rounded border border-[#dc2626] shadow-[0_0_20px_rgba(220,38,38,0.5)] transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              ACTIVATE SECURE SESSION [{authProvider}]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

