"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInviteLinkAction } from "@/actions/invite-actions";
import { toast } from "sonner";
import { Copy, Loader2, Check } from "lucide-react";

export function InviteMemberDialog({ workspaceId, children }: { workspaceId: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [maxUses, setMaxUses] = useState(5);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    const payload = { workspaceId, role, maxUses, expiresInHours };
    
    const result = await createInviteLinkAction(payload);
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    if (result.data) {
      const url = `${window.location.origin}/invite?token=${result.data.token}`;
      setInviteUrl(url);
      toast.success("Tautan undangan berhasil dibuat!");
    }
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Disalin ke papan klip");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        // Reset state when closing
        setTimeout(() => setInviteUrl(null), 300);
      }
    }}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md bg-surface border-border-subtle text-on-surface">
        <DialogHeader>
          <DialogTitle>Undang Anggota Tim</DialogTitle>
          <DialogDescription className="text-text-muted">
            Buat tautan undangan khusus untuk mengizinkan anggota tim baru berkolaborasi di ruang kerja ini.
          </DialogDescription>
        </DialogHeader>

        {!inviteUrl ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Peran (Role)</Label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-background border border-border-subtle rounded-md text-sm px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-[#c8c5ca]/50"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Maksimal Penggunaan (Max Uses)</Label>
              <Input 
                type="number" 
                min={1} 
                max={100}
                value={maxUses} 
                onChange={(e) => setMaxUses(parseInt(e.target.value))} 
                className="bg-background border-border-subtle"
              />
            </div>
            <div className="space-y-2">
              <Label>Masa Berlaku (Jam)</Label>
              <Input 
                type="number" 
                min={1} 
                max={24}
                value={expiresInHours} 
                onChange={(e) => setExpiresInHours(parseInt(e.target.value))} 
                className="bg-background border-border-subtle"
              />
            </div>
            <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-primary text-primary-foreground text-primary-foreground hover:bg-[#e4e1e6] mt-4">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buat Tautan
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bagikan tautan ini</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  readOnly 
                  value={inviteUrl} 
                  className="bg-background border-border-subtle text-text-muted font-mono text-sm"
                />
                <Button size="icon" variant="outline" className="shrink-0 border-border-subtle" onClick={handleCopy} aria-label={copied ? "Tautan disalin" : "Salin tautan undangan"}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-text-muted pt-2">
                Tautan ini akan kedaluwarsa dalam {expiresInHours} jam dan dapat digunakan sebanyak {maxUses} kali.
              </p>
            </div>
            <Button onClick={() => setInviteUrl(null)} variant="outline" className="w-full border-border-subtle text-text-muted hover:text-on-surface hover:bg-surface-container-low mt-2">
              Buat Tautan Baru
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
