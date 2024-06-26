using { sap.ui.riskmanagement as my } from '../db/schema';      
@path: 'service/risk'      
service RiskService {      
  entity Risks as projection on my.Risks actions {      
      action sendeventmesh ();      
    };          
    annotate Risks with @odata.draft.enabled;      
  entity Mitigations as projection on my.Mitigations;      
    annotate Mitigations with @odata.draft.enabled;      
    @readonly      
    entity Suppliers as projection on my.Suppliers;      
}      
