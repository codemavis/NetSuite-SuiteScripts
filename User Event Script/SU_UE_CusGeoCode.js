/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 *@NAuthor Sujee
 */
define([
    'N/record'
    , '/SuiteScripts/Mobile Integration/Lib/su_rl_geo_code'
    , 'N/search'
], function (record, su_rl_geo_code, search) {

    function afterSubmit(context) {

        if (context.type !== context.UserEventType.DELETE) {

            var newRecord = context.newRecord;
            var customerId = newRecord.getValue({ fieldId: 'id' });

            var fieldLookUp = search.lookupFields({
                type: search.Type.CUSTOMER
                , id: customerId
                , columns: ['address1', 'address2', 'address3', 'city', 'state', 'zipcode', 'country']
            });

            var state = fieldLookUp.state[0] ? fieldLookUp.state[0].text : '';
            var country = fieldLookUp.country[0] ? fieldLookUp.country[0].text : '';

            var address = fieldLookUp.address1 + ' ' + fieldLookUp.address2 + ' ' +
                fieldLookUp.address3 + ' ' + fieldLookUp.city + ' ' + state + ' ' + fieldLookUp.zipcode + ' ' + country;

            var coordinates = su_rl_geo_code.get({ 'address': address });
            var latitude = coordinates.lat ? coordinates.lat : 0.00;
            var longitude = coordinates.lng ? coordinates.lng : 0.00;

            log.debug('latitude', latitude);
            log.debug('longitude', longitude);

            record.submitFields({
                type: record.Type.CUSTOMER
                , id: customerId
                , values: {
                    'custentity_su_cus_lat': latitude
                    , 'custentity_su_cus_long': longitude
                }
                , options: { enableSourcing: false, ignoreMandatoryFields: true }
            });

        }
    }

    return {
        afterSubmit: afterSubmit
    }
});