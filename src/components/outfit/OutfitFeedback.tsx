import { useState } from 'react';
import { Heart, Meh, ThumbsDown, Thermometer, Shirt, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOutfitFeedback, FeedbackInput } from '@/hooks/useOutfitFeedback';

interface OutfitFeedbackProps {
  outfitItemIds: string[];
  occasion?: string;
  onFeedbackSubmitted?: () => void;
  compact?: boolean;
}

export function OutfitFeedback({ 
  outfitItemIds, 
  occasion, 
  onFeedbackSubmitted,
  compact = false 
}: OutfitFeedbackProps) {
  const { submitFeedback } = useOutfitFeedback();
  const [selectedRating, setSelectedRating] = useState<'love' | 'meh' | 'hate' | null>(null);
  const [selectedTemp, setSelectedTemp] = useState<'too_warm' | 'just_right' | 'too_cold' | null>(null);
  const [selectedFormality, setSelectedFormality] = useState<'too_formal' | 'just_right' | 'too_casual' | null>(null);
  const [moreLikeThis, setMoreLikeThis] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRating && !selectedTemp && !selectedFormality && !moreLikeThis) {
      return;
    }

    setIsSubmitting(true);
    try {
      const input: FeedbackInput = {
        outfit_item_ids: outfitItemIds,
        occasion,
        rating: selectedRating || undefined,
        temperature_feedback: selectedTemp || undefined,
        formality_feedback: selectedFormality || undefined,
        more_like_this: moreLikeThis,
      };

      await submitFeedback.mutateAsync(input);
      setSubmitted(true);
      onFeedbackSubmitted?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>Thanks! AI will improve based on your feedback.</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <RatingButton
          icon={Heart}
          label="Love"
          selected={selectedRating === 'love'}
          onClick={() => {
            setSelectedRating(selectedRating === 'love' ? null : 'love');
          }}
          variant="love"
          compact
        />
        <RatingButton
          icon={Meh}
          label="Meh"
          selected={selectedRating === 'meh'}
          onClick={() => setSelectedRating(selectedRating === 'meh' ? null : 'meh')}
          variant="meh"
          compact
        />
        <RatingButton
          icon={ThumbsDown}
          label="Hate"
          selected={selectedRating === 'hate'}
          onClick={() => setSelectedRating(selectedRating === 'hate' ? null : 'hate')}
          variant="hate"
          compact
        />
        {(selectedRating || selectedTemp || selectedFormality) && (
          <Button 
            size="sm" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="ml-1 h-7 px-2 text-xs"
          >
            Save
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        How was this outfit?
      </h4>

      {/* Rating Row */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Overall feeling</p>
        <div className="flex gap-2">
          <RatingButton
            icon={Heart}
            label="Love it"
            selected={selectedRating === 'love'}
            onClick={() => setSelectedRating(selectedRating === 'love' ? null : 'love')}
            variant="love"
          />
          <RatingButton
            icon={Meh}
            label="Meh"
            selected={selectedRating === 'meh'}
            onClick={() => setSelectedRating(selectedRating === 'meh' ? null : 'meh')}
            variant="meh"
          />
          <RatingButton
            icon={ThumbsDown}
            label="Hate it"
            selected={selectedRating === 'hate'}
            onClick={() => setSelectedRating(selectedRating === 'hate' ? null : 'hate')}
            variant="hate"
          />
        </div>
      </div>

      {/* Temperature Row */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Thermometer className="h-3 w-3" />
          Temperature
        </p>
        <div className="flex gap-2">
          <FeedbackChip
            label="Too warm"
            selected={selectedTemp === 'too_warm'}
            onClick={() => setSelectedTemp(selectedTemp === 'too_warm' ? null : 'too_warm')}
          />
          <FeedbackChip
            label="Just right"
            selected={selectedTemp === 'just_right'}
            onClick={() => setSelectedTemp(selectedTemp === 'just_right' ? null : 'just_right')}
            positive
          />
          <FeedbackChip
            label="Too cold"
            selected={selectedTemp === 'too_cold'}
            onClick={() => setSelectedTemp(selectedTemp === 'too_cold' ? null : 'too_cold')}
          />
        </div>
      </div>

      {/* Formality Row */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Shirt className="h-3 w-3" />
          Formality
        </p>
        <div className="flex gap-2">
          <FeedbackChip
            label="Too formal"
            selected={selectedFormality === 'too_formal'}
            onClick={() => setSelectedFormality(selectedFormality === 'too_formal' ? null : 'too_formal')}
          />
          <FeedbackChip
            label="Just right"
            selected={selectedFormality === 'just_right'}
            onClick={() => setSelectedFormality(selectedFormality === 'just_right' ? null : 'just_right')}
            positive
          />
          <FeedbackChip
            label="Too casual"
            selected={selectedFormality === 'too_casual'}
            onClick={() => setSelectedFormality(selectedFormality === 'too_casual' ? null : 'too_casual')}
          />
        </div>
      </div>

      {/* More Like This */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant={moreLikeThis ? "default" : "outline"}
          size="sm"
          onClick={() => setMoreLikeThis(!moreLikeThis)}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          More like this
        </Button>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || (!selectedRating && !selectedTemp && !selectedFormality && !moreLikeThis)}
          size="sm"
        >
          {isSubmitting ? 'Saving...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
}

interface RatingButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  onClick: () => void;
  variant: 'love' | 'meh' | 'hate';
  compact?: boolean;
}

function RatingButton({ icon: Icon, label, selected, onClick, variant, compact }: RatingButtonProps) {
  const variantStyles = {
    love: selected ? 'bg-rose-500/20 border-rose-500 text-rose-600' : 'hover:bg-rose-500/10 hover:border-rose-300',
    meh: selected ? 'bg-amber-500/20 border-amber-500 text-amber-600' : 'hover:bg-amber-500/10 hover:border-amber-300',
    hate: selected ? 'bg-slate-500/20 border-slate-500 text-slate-600' : 'hover:bg-slate-500/10 hover:border-slate-300',
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "p-1.5 rounded-md border transition-colors",
          variantStyles[variant]
        )}
        title={label}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 p-2 rounded-md border transition-colors",
        variantStyles[variant]
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

interface FeedbackChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  positive?: boolean;
}

function FeedbackChip({ label, selected, onClick, positive }: FeedbackChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs rounded-full border transition-colors",
        selected
          ? positive
            ? "bg-emerald-500/20 border-emerald-500 text-emerald-600"
            : "bg-primary/20 border-primary text-primary"
          : "hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
