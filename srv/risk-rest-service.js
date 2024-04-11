
const { Risks } = cds.entities;
/**
 * Implementation for Risk Management service defined in ./risk-service.cds
 */
module.exports = cds.service.impl(async function() {
   
    this.on('READ', 'webhook', async req => {
    });
    this.on("CREATE", 'webhook',  async (req, res)  => {
    const   BusinessPartner =   req.data.data.BusinessPartner;
    const   type =   req.data.type;

    switch (type) {
    case 'sap.s4.beh.businesspartner.v1.BusinessPartner.Changed.v1':
        await UPDATE(Risks).set({ status_value: 'CHANGED' }).where({ 'supplier_ID': BusinessPartner });
        console.log("更改Changing auto risk with")
        break;
    default:
       
    }   
    const message = {
                    msg:"接收成功",
                    type:type,
                    BusinessPartner:BusinessPartner
                    }
    console.log( message );
    return message;
    });

});