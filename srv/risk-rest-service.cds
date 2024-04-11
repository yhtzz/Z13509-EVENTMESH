using { sap.ui.riskmanagement as my } from '../db/schema';
@path: 'service/risk'
@protocol: [ 'rest']
service WebhookService {
     entity webhook as projection on my.webhook;
  }