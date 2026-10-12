import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { Switch } from '../ui/Switch.js';
import { familiesApi } from '../../api/families.js';
import { TreeSnapshot } from '../../shared/index.js';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: TreeSnapshot;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  snapshot,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isActive, setIsActive] = useState(snapshot.family.shareActive ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initShare = async () => {
        try {
          setIsLoading(true);
          setErrorMessage('');
          setShareUrl('');
          const res = await familiesApi.createOrActivateShare(snapshot.family.id);
          setShareUrl(res.url ?? '');
          setIsActive(res.active);
        } catch (err) {
          console.error(err);
          setErrorMessage(err instanceof Error ? err.message : 'Impossible de créer le lien de partage.');
        } finally {
          setIsLoading(false);
        }
      };
      initShare();
    }
  }, [isOpen, snapshot.family.id]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.getElementById('share-url-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    try {
      setIsUpdating(true);
      setErrorMessage('');
      const res = await familiesApi.updateShare(snapshot.family.id, checked);
      setIsActive(res.active);
      setShareUrl(res.url ?? '');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Impossible de modifier le lien de partage.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Partager l'arbre"
      maxWidth="max-w-[520px]"
    >
      <div className="space-y-6 pt-1 text-left">
        <p className="text-[15px] text-discreet leading-relaxed">
          Toute personne disposant du lien peut consulter l'arbre, sans pouvoir le modifier.
        </p>
        {errorMessage && (
          <p role="alert" className="text-[13px] text-danger">
            {errorMessage}
          </p>
        )}

        {/* Share Link Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            id="share-url-input"
            type="text"
            readOnly
            value={shareUrl || (isLoading ? 'Génération du lien…' : '')}
            className="flex-1 h-[50px] sm:h-[52px] bg-[#F6F6F6] border border-[#E3E3E3] rounded-field px-4 text-[13px] sm:text-[14px] text-ink select-all focus:outline-none"
          />
          <Button
            type="button"
            variant="primary"
            onClick={handleCopy}
            disabled={!shareUrl || isLoading}
            className="h-[50px] sm:h-[52px] w-full sm:w-[110px] flex-shrink-0"
          >
            {copied ? 'Copié ✓' : 'Copier'}
          </Button>
        </div>

        {/* Bottom Row Separated by Hairline */}
        <div className="pt-4 border-t border-hairline">
          <Switch
            checked={isActive}
            onChange={handleToggleActive}
            disabled={isLoading || isUpdating || !shareUrl}
            label="Lien actif"
            sublabel="Désactivez-le pour couper l'accès à tout moment."
          />
        </div>
      </div>
    </Modal>
  );
};
