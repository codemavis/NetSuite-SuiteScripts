/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 *@NAuthor Sujee
 */
define([
    'N/record'
    , 'N/search'
    , 'N/error'
], function (record, search, error) {

    const defaultValues = {
        customerType: 'Individual',
        isDefaultShipping: false,
        isDefaultBilling: false,
        isResidential: false,
        prospectStatus: 10, //PROSPECT-Proposal 
        customerStatus: 13, //CUSTOMER-Closed-Wwon
        headerFieldsMap: {
            'id': 'custentity_su_cus_id'
            , 'customerType': 'isperson'
            , 'account': 'accountnumber'
            , 'prefix': 'salutation'
            , 'name': 'companyname'
            , 'firstName': 'firstname'
            , 'middleName': 'middlename'
            , 'lastName': 'lastname'
            , 'email': 'email'
            , 'fax': 'fax'
            , 'telephone': 'phone'
            , 'ext': 'ext'
            , 'class': 'category'
            , 'paymentMethod': 'custentity_su_pay_methods'
            , 'invoiceType': 'custentity_su_invo_type'
            , 'vat': 'vatregnumber'
            , 'svat': 'custentity_su_svat_no'
            , 'creditClassification': 'custentity_su_credit_class'
            , 'dealerRegion': 'custentity_su_dealer_region'
            , 'paymentTerm': 'custentity_su_pay_term'
            , 'currency': 'currency'
            , 'creditLimit': 'creditlimit'
        },
        salesPersonFieldsMap: {
            "salesPerson": "employee"
            , "salesRole": "salesrole"
            , "isprimary": "isprimary"
            , "contribution": "contribution"
        },
        addressFieldsMap: {
            "country": "country"
            , "addressSite": "attention"
            , "addressee": "addressee"
            , "phone": "addrphone"
            , "addressLine1": "addr1"
            , "addressLine2": "addr2"
            , "city": "city"
            , "province": "state"
            , "postalCode": "zip"
        },
        addressLineFieldsMap: {
            "addressSite": "label"
            , "isDefaultBilling": "defaultbilling"
            , "isDefaultShipping": "defaultshipping"
            , "isResidential": "isresidential"
        }
    };

    function exec(action, objCustomer) {
        var customerId;

        switch (action) {
            case 'create':
                customerId = _create(objCustomer);
                break;
            case 'edit':
                customerId = _edit(objCustomer);
                break;
            case 'delete':
                customerId = _delete(objCustomer);
                break;

            default:
                break;
        }

        return ({
            "Response": {
                "id": customerId
                , "execStatus": "OK"
                , "execDescription": "Saved Successfully"
            }
        });
    }

    function _create(objValues) {
        var objCustomer = record.create({ type: record.Type.PROSPECT, isDynamic: true });
        _updValues(objCustomer, objValues);
        return objCustomer.save({ enableSourcing: true, ignoreMandatoryFields: true });
    }

    function _edit(objValues) {

        var objCustomer
            , fieldLookUp = search.lookupFields({ type: search.Type.CUSTOMER, id: objValues.id, columns: ['stage'] });

        if (fieldLookUp) {
            objCustomer = record.load({ type: record.Type[fieldLookUp.stage[0].value], id: objValues.id, isDynamic: true });
            _updValues(objCustomer, objValues);
            return objCustomer.save({ enableSourcing: true, ignoreMandatoryFields: true });
        } else
            return { 'error': 'INVALID_ID', 'message': 'Customer id is not valid' }
    }

    function _delete(objValues) {
        var fieldLookUp = search.lookupFields({ type: search.Type.CUSTOMER, id: objValues.id, columns: ['stage'] });
        if (fieldLookUp)
            return record.delete({ type: record.Type[fieldLookUp.stage[0].value], id: id });
        else
            return { 'error': 'INVALID_ID', 'message': 'Customer ID Is Not Valid' }
    }

    function _updValues(newCustomer, objValues) {

        var objKey = Object.keys(objValues.fields);

        util.each(objKey, function (key) {
            var fieldKey = defaultValues.headerFieldsMap[key];
            var fieldValue = objValues.fields[key];
            var isValid = true;

            switch (key) {
                case 'customerType':
                    fieldValue = fieldValue == defaultValues.customerType ? 'T' : 'F';
                    break;

                case 'telephone':
                    fieldValue = objValues.fields['ext'] ? fieldValue + ' - ' + objValues.fields['ext'] : fieldValue;
                    break;

                case 'ext':
                    break;

                case 'status':
                    isValid = fieldValue ? true : false;
                    break;

                default:
                    break;
            }

            if (isValid) {
                try {
                    newCustomer.setValue({ fieldId: fieldKey, value: fieldValue });
                } catch (e) {
                    throw error.create({ name: e.name, message: e.message });
                }
            }
        });

        //Update Address
        for (var i = 0; i < objValues.address.length; i++) {
            const addrElement = objValues.address[i];

            var objAddrKey = Object.keys(addrElement);

            var numLines = newCustomer.getLineCount({ sublistId: 'addressbook' });

            for (var k = 0; k < numLines; k++) {
                newCustomer.removeLine({ sublistId: 'addressbook', line: 0, ignoreRecalc: true });
            }

            newCustomer.selectLine({ sublistId: 'addressbook', line: i });

            util.each(objAddrKey, function (key) {

                var fieldSubKey = defaultValues.addressLineFieldsMap[key];
                var fieldValue = addrElement[key];

                switch (key) {
                    case 'isDefaultShipping':
                        fieldValue = fieldValue !== defaultValues.isDefaultShipping ? 'T' : 'F';
                        break;

                    case 'isDefaultBilling':
                        fieldValue = fieldValue !== defaultValues.isDefaultBilling ? 'T' : 'F';
                        break;

                    case 'isResidential':
                        fieldValue = fieldValue !== defaultValues.isResidential ? 'T' : 'F';
                        break;

                    default:
                        break;
                }

                if (fieldSubKey) {
                    try {
                        newCustomer.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: fieldSubKey, value: fieldValue });
                    } catch (e) {
                        throw error.create({ name: e.name, message: e.message });
                    }
                }
            });

            var lineSubRecord = newCustomer.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress', line: i });

            if (lineSubRecord) {

                util.each(objAddrKey, function (key) {
                    var fieldKey = defaultValues.addressFieldsMap[key];
                    var fieldValue = addrElement[key];

                    if (fieldKey) {
                        try {
                            lineSubRecord.setValue({ fieldId: fieldKey, value: fieldValue });
                        } catch (e) {
                            throw error.create({ name: e.name, message: e.message });
                        }
                    }
                });
            }

            newCustomer.commitLine({ sublistId: 'addressbook', line: i });
        }

        //Update Sales Person
        for (var i = 0; i < objValues.salesTeam.length; i++) {
            const salesTeamElement = objValues.salesTeam[i];

            var objAddrKey = Object.keys(salesTeamElement);
            var numLines = newCustomer.getLineCount({ sublistId: 'salesteam' });

            for (var j = 0; j < numLines; j++) {
                newCustomer.removeLine({ sublistId: 'salesteam', line: 0, ignoreRecalc: true });
            }

            newCustomer.selectLine({ sublistId: 'salesteam', line: i });
            newCustomer.setCurrentSublistText({ sublistId: 'salesteam', fieldId: 'employee', text: salesTeamElement['salesPerson'] });
            newCustomer.setCurrentSublistText({ sublistId: 'salesteam', fieldId: 'salesrole', text: salesTeamElement['salesRole'] ? salesTeamElement['salesRole'] : 'Sales Rep' });
            newCustomer.setCurrentSublistValue({ sublistId: 'salesteam', fieldId: 'isprimary', value: salesTeamElement['isprimary'] });
            newCustomer.setCurrentSublistValue({ sublistId: 'salesteam', fieldId: 'contribution', value: salesTeamElement['contribution'] });
            newCustomer.commitLine({ sublistId: 'salesteam', line: i });
        }
    }

    return {
        post: exec
    }
});