/**
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 *@NAuthor Sujee
 */
define([
    'N/url'
    , 'N/currentRecord'
    , 'N/record'
    , 'N/https'
], function (url, currentRecord, record, https) {

    var defaultValues = {
        rejected: 4
        , requestHeader: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    }

    function pageInit(context) { }

    function fieldChanged(context) {

        var itineraryRecord = context.currentRecord;

        if (context.fieldId == 'custpage_route') {

            var route = itineraryRecord.getText({ fieldId: 'custpage_route' })
                , recordId = itineraryRecord.getValue({ fieldId: 'custpage_internalid' });

            try {
                var suiteletURL = url.resolveScript({
                    scriptId: 'customscript_su_sl_itinerary'
                    , deploymentId: 'customdeploy_su_sl_itinerary'
                    , params: {
                        recordId: recordId
                        , route: route
                        , action: 'fieldChange'
                    }
                });

                window.open(suiteletURL, '_self');

            } catch (e) {
                alert(e.message);
            }
        }

        var sublistName = context.sublistId
            , sublistFieldName = context.fieldId
            , line = context.line;

        if (sublistName === 'custpage_itinerary_sublist' && sublistFieldName === 'custpage_customer') {
            var lineNum = itineraryRecord.selectLine({ sublistId: 'custpage_itinerary_sublist', line: line });

            var custId = itineraryRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: sublistFieldName, line: line });

            if (custId) {
                try {
                    var suiteletURL = url.resolveScript({
                        scriptId: 'customscript_su_sl_itinerary'
                        , deploymentId: 'customdeploy_su_sl_itinerary'
                        , params: { 'action': 'contact', 'cusId': custId }
                    });

                    var response = https.get({
                        url: suiteletURL,
                        headers: defaultValues.requestHeader
                    });

                    var cusRecord = JSON.parse(response.body);
                    itineraryRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_phone', value: cusRecord.phoneNo, line: line });
                    itineraryRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_address', value: cusRecord.address, line: line });
                    itineraryRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custpage_contact', value: cusRecord.contact, line: line });

                } catch (error) {
                    alert('Unexpected error, please contact system administrator.');
                }
            }
        }
    }

    function customEdit() {

        var urlValue = new URL(window.location.href)
            , recordId = urlValue.searchParams.get("id");

        try {
            var suiteletURL = url.resolveScript({
                scriptId: 'customscript_su_sl_itinerary'
                , deploymentId: 'customdeploy_su_sl_itinerary'
                , params: { recordId: recordId }
            });

            window.onbeforeunload = '';
            document.location = suiteletURL;

        } catch (e) {
            document.body.style.cursor = "default";
            alert(e.message);
        }
    }


    function customSave() {
        var itineraryRecord = currentRecord.get();

        if (!_validateEntries(itineraryRecord)) {
            return;
        }

        var detailList = []
            , itineraryObj = {}
            , headerObj = {};

        headerObj.parentId = itineraryRecord.getValue({ fieldId: 'custpage_internalid' });
        headerObj.route = itineraryRecord.getValue({ fieldId: 'custpage_route' });

        var sublistCount = itineraryRecord.getLineCount({ sublistId: 'custpage_itinerary_sublist' });

        for (var i = 0; i < sublistCount; i++) {
            detailList.push({
                'customer': itineraryRecord.getSublistValue({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_customer', line: i })
                , 'phone': itineraryRecord.getSublistValue({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_phone', line: i })
                , 'address': itineraryRecord.getSublistValue({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_address', line: i })
                , 'date': itineraryRecord.getSublistText({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_date', line: i })
                , 'contact': itineraryRecord.getSublistValue({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_contact', line: i })
                , 'projectedTotal': itineraryRecord.getSublistValue({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_projected_total', line: i })
                , 'mileage': itineraryRecord.getSublistValue({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_mileage', line: i })
                , 'comment': itineraryRecord.getSublistValue({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_comment', line: i })
            });
        }

        itineraryObj.headerObj = headerObj;
        itineraryObj.detailList = detailList;

        try {
            var suiteletURL = url.resolveScript({
                scriptId: 'customscript_su_sl_itinerary_update',
                deploymentId: 'customdeploy_su_sl_itinerary_update'
            })
                , response = https.post({
                    url: suiteletURL
                    , body: JSON.stringify({
                        'action': 'save'
                        , 'itineraryObj': itineraryObj
                    })
                    , headers: defaultValues.requestHeader
                })
                , toRecord = url.resolveRecord({
                    recordType: 'customrecord_su_itinerary_header'
                    , recordId: JSON.parse(response.body).id
                    , isEditMode: false
                });

            window.onbeforeunload = '';
            document.location = toRecord;

        } catch (e) {
            alert(e.message);
        }
    }

    function _validateEntries(itineraryRecord) {

        var sublistCount = itineraryRecord.getLineCount({ sublistId: 'custpage_itinerary_sublist' });

        if (sublistCount <= 0) {
            alert('Please enter values for the customer');
            return false;
        }

        for (var i = 0; i < sublistCount; i++) {

            if (!itineraryRecord.getSublistText({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_projected_total', line: i })) {
                alert('Please Enter The Projected Value For The Customer: ' + itineraryRecord.getSublistText({
                    sublistId: 'custpage_itinerary_sublist'
                    , fieldId: 'custpage_customer'
                    , line: i
                }));
                return false;
            }

            //Date Range
            var cDateFrom = itineraryRecord.getValue('custpage_from_date');
            var cDateTo = itineraryRecord.getValue('custpage_to_date');

            var lineDate = itineraryRecord.getSublistText({ sublistId: 'custpage_itinerary_sublist', fieldId: 'custpage_date', line: i });

            if (lineDate < cDateFrom || lineDate > cDateTo) {
                alert('Visit date should be within the itinerary ' + cDateFrom + ' and ' + cDateTo);
                return false;
            }
        }

        return true;
    }

    function customReject() {

        var itineraryRecord = currentRecord.get();

        record.submitFields({
            type: 'customrecord_su_itinerary_header'
            , id: itineraryRecord.id
            , values: {
                'custrecord_su_itinerary_status': defaultValues.rejected
            }
            , options: { enableSourcing: false, ignoreMandatoryFields: true }
        });
    }

    return {
        pageInit: pageInit
        , customEdit: customEdit
        , customSave: customSave
        , fieldChanged: fieldChanged
        , customReject: customReject
    }
});
