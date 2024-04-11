let isMethodExecuted = false;
const cds = require('@sap/cds');
const { COMMIT } = require('@sap/cds/libx/_runtime/db/utils/coloredTxCommands');
const { statSync } = require('@sap/hdi-deploy/lib/fileWorker');
const { Risks } = cds.entities;
const LOG = cds.log('risk-service');

/**
 * Implementation for Risk Management service defined in ./risk-service.cds
 */

module.exports =  cds.service.impl(async function () {
    //连接BP接口
    const bupa = await cds.connect.to('API_BUSINESS_PARTNER');
    if (isMethodExecuted) {
        console.log('方法已执行一次，不再执行');
        //return;
    }
    else {

        isMethodExecuted = true;
        //连接消息服务
        const messaging = await cds.connect.to('messaging')
        // 订阅topic
        messaging.on('sap.s4.beh.businesspartner.v1.BusinessPartner.Created.v1', async (msg) => {
            const { BusinessPartner } = msg.data
            console.log('--> Event received: BusinessPartner Created (开始处理ID="' + BusinessPartner + '")')
            await createRisk(BusinessPartner);
            console.log('--> Event received: BusinessPartner Created (处理结束ID="' + BusinessPartner + '")')
        })
        // 订阅topic
        messaging.on('sap.s4.beh.businesspartner.v1.BusinessPartner.Changed.v1', async (msg) => {
            const { BusinessPartner } = msg.data
            console.log('--> Event received: BusinessPartner changed (开始处理ID="' + BusinessPartner + '")')
            await changedRisk(BusinessPartner);
            console.log('--> Event received: BusinessPartner changed (处理结束ID="' + BusinessPartner + '")')

        })
        // 订阅topic
        messaging.on('zevent001/zbooking001/Delete/v1', async (msg) => {
            const { TravelID } = msg.data
            console.log('--> Event received: zevent001/zbooking001/Delete/v1 (TravelID="' + TravelID + '")')
        })
    }


    //发送event mesh
    this.on("sendeventmesh", 'Risks.drafts', async (req, next) => {
        const risks = await cds.run(SELECT.from('RiskService.Risks').where({ ID: req.params[0].ID }));

        //   // send to a topic
        await messaging.emit('ce/risk/read', risks[0])
    });
    this.on("sendeventmesh", 'Risks', async (req, next) => {
        const risks = await cds.run(SELECT.from('RiskService.Risks').where({ ID: req.params[0].ID }));

        //   // send to a topic
        await messaging.emit('ce/risk/read', risks[0])
    });
    //调用外部bp接口
    this.on('READ', 'Suppliers', async req => {
        return bupa.run(req.query);
    });
    //修改criticality字段值
    this.after('READ', 'Risks', async risksData => {
        const risks = Array.isArray(risksData) ? risksData : [risksData];
        risks.forEach(risk => {
            if (risk.impact >= 100000) {
                risk.criticality = 1;
            } else {
                risk.criticality = 2;
            }
        });
    });
    // Risks?$expand=supplier，查询时处理expand调用supplier外部接口
    this.on("READ", 'Risks.drafts', async (req, next) => {
        return handlereadrisk(req, next);
    });
    // Risks?$expand=supplier
    this.on("READ", 'Risks', async (req, next) => {
        return handlereadrisk(req, next);
    });
    //响应更新事件
    this.after('UPDATE', 'Risks', async (riskData) => {
        if (riskData.impact > 1000) return;
        riskData.status_value = 'ASSESSED';
        await UPDATE(Risks).set({ status_value: 'ASSESSED' }).where({ ID: riskData.ID });
    });
    //响应创建事件
    bupa.on('Created', async (msg) => {
        const { BusinessPartner } = msg.data;
        LOG.info('Received created! BusinessPartner=' + BusinessPartner);
        await createRisk(BusinessPartner);
    });
    //响应修改事件
    bupa.on('Changed', async (msg) => {
        const { BusinessPartner } = msg.data;
        LOG.info('Received changed! BusinessPartner=' + BusinessPartner);
        await changedRisk(BusinessPartner);
        //     if((await SELECT.one.from(Risks).where({supplier_ID: BusinessPartner})).status_value === 'NEW') return;
        //     await UPDATE(Risks).set({status_value: 'CHANGED'}).where({'supplier_ID' : BusinessPartner});
    });
    //修改function
    async function changedRisk(businessPartner) {
        // if((await SELECT.one.from(Risks).where({supplier_ID: businessPartner})).status_value === 'NEW') return;

        console.log("更改开始Changing auto risk with")
        await UPDATE(Risks).set({ status_value: 'CHANGED' }).where({ 'supplier_ID': businessPartner });
        COMMIT;
        console.log("更改结束Changing auto risk with")


    }
    //创建function
    async function createRisk(businessPartner) {
        const payload = {
            title: 'auto: CFR non-compliance',
            descr: 'New Business Partner might violate CFR code',
            prio: '1',
            impact: 200000,
            supplier_ID: businessPartner,
            status_value: 'NEW'
        }
        console.log("创建开始Creating auto risk with", payload)

        await INSERT.into(Risks).entries(payload);
        COMMIT;
        console.log("创建结束Creating auto risk with", payload)


    }
    //处理读取risk expand supplier字段 function
    async function handlereadrisk(req, next) {
        if (!req.query.SELECT.columns) return next();
        const expandIndex = req.query.SELECT.columns.findIndex(
            ({ expand, ref }) => expand && ref[0] === "supplier"
        );
        if (expandIndex < 0) return next();

        // Remove expand from query
        req.query.SELECT.columns.splice(expandIndex, 1);

        // Make sure supplier_ID will be returned
        if (!req.query.SELECT.columns.indexOf('*') >= 0 &&
            !req.query.SELECT.columns.find(
                column => column.ref && column.ref.find((ref) => ref == "supplier_ID"))
        ) {
            req.query.SELECT.columns.push({ ref: ["supplier_ID"] });
        }

        const risks = await next();

        const asArray = x => Array.isArray(x) ? x : [x];

        // Request all associated suppliers
        const supplierIds = asArray(risks).map(risk => risk.supplier_ID);
        const suppliers = await bupa.run(SELECT.from('RiskService.Suppliers').where({ ID: supplierIds }));

        // Convert in a map for easier lookup
        const suppliersMap = {};
        for (const supplier of suppliers)
            suppliersMap[supplier.ID] = supplier;

        // Add suppliers to result
        for (const note of asArray(risks)) {
            note.supplier = suppliersMap[note.supplier_ID];
        }

        return risks;

    }
}
);

