import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  MessageSquare, 
  ThumbsUp,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface AnalysisData {
  overall_score: number;
  professionalism: number;
  response_quality: number;
  resolution_effectiveness: number;
  tone_score: number;
  sentiment: string | null;
  summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  analyzed_at: string | null;
}

interface AnalysisCardProps {
  analysis: AnalysisData | null;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!analysis) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Precisa melhorar';
  };

  const getSentimentConfig = (sentiment: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return { label: 'Positivo', className: 'bg-emerald-500/10 text-emerald-600' };
      case 'negative':
        return { label: 'Negativo', className: 'bg-red-500/10 text-red-600' };
      default:
        return { label: 'Neutro', className: 'bg-muted text-muted-foreground' };
    }
  };

  const sentimentConfig = getSentimentConfig(analysis.sentiment);

  const scores = [
    { label: 'Profissionalismo', value: analysis.professionalism, icon: ThumbsUp },
    { label: 'Qualidade da Resposta', value: analysis.response_quality, icon: MessageSquare },
    { label: 'Resolução', value: analysis.resolution_effectiveness, icon: TrendingUp },
  ];

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="font-medium">Análise da Conversa</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-2xl font-bold', getScoreColor(analysis.overall_score))}>
                {analysis.overall_score}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
              <Badge variant="secondary" className={sentimentConfig.className}>
                {sentimentConfig.label}
              </Badge>
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* Summary */}
          {analysis.summary && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Resumo</p>
              <p className="text-sm">{analysis.summary}</p>
            </div>
          )}

          {/* Score bars */}
          <div className="space-y-3">
            {scores.map((score) => (
              <div key={score.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{score.label}</span>
                  <span className={cn('font-medium', getScoreColor(score.value))}>
                    {score.value}%
                  </span>
                </div>
                <Progress value={score.value} className="h-2" />
              </div>
            ))}
          </div>

          {/* Strengths */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                Pontos Fortes
              </p>
              <ul className="space-y-1">
                {analysis.strengths.map((strength, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysis.improvements && analysis.improvements.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Sugestões de Melhoria
              </p>
              <ul className="space-y-1">
                {analysis.improvements.map((improvement, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
