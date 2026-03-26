export interface BeautyTrend {
    timestamp: string;
    visualAnchors: string;
    semanticAnchors: string;
    hiddenDeficits: string;
    postTemplate: string;
    mediaProductionPrompt: string;
}
export declare class TrendAnalyzerService {
    private currentTrend;
    init(): Promise<void>;
    runWeeklyAnalysis(telegramContext?: any): Promise<BeautyTrend>;
    getLatestTrends(): BeautyTrend | null;
}
export declare const trendAnalyzer: TrendAnalyzerService;
//# sourceMappingURL=trendAnalyzer.d.ts.map