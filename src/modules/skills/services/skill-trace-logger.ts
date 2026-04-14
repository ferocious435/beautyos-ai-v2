export class SkillTraceLogger {
  log(event: any): void {
    // В реальном приложении здесь была бы запись в skill-system/logs/routing.jsonl
    // В серверной среде Vercel/Node это можно реализовать через fs.appendFile
    console.log(`[SkillTrace] ${JSON.stringify(event)}`);
  }
}
