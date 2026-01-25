import { CheckSquare } from 'lucide-react';
import { ActivityList } from '@/components/activities/ActivityList';

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

      {/* Activity List */}
      <ActivityList />
    </div>
  );
}
