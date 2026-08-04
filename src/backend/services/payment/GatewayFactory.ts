import { PaymentGateway } from './gateways/PaymentGateway';
import { RazorpayGateway } from './gateways/RazorpayGateway';
import { GatewayConfigService, ConfigurationError } from './GatewayConfigService';

export class GatewayFactory {
  /**
   * Retrieves the secure configuration for a restaurant and instantiates the correct gateway.
   */
  public static async getGateway(restaurantId: string, provider: string = process.env.DEFAULT_PROVIDER || 'razorpay'): Promise<PaymentGateway> {
    const config = await GatewayConfigService.getConfig(restaurantId, provider);
    
    switch (provider) {
      case 'razorpay':
        return new RazorpayGateway(config);
      // case 'stripe':
      //   return new StripeGateway(config);
      default:
        throw new ConfigurationError(`Unsupported payment provider: ${provider}`);
    }
  }
}
