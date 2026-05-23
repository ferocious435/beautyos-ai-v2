import { TaskClassifier } from './task-classifier';
import type { TaskContext } from './task-classifier';
import { SkillRouterService } from './skill-router-service';
import type { RouteMetadata } from './skill-router-service';
import { SkillTraceLogger } from './skill-trace-logger';

export class SkillOrchestratorService {
  private classifier = new TaskClassifier();
  private router = new SkillRouterService();
  private logger = new SkillTraceLogger();

  orchestrate(context: TaskContext): RouteMetadata {
    const category = this.classifier.classify(context);
    const route = this.router.resolveRoute(category);

    this.logger.log({
      timestamp: new Date().toISOString(),
      taskName: context.taskName,
      category,
      route
    });

    return route;
  }
}
