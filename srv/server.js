const cds = require ('@sap/cds')
module.exports = cds.server

 const cds_swagger = require ('cds-swagger-ui-express')
 cds.on ('bootstrap', app => app.use (cds_swagger()) )