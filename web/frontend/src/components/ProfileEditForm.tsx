import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types/auth';

interface ProfileEditFormProps {
  onClose?: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    display_name: '',
    bio: '',
    website_url: '',
    location: '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form with current user data
  React.useEffect(() => {
    const currentUser = authService.getUser();
    if (currentUser) {
      setFormData({
        display_name: currentUser.display_name || '',
        bio: currentUser.bio || '',
        website_url: currentUser.website_url || '',
        location: currentUser.location || '',
      });
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file ảnh');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước file không được vượt quá 5MB');
        return;
      }

      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
      setSuccess(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare profile data (only include fields that have values)
      const profileData: Partial<
        Pick<User, 'display_name' | 'bio' | 'website_url' | 'location'>
      > = {};

      if (formData.display_name !== undefined) profileData.display_name = formData.display_name || null;
      if (formData.bio !== undefined) profileData.bio = formData.bio || null;
      if (formData.website_url !== undefined) profileData.website_url = formData.website_url || null;
      if (formData.location !== undefined) profileData.location = formData.location || null;

      // Update profile
      const updatedUser = await authService.updateProfile(profileData);

      // Handle avatar upload if file selected
      if (selectedFile) {
        const avatarUrl = await authService.uploadAvatar(selectedFile);
        // Update user with new avatar
        const userWithAvatar = { ...updatedUser, avatar_url: avatarUrl };
        authService.setUser(userWithAvatar);
      }

      setSuccess('Cập nhật hồ sơ thành công!');

      // Close form after success if onClose provided
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra při cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chỉnh sửa hồ sơ</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950/40 border-l-4 border-green-500 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tên hiển thị
            </label>
            <input
              type="text"
              name="display_name"
              value={formData.display_name || ''}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Nhập tên hiển thị"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tiểu sử
            </label>
            <textarea
              name="bio"
              value={formData.bio || ''}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
              placeholder="Nhập tiểu sử"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Website
            </label>
            <input
              type="url"
              name="website_url"
              value={formData.website_url || ''}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Vị trí
            </label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Nhập vị trí"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Avatar
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-16 h-16 object-cover rounded-full border-2 border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 text-xs">
                    Avatar
                  </div>
                )}
                <div className="ml-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="mb-2 text-xs text-slate-600 dark:text-slate-400"
                  />
                  {selectedFile && (
                    <span className="text-xs text-slate-500 block">
                      {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </span>
                  )}
                  {!selectedFile && avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setAvatarPreview(null);
                        URL.revokeObjectURL(avatarPreview as string);
                      }}
                      className="text-xs text-rose-500 hover:text-rose-600"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Định dạng: JPG, PNG. Kích thước tối đa: 5MB
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-xs"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditForm;