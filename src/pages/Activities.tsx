import { CheckSquare, Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Activities() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CheckSquare className="h-8 w-8" />
          Atividades
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie tarefas, ligações e reuniões
        </p>
      </div>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center max-w-md">
            O módulo de Atividades será implementado na Fase 4.
            Por enquanto, comece cadastrando suas Organizações e Pessoas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
