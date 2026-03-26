import axios from 'axios';

const META_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface SocialPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export class SocialService {
  private igAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  private igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  private fbPageId = process.env.FACEBOOK_PAGE_ID;

  /**
   * Публикация фото в Instagram Business Account
   */
  async publishToInstagram(imageUrl: string, caption: string): Promise<SocialPublishResult> {
    if (!this.igAccessToken || !this.igAccountId) {
      console.warn('Instagram credentials not set. Mocking publication.');
      return { success: true, postId: 'mock_ig_' + Date.now() };
    }

    try {
      // 1. Создание контейнера
      const { data: container } = await axios.post(`${BASE_URL}/${this.igAccountId}/media`, {
        image_url: imageUrl,
        caption: caption,
        access_token: this.igAccessToken,
      });

      // 2. Публикация
      const { data: result } = await axios.post(`${BASE_URL}/${this.igAccountId}/media_publish`, {
        creation_id: container.id,
        access_token: this.igAccessToken,
      });

      return { success: true, postId: result.id };
    } catch (error: any) {
      console.error('Instagram Publish Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  /**
   * Публикация фото на Facebook Page
   */
  async publishToFacebook(imageUrl: string, caption: string): Promise<SocialPublishResult> {
    if (!this.igAccessToken || !this.fbPageId) {
      console.warn('Facebook credentials not set. Mocking publication.');
      return { success: true, postId: 'mock_fb_' + Date.now() };
    }

    try {
      const { data: result } = await axios.post(`${BASE_URL}/${this.fbPageId}/photos`, {
        url: imageUrl,
        caption: caption,
        access_token: this.igAccessToken,
      });

      return { success: true, postId: result.post_id };
    } catch (error: any) {
      console.error('Facebook Publish Error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }
}

export const socialService = new SocialService();
