import React, { useState, useEffect } from 'react';
import { X, User, Lock, Shield, ArrowRight, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { authService } from '../services/authService';
import { CaptchaResponse, User as UserType } from '../types/auth';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [captchaLoading, setCaptchaLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const data = await authService.getCaptcha();
      setCaptcha(data);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Lỗi tải CAPTCHA:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCaptcha();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side validations
    if (!isLogin) {
      if (password.length < 8) {
        setError('Mật khẩu phải có tối thiểu 8 ký tự.');
        return;
      }
      if (!/[a-z]/.test(password)) {
        setError('Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError('Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.');
        return;
      }
      if (!/[0-9]/.test(password)) {
        setError('Mật khẩu phải chứa ít nhất 1 chữ số.');
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        setError('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.');
        return;
      }
    }

    if (!captchaAnswer.trim()) {
      setError('Vui lòng nhập kết quả phép tính CAPTCHA để xác thực.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const res = await authService.login({
          username,
          password,
          captcha_token: captcha?.captcha_token,
          captcha_answer: captchaAnswer,
        });
        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${res.user.username}`);
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 600);
      } else {
        const res = await authService.register({
          username,
          password,
          captcha_token: captcha?.captcha_token,
          captcha_answer: captchaAnswer,
        });
        setSuccessMsg('Đăng ký tài khoản Thành viên thành công!');
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi, vui lòng thử lại.');
      // Refresh captcha on failure
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white/95 dark:bg-slate-900/95 p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-2xl backdrop-blur-2xl text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors press-tactile cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 mb-3 ring-6 ring-blue-500/5">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isLogin ? 'Xác thực tài khoản' : 'Tạo tài khoản Thành viên'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {isLogin
              ? 'Đăng nhập với tài khoản Thành viên hoặc Admin'
              : 'Đăng ký tài khoản để tin nhắn của bạn được lưu vĩnh viễn trong DB'}
          </p>
        </div>

        {/* Segmented Control Tabs (Apple Style) */}
        <div className="flex p-1 mb-6 rounded-2xl bg-slate-200/60 dark:bg-white/5 border border-slate-300/40 dark:border-white/5">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); setSuccessMsg(null); loadCaptcha(); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors duration-150 cursor-pointer press-tactile ${
              isLogin ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); setSuccessMsg(null); loadCaptcha(); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors duration-150 cursor-pointer press-tactile ${
              !isLogin ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 text-sm rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-3 text-sm rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                minLength={3}
                maxLength={50}
                placeholder="Nhập tên tài khoản..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-150"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Mật khẩu {isLogin ? '' : '(Tối thiểu 8 ký tự)'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-150"
              />
            </div>
            {!isLogin && <PasswordStrengthMeter password={password} />}
          </div>

          {/* CAPTCHA Protection Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Mã xác thực chống Bot (CAPTCHA)
              </label>
              <button
                type="button"
                onClick={loadCaptcha}
                disabled={captchaLoading}
                className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                title="Đổi mã khác"
              >
                <RotateCw className={`w-3 h-3 ${captchaLoading ? 'animate-spin' : ''}`} />
                <span>Đổi mã</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              {/* SVG Display */}
              <div 
                className="h-[46px] rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-inner cursor-pointer hover:border-blue-500/40 transition-colors"
                onClick={loadCaptcha}
                title="Bấm để đổi mã mới"
              >
                {captchaLoading ? (
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                ) : captcha?.captcha_svg ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: captcha.captcha_svg }}
                    className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full" 
                  />
                ) : (
                  <span className="text-xs text-slate-500">Đang tải mã...</span>
                )}
              </div>

              {/* Answer Input */}
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Nhập đáp án..."
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 h-[46px] rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-150 font-mono text-center tracking-wider font-semibold"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              * Tính kết quả phép tính ở hình trên để xác thực người dùng thật.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-opacity duration-150 disabled:opacity-50 press-tactile cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản Thành viên'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
