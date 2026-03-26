import { Context, Scenes } from 'telegraf';

/**
 * Расширенный интерфейс сессии для поддержки кастомных состояний и Wizard-сцен.
 */
export interface BotSession extends Scenes.WizardSession<Scenes.WizardSessionData> {
  niche?: string;
  state?: string;
}

/**
 * Объединенный контекст бота для работы со сценами и навигацией.
 */
export interface BotContext extends Context {
  session: BotSession;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}
