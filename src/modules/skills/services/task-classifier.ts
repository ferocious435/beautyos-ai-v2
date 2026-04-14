export type TaskCategory = 
  | 'product-definition'
  | 'architecture'
  | 'implementation'
  | 'frontend'
  | 'ai-media'
  | 'debugging'
  | 'security'
  | 'infrastructure'
  | 'bot-development'
  | 'knowledge'
  | 'devops'
  | 'qa';

export interface TaskContext {
  taskName: string;
  description?: string;
  isMutable?: boolean;
}

export class TaskClassifier {
  classify(context: TaskContext): TaskCategory {
    const text = (context.taskName + ' ' + (context.description || '')).toLowerCase();

    if (text.includes('ui') || text.includes('css') || text.includes('react') || text.includes('frontend')) return 'frontend';
    if (text.includes('stability') || text.includes('image') || text.includes('render')) return 'ai-media';
    if (text.includes('architecture') || text.includes('design')) return 'architecture';
    if (text.includes('security') || text.includes('audit') || text.includes('auth')) return 'security';
    if (text.includes('deploy') || text.includes('vercel') || text.includes('env')) return 'infrastructure';
    if (text.includes('bug') || text.includes('fix') || text.includes('error')) return 'debugging';
    if (text.includes('test') || text.includes('jest') || text.includes('vitest')) return 'qa';
    if (text.includes('bot') || text.includes('telegraf') || text.includes('telegram')) return 'bot-development';
    if (text.includes('notebook') || text.includes('research')) return 'knowledge';
    if (text.includes('pr') || text.includes('github') || text.includes('commit')) return 'devops';
    
    return 'implementation'; // Default
  }
}
