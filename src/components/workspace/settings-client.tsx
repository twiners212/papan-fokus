"use client";

import { useState, useRef } from "react";
import { Upload, Trash2, Shield, User, Loader2 } from "lucide-react";
import { updateWorkspaceSettingsAction, deleteWorkspaceAction } from "@/actions/workspace-settings-actions";
import { supabase } from "@/lib/supabase-client";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SettingsClientProps {
  workspace: any;
  currentUserRole: string;
  members: any[];
  user: { id: string; name: string; image?: string | null };
}

export function SettingsClient({ workspace, currentUserRole, members, user }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);

  // Profile States
  const [profileName, setProfileName] = useState(user.name);
  const [profileImage, setProfileImage] = useState(user.image);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUserRole === "admin";

  const handleNameBlur = async () => {
    if (!isAdmin || workspaceName === workspace.name || !workspaceName.trim()) {
      setWorkspaceName(workspace.name);
      return;
    }
    try {
      setIsUpdatingName(true);
      await updateWorkspaceSettingsAction(workspace.id, { name: workspaceName });
      toast.success("Workspace name updated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update workspace name");
      setWorkspaceName(workspace.name); // Revert
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      setIsDeleting(true);
      // Broadcast deletion event to active users
      const channel = supabase.channel(`workspace:${workspace.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'WORKSPACE_DELETED',
        payload: { workspaceId: workspace.id }
      });
      
      await deleteWorkspaceAction(workspace.id);
      toast.success("Workspace deleted");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete workspace");
      setIsDeleting(false);
    }
  };

  const handleProfileNameBlur = async () => {
    if (profileName === user.name || !profileName.trim()) {
      setProfileName(user.name);
      return;
    }
    setIsUpdatingProfile(true);
    try {
      const { error } = await authClient.updateUser({ name: profileName });
      if (error) throw new Error(error.message);
      toast.success("Profile name updated");
      router.refresh();
    } catch(err: any) {
      toast.error(err.message || "Failed to update profile name");
      setProfileName(user.name);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    
    setIsUpdatingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true
      });
      if (error) throw new Error(error.message);
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch(err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Please use JPG, PNG, or SVG.");
      return;
    }

    try {
      setIsUpdatingProfile(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workspaces') // reusing existing bucket for simplicity
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('workspaces')
        .getPublicUrl(filePath);

      const { error } = await authClient.updateUser({ image: publicUrl });
      if (error) throw new Error(error.message);

      setProfileImage(publicUrl);
      toast.success("Profile image updated successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile image");
    } finally {
      setIsUpdatingProfile(false);
      if (profileFileInputRef.current) profileFileInputRef.current.value = "";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Please use JPG, PNG, or SVG.");
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${workspace.id}-${Math.random()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workspaces')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('workspaces')
        .getPublicUrl(filePath);

      // Update workspace in database
      await updateWorkspaceSettingsAction(workspace.id, { logoUrl: publicUrl });
      
      toast.success("Workspace logo updated successfully");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      {/* Settings Vertical Navigation */}
      <aside className="w-full md:w-56 shrink-0">
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setActiveTab("general")}
            className={`px-3 py-2 rounded text-sm font-medium whitespace-nowrap text-left transition-colors ${activeTab === 'general' ? 'bg-surface-container text-on-surface' : 'text-text-muted hover:bg-surface-container hover:text-on-surface'}`}
          >
            General
          </button>

          <button 
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-2 rounded text-sm font-medium whitespace-nowrap text-left transition-colors ${activeTab === 'profile' ? 'bg-surface-container text-on-surface' : 'text-text-muted hover:bg-surface-container hover:text-on-surface'}`}
          >
            My Profile
          </button>
        </nav>
      </aside>

      {/* Settings Canvas */}
      <div className="flex-1 max-w-3xl space-y-8">
        
        {activeTab === "general" && (
          <>
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-on-surface mb-1">General Information</h2>
                <p className="text-sm text-text-muted">Manage your workspace details and branding.</p>
              </div>

              <div className="p-6 bg-surface rounded-lg border border-border-subtle">
                {/* Logo Upload */}
                <div className="flex items-start gap-6 mb-8">
                  <div 
                    onClick={() => isAdmin && fileInputRef.current?.click()}
                    className={`w-20 h-20 rounded-lg bg-surface-container border border-border-subtle flex items-center justify-center shrink-0 overflow-hidden relative group ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
                  >
                    {workspace.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Workspace Logo"
                        className="w-full h-full object-cover transition-opacity"
                        src={workspace.logoUrl}
                      />
                    ) : (
                      <span className="text-text-muted text-xl font-bold">{workspace.name.charAt(0).toUpperCase()}</span>
                    )}
                    
                    {isAdmin && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isUploading ? <Loader2 className="w-6 h-6 text-on-surface animate-spin" /> : <Upload className="w-6 h-6 text-on-surface" />}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-on-surface">Workspace Logo</h3>
                    <p className="text-xs font-mono text-text-muted max-w-sm">
                      Recommended size: 256x256px. Max file size: 2MB. Supported formats: JPG, PNG, SVG.
                    </p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/jpeg,image/png,image/svg+xml"
                      onChange={handleLogoUpload}
                    />
                    {isAdmin && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="mt-2 text-sm text-on-surface bg-surface-container hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors border border-border-subtle disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Change Logo'}
                      </button>
                    )}
                    {!isAdmin && (
                      <p className="text-xs text-[#ffb4ab] mt-2">Only workspace admins can change the logo.</p>
                    )}
                  </div>
                </div>

                <hr className="border-border-subtle mb-6" />

                {/* Form Fields */}
                <div className="space-y-5">
                  <div className="space-y-2 relative">
                    <label className="text-xs font-mono text-text-muted block">Workspace Name</label>
                    <input
                      className="w-full bg-canvas border border-border-subtle rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] transition-shadow disabled:opacity-50 pr-10"
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      onBlur={handleNameBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={!isAdmin || isUpdatingName}
                    />
                    {isUpdatingName && (
                      <Loader2 className="w-4 h-4 text-text-muted animate-spin absolute right-3 top-[30px]" />
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Danger Zone (Admin Only) */}
            {isAdmin && (
              <section className="space-y-4 pt-8">
                <div>
                  <h2 className="text-xl font-semibold text-[#ffb4ab] mb-1">Danger Zone</h2>
                  <p className="text-sm text-text-muted">Destructive actions for this workspace.</p>
                </div>

                <div className="p-6 bg-[#93000a]/10 border border-[#ffb4ab]/20 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-on-surface">Delete Workspace</h3>
                    <p className="text-xs font-mono text-text-muted mt-1 max-w-md">
                      Once you delete a workspace, there is no going back. All projects, tasks, and team data will be permanently removed.
                    </p>
                  </div>
                  <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (!open) setDeleteConfirmationText("");
                  }}>
                    <DialogTrigger className="bg-[#ffb4ab]/10 text-[#ffb4ab] hover:bg-[#ffb4ab] hover:text-[#690005] border border-[#ffb4ab]/30 hover:border-[#ffb4ab] py-2 px-4 rounded text-sm font-medium transition-colors shrink-0 whitespace-nowrap w-fit">
                      Delete Workspace
                    </DialogTrigger>
                    <DialogContent className="bg-surface border-border-subtle sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-[#ffb4ab]">Are you absolutely sure?</DialogTitle>
                        <DialogDescription className="text-text-muted">
                          This action cannot be undone. This will permanently delete the <strong className="text-on-surface">{workspace.name}</strong> workspace and remove all associated data.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm text-on-surface">
                            Please type <strong className="font-mono bg-surface-container px-1 py-0.5 rounded text-[#ffb4ab]">DELETE {workspace.name}</strong> to confirm.
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            className="w-full bg-canvas border border-border-subtle rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-[#ffb4ab] focus:border-[#ffb4ab] transition-shadow"
                            placeholder={`DELETE ${workspace.name}`}
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <button 
                          onClick={() => setIsDeleteDialogOpen(false)}
                          className="px-4 py-2 rounded text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteWorkspace}
                          disabled={deleteConfirmationText !== `DELETE ${workspace.name}` || isDeleting}
                          className="px-4 py-2 rounded text-sm font-medium bg-[#93000a] text-white hover:bg-[#ffb4ab] hover:text-[#690005] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                          {isDeleting ? "Deleting..." : "Permanently Delete"}
                        </button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </section>
            )}
          </>
        )}



        {activeTab === "profile" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-on-surface mb-1">My Profile</h2>
              <p className="text-sm text-text-muted">Manage your personal profile and security settings.</p>
            </div>

            <div className="p-6 bg-surface rounded-lg border border-border-subtle">
              {/* Profile Image */}
              <div className="flex items-start gap-6 mb-8">
                <div 
                  onClick={() => profileFileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-surface-container border border-border-subtle flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer"
                >
                  {profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Profile Avatar"
                      className="w-full h-full object-cover transition-opacity"
                      src={profileImage}
                    />
                  ) : (
                    <span className="text-text-muted text-xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUpdatingProfile ? <Loader2 className="w-6 h-6 text-on-surface animate-spin" /> : <Upload className="w-6 h-6 text-on-surface" />}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-on-surface">Profile Picture</h3>
                  <p className="text-xs font-mono text-text-muted max-w-sm">
                    Recommended size: 256x256px. Max file size: 2MB.
                  </p>
                  <input 
                    type="file" 
                    ref={profileFileInputRef} 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/svg+xml"
                    onChange={handleProfileImageUpload}
                  />
                  <button 
                    onClick={() => profileFileInputRef.current?.click()}
                    disabled={isUpdatingProfile}
                    className="mt-2 text-sm text-on-surface bg-surface-container hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors border border-border-subtle disabled:opacity-50"
                  >
                    {isUpdatingProfile ? 'Uploading...' : 'Change Picture'}
                  </button>
                </div>
              </div>

              <hr className="border-border-subtle mb-6" />

              {/* Profile Details */}
              <div className="space-y-5">
                <div className="space-y-2 relative">
                  <label className="text-xs font-mono text-text-muted block">Full Name</label>
                  <input
                    className="w-full bg-canvas border border-border-subtle rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6] transition-shadow disabled:opacity-50 pr-10"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    onBlur={handleProfileNameBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={isUpdatingProfile}
                  />
                  {isUpdatingProfile && (
                    <Loader2 className="w-4 h-4 text-text-muted animate-spin absolute right-3 top-[30px]" />
                  )}
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="p-6 bg-surface rounded-lg border border-border-subtle mt-6">
              <h3 className="text-base font-medium text-on-surface mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-text-muted block">Current Password</label>
                  <input
                    className="w-full bg-canvas border border-border-subtle rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={isUpdatingPassword}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-text-muted block">New Password</label>
                  <input
                    className="w-full bg-canvas border border-border-subtle rounded px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-[#3b82f6] focus:border-[#3b82f6]"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isUpdatingPassword}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !currentPassword || !newPassword}
                  className="bg-[#3b82f6] text-white hover:bg-[#2563eb] px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
