/**
 * WhatsApp Integration Service
 *
 * Uses GreenAPI for WhatsApp messaging
 * Documentation: https://green-api.com/docs/
 */

interface GreenAPIConfig {
  instanceId: string;
  token: string;
  baseUrl?: string;
}

interface SendMessageParams {
  phone: string;
  message: string;
  quotedMessageId?: string;
}

interface SendMediaParams {
  phone: string;
  mediaUrl: string;
  fileName?: string;
  caption?: string;
}

interface SendTemplateParams {
  phone: string;
  templateId: string;
  variables: Record<string, string>;
}

interface WhatsAppMessage {
  idMessage: string;
  timestamp: number;
  typeMessage: string;
  chatId: string;
  senderId?: string;
  senderName?: string;
  textMessage?: string;
  caption?: string;
  fileName?: string;
  downloadUrl?: string;
}

interface InstanceState {
  stateInstance: 'authorized' | 'notAuthorized' | 'sleepMode';
  phone?: string;
}

interface SendResponse {
  success: boolean;
  idMessage?: string;
  error?: string;
}

class WhatsAppService {
  private config: GreenAPIConfig | null = null;
  private baseUrl: string = 'https://api.green-api.com';

  /**
   * Initialize the WhatsApp service with GreenAPI credentials
   */
  init(config: GreenAPIConfig): void {
    this.config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Format phone number for WhatsApp (Israeli format)
   */
  private formatPhone(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Handle Israeli numbers
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    } else if (!cleaned.startsWith('972')) {
      cleaned = '972' + cleaned;
    }

    return cleaned + '@c.us';
  }

  /**
   * Make API request to GreenAPI
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    if (!this.config) {
      throw new Error('WhatsApp service not configured. Call init() first.');
    }

    const url = `${this.baseUrl}/waInstance${this.config.instanceId}/${endpoint}/${this.config.token}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GreenAPI error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get instance state (connection status)
   */
  async getState(): Promise<InstanceState> {
    return this.request<InstanceState>('GET', 'getStateInstance');
  }

  /**
   * Check if WhatsApp is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const state = await this.getState();
      return state.stateInstance === 'authorized';
    } catch {
      return false;
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(params: SendMessageParams): Promise<SendResponse> {
    try {
      const response = await this.request<{ idMessage: string }>('POST', 'sendMessage', {
        chatId: this.formatPhone(params.phone),
        message: params.message,
        quotedMessageId: params.quotedMessageId,
      });

      return {
        success: true,
        idMessage: response.idMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a file by URL
   */
  async sendFileByUrl(params: SendMediaParams): Promise<SendResponse> {
    try {
      const response = await this.request<{ idMessage: string }>('POST', 'sendFileByUrl', {
        chatId: this.formatPhone(params.phone),
        urlFile: params.mediaUrl,
        fileName: params.fileName || 'file',
        caption: params.caption,
      });

      return {
        success: true,
        idMessage: response.idMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a template message with variable substitution
   */
  async sendTemplate(params: SendTemplateParams): Promise<SendResponse> {
    // In a real implementation, you would fetch the template from the database
    // and substitute variables. For now, this is a placeholder.
    const templateMessage = Object.entries(params.variables).reduce(
      (msg, [key, value]) => msg.replace(`{{${key}}}`, value),
      'Template message placeholder'
    );

    return this.sendMessage({
      phone: params.phone,
      message: templateMessage,
    });
  }

  /**
   * Send a message with buttons (requires GreenAPI Business plan)
   */
  async sendButtons(
    phone: string,
    message: string,
    buttons: Array<{ id: string; text: string }>
  ): Promise<SendResponse> {
    try {
      const response = await this.request<{ idMessage: string }>('POST', 'sendButtons', {
        chatId: this.formatPhone(phone),
        message,
        buttons: buttons.map((btn) => ({
          buttonId: btn.id,
          buttonText: btn.text,
        })),
      });

      return {
        success: true,
        idMessage: response.idMessage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get last incoming messages
   */
  async getLastIncomingMessages(
    minutes: number = 60
  ): Promise<WhatsAppMessage[]> {
    const response = await this.request<{ messages: WhatsAppMessage[] }>(
      'GET',
      `lastIncomingMessages/${minutes}`
    );
    return response.messages || [];
  }

  /**
   * Get chat history with a contact
   */
  async getChatHistory(
    phone: string,
    count: number = 100
  ): Promise<WhatsAppMessage[]> {
    const response = await this.request<WhatsAppMessage[]>('POST', 'getChatHistory', {
      chatId: this.formatPhone(phone),
      count,
    });
    return response;
  }

  /**
   * Mark chat as read
   */
  async markAsRead(phone: string): Promise<boolean> {
    try {
      await this.request('POST', 'readChat', {
        chatId: this.formatPhone(phone),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a phone number is registered on WhatsApp
   */
  async checkWhatsApp(phone: string): Promise<{ exists: boolean; phone?: string }> {
    try {
      const response = await this.request<{ existsWhatsapp: boolean; jid: string }>(
        'POST',
        'checkWhatsapp',
        {
          phoneNumber: phone.replace(/\D/g, ''),
        }
      );

      return {
        exists: response.existsWhatsapp,
        phone: response.jid?.replace('@c.us', ''),
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Get QR code for connection (if not authorized)
   */
  async getQR(): Promise<{ qrCode: string } | null> {
    try {
      const response = await this.request<{ type: string; message: string }>('GET', 'qr');
      if (response.type === 'qrCode') {
        return { qrCode: response.message };
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Singleton instance
export const whatsappService = new WhatsAppService();

// Export types
export type {
  GreenAPIConfig,
  SendMessageParams,
  SendMediaParams,
  SendTemplateParams,
  WhatsAppMessage,
  InstanceState,
  SendResponse,
};
