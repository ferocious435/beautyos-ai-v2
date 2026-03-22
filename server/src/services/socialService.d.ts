export interface SocialPublishResult {
    success: boolean;
    postId?: string;
    error?: string;
}
export declare class SocialService {
    private igAccessToken;
    private igAccountId;
    private fbPageId;
    /**
     * Публикация фото в Instagram Business Account
     */
    publishToInstagram(imageUrl: string, caption: string): Promise<SocialPublishResult>;
    /**
     * Публикация фото на Facebook Page
     */
    publishToFacebook(imageUrl: string, caption: string): Promise<SocialPublishResult>;
}
export declare const socialService: SocialService;
//# sourceMappingURL=socialService.d.ts.map