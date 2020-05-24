/**
 *@NApiVersion 2.0
 *@NScriptType Suitelet
 *@NAuthor Sujee
 */
define([
    'N/search',
    'N/ui/serverWidget',
    'N/record'
], function (search, serverWidget, record) {

    var request
        , response
        , params;

    var employee
        , empName
        , fromDate
        , toDate
        , supervisor
        , supervisorName
        , route
        , status
        , statusName
        , recordId
        , paramRegion
        , regionName
        , tranid
        , paramRemark
        , data
        , lineList;

    function onRequest(context) {

        request = context.request;
        response = context.response;
        params = request.parameters;
        data = request.body;

        if (params.action === 'contact') {
            response.write(JSON.stringify(_getCustomerContact(params.cusId)))
            return;
        }

        data = data ? JSON.parse(data) : [];

        log.debug('params', params);
        log.debug('data', data);

        var itineraryRecSearch = search.load('customsearch_itinerary_rcd');
        itineraryRecSearch.filters.push(search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: params.recordId }));
        var results = itineraryRecSearch.run().getRange({ start: 0, end: 1 });

        log.debug('results', results);

        if (results.length > 0) {
            tranid = results[0].getValue({ name: 'name' }) || '';
            employee = results[0].getValue({ name: 'custrecord_su_employee' }) || '';
            empName = results[0].getText({ name: 'custrecord_su_employee' }) || '';
            fromDate = results[0].getValue({ name: 'custrecord_su_from_date' }) || '';
            toDate = results[0].getValue({ name: 'custrecord_su_to_date' }) || '';
            supervisor = results[0].getValue({ name: 'custrecord_su_supervisor' }) || '';
            supervisorName = results[0].getText({ name: 'custrecord_su_supervisor' }) || '';
            route = params.route || results[0].getText({ name: 'custrecord_su_route' }) || '';
            status = results[0].getValue({ name: 'custrecord_su_itinerary_status' }) || '';
            statusName = results[0].getText({ name: 'custrecord_su_itinerary_status' }) || '';
            recordId = results[0].id || '';
            paramRegion = results[0].getValue({ name: 'custrecord_su_ith_region' }) || '';
            regionName = results[0].getText({ name: 'custrecord_su_ith_region' }) || '';
            paramRemark = results[0].getValue({ name: 'custrecord_su_rem' }) || '';

            lineList = params.action == 'fieldChange' ? [] : _getOldILineData(recordId)
        } else {
            response.write(JSON.stringify({
                DATA: 'INVALID_DATA', MESSAGE: 'Invalid itinerary record'
            }));
        }

        if (request.method === 'GET') _fetchList();

    }

    function _fetchList() {

        var form = serverWidget.createForm({ title: 'Itinerary', hideNavBar: false });

        form.clientScriptFileId = 19790;

        var fldInternalId = form.addField({ id: 'custpage_internalid', type: serverWidget.FieldType.TEXT, label: 'Parent' });
        fldInternalId.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
        fldInternalId.defaultValue = recordId;

        var fldID = form.addField({ id: 'custpage_tranid', type: serverWidget.FieldType.TEXT, label: 'ID' });
        fldID.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldID.defaultValue = tranid;

        var fldEmployee = form.addField({ id: 'custpage_employee', type: serverWidget.FieldType.TEXT, label: 'Employee' });
        fldEmployee.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldEmployee.defaultValue = empName;

        var fldSupervisor = form.addField({ id: 'custpage_supervisor', type: serverWidget.FieldType.TEXT, label: 'Supervisor' });
        fldSupervisor.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldSupervisor.defaultValue = supervisorName;

        var fldFromDate = form.addField({ id: 'custpage_from_date', type: serverWidget.FieldType.TEXT, label: 'From Date' });
        fldFromDate.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldFromDate.defaultValue = fromDate;
        fldFromDate.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });

        var fldToDate = form.addField({ id: 'custpage_to_date', type: serverWidget.FieldType.TEXT, label: 'To Date' });
        fldToDate.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldToDate.defaultValue = toDate;

        log.debug('route12', route);
        var fldRoute = form.addField({ id: 'custpage_route', type: serverWidget.FieldType.SELECT, label: 'Route' });

        var routeList = _getRouteList();
        fldRoute.addSelectOption({ value: ' ', text: ' ' });
        for (var i = 0; i < routeList.length; i++) {
            var routeCode = routeList[i].getValue({ 'name': 'internalid' });
            var routeName = routeList[i].getValue({ 'name': 'name' }) + ' ' + routeList[i].getValue({ 'name': 'altname' });

            fldRoute.addSelectOption({ value: routeCode, text: routeName });
        }
        fldRoute.defaultValue = _getRouteId();

        var fldRegion = form.addField({ id: 'custpage_region', type: serverWidget.FieldType.TEXT, label: 'Region' });
        fldRegion.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldRegion.defaultValue = regionName;

        var fldStatus = form.addField({ id: 'custpage_status', type: serverWidget.FieldType.TEXT, label: 'Status' });
        fldStatus.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldStatus.defaultValue = statusName;
        fldStatus.updateBreakType({ breakType: serverWidget.FieldBreakType.STARTCOL });


        var fldRemark = form.addField({ id: 'custpage_remark', type: serverWidget.FieldType.TEXTAREA, label: 'Remark' });
        fldRemark.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        fldRemark.defaultValue = paramRemark;

        //Sublist
        var itinerarySublist = form.addSublist({ id: 'custpage_itinerary_sublist', type: serverWidget.SublistType.INLINEEDITOR, label: 'Visits' });

        var lineDate = itinerarySublist.addField({ id: 'custpage_date', label: 'Date', type: serverWidget.FieldType.DATE });
        lineDate.isMandatory = true
        lineDate.defaultValue = new Date();

        var lineCustomer = itinerarySublist.addField({ id: 'custpage_customer', label: 'Customer', type: serverWidget.FieldType.SELECT });
        lineCustomer.isMandatory = true

        var cusList = _customerList();
        lineCustomer.addSelectOption({ value: ' ', text: ' ' });
        for (var i = 0; i < cusList.length; i++)
            lineCustomer.addSelectOption({ value: cusList[i].getValue({ 'name': 'internalid' }), text: cusList[i].getValue({ 'name': 'entityid' }) });


        var linePhone = itinerarySublist.addField({ id: 'custpage_phone', label: 'Phone', type: serverWidget.FieldType.TEXT });
        linePhone.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
        var lineAddress = itinerarySublist.addField({ id: 'custpage_address', label: 'Address', type: serverWidget.FieldType.TEXT });
        lineAddress.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
        var lineContact = itinerarySublist.addField({ id: 'custpage_contact', label: 'Contact', type: serverWidget.FieldType.TEXT });
        lineContact.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
        var lineProjectedtotal = itinerarySublist.addField({ id: 'custpage_projected_total', label: 'Projected Value', type: serverWidget.FieldType.FLOAT });
        lineProjectedtotal.isMandatory = true;

        var lineMileage = itinerarySublist.addField({ id: 'custpage_mileage', label: 'Mileage', type: serverWidget.FieldType.FLOAT });
        var lineComment = itinerarySublist.addField({ id: 'custpage_comment', label: 'Comment', type: serverWidget.FieldType.TEXT });

        log.debug('lineList', lineList)

        if (lineList.length > 0) {

            for (var i = 0; i < lineList.length; i++) {
                var internal_id = lineList[i].lineList || ' ';

                itinerarySublist.setSublistValue({ id: 'custpage_customer', line: i, value: lineList[i].customer || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_date', line: i, value: lineList[i].tranDate || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_phone', line: i, value: lineList[i].phone || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_address', line: i, value: lineList[i].address || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_contact', line: i, value: lineList[i].contact || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_projected_total', line: i, value: lineList[i].projectedTotal || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_mileage', line: i, value: lineList[i].mileage || 0 });
                itinerarySublist.setSublistValue({ id: 'custpage_comment', line: i, value: lineList[i].comment || ' ' });
            }

        } else {
            var listSearch = _getLineData();

            for (var i = 0; i < listSearch.length; i++) {
                var internal_id = listSearch[i].getValue({ 'name': 'internalid' }) || ' '

                itinerarySublist.setSublistValue({ id: 'custpage_customer', line: i, value: listSearch[i].getValue({ 'name': 'custrecord_su_route_customer' }) || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_phone', line: i, value: listSearch[i].getValue({ 'name': 'custrecord_su_phone_no' }) || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_address', line: i, value: listSearch[i].getValue({ 'name': 'custrecord_su_cust_address' }) || ' ' });
                itinerarySublist.setSublistValue({ id: 'custpage_contact', line: i, value: listSearch[i].getValue({ 'name': 'custrecord_su_route_contact' }) || ' ' });
            }
        }

        form.addButton({ id: 'btnSave', label: 'Save', functionName: 'customSave' });

        response.writePage(form);
    }

    function _getEmployeeRegion() {
        var empRecord = record.load({ type: record.Type.EMPLOYEE, id: employee, isDynamic: true })
        return empRecord.getText({ fieldId: 'cseg_su_region' });
    }

    function _getRouteRegion() {
        if (!route) return '';
        var routeId = _getRouteId();
        var routeRecord = record.load({ type: 'customrecord_su_route_header', id: routeId, isDynamic: true })
        return routeRecord.getText({ fieldId: 'custrecord_su_region' });
    }

    function _getRouteId() {

        if (!route) return '';

        var routeCode = route.split(' ')[0].trim();
        var routeSearch = search.load('customsearch_route_id');

        routeSearch.filters = [
            search.createFilter({
                name: 'formulanumeric'
                , formula: "CASE  WHEN {name} = '" + routeCode + "'  THEN 1 ELSE 0 END"
                , operator: search.Operator.EQUALTO
                , values: 1
            })
        ];

        routeSearch = routeSearch.run().getRange({ start: 0, end: 100 });

        var routeId = '';

        if (routeSearch.length > 0)
            routeId = routeSearch[0].getValue({ 'name': 'internalid' })

        log.debug('routeId', routeId);

        return routeId;
    }

    function _getRouteList() {

        var regionId = _getRegionId(_getEmployeeRegion());

        if (!regionId) return [];

        var empRouteSearch = search.create({
            type: 'customrecord_su_route_header',
            columns: [
                search.createColumn({ name: 'name' })
                , search.createColumn({ name: 'altname' })
                , search.createColumn({ name: 'internalid' })
            ],
            filters: [
                search.createFilter({
                    name: 'custrecord_su_region'
                    , operator: search.Operator.IS
                    , values: regionId
                })
            ]
        }).run().getRange({
            start: 0,
            end: 1000
        });

        return empRouteSearch;

    }

    function _getRegionId(regionName) {
        var regionSearch = search.create({
            type: 'customrecord_cseg_su_region',
            filters: [
                search.createFilter({
                    name: 'formulanumeric'
                    , formula: "CASE WHEN {name} = '" + regionName + "' THEN 1 ELSE 0 END"
                    , operator: search.Operator.EQUALTO
                    , values: 1
                })
            ],
            columns: [
                search.createColumn({ 'name': 'internalid' })
            ]
        }).run().getRange({ start: 0, end: 1000 });

        log.debug('regionSearch', regionSearch);

        if (regionSearch.length > 0) {
            return regionSearch[0].getValue({ 'name': 'internalid' })
        } else {
            return '';
        }
    }

    function _getLineData() {

        if (!route.trim()) return [];

        var routeCode = route.split(' ')[0].trim();

        var customerSearch = search.create({
            type: 'customrecord_su_route_detail'
            , columns: [
                search.createColumn({ name: 'internalid' })
                , search.createColumn({ name: 'custrecord_su_route_customer' })
                , search.createColumn({ name: 'custrecord_su_phone_no' })
                , search.createColumn({ name: 'custrecord_su_cust_address' })
                , search.createColumn({ name: 'custrecord_su_route_contact' })
            ]
            , filters: [
                search.createFilter({ name: 'custrecord_su_route_h', operator: search.Operator.IS, values: _getRouteId() })
            ]
        });
        customerSearch = customerSearch.run().getRange({ start: 0, end: 1000 });
        return customerSearch;

    }

    function _getFilter(type) {

        if (type == 'route') {
            var region = _getRouteRegion();
            if (region)
                return search.createFilter({
                    name: 'formulanumeric'
                    , formula: "CASE  WHEN {cseg_su_region} = '" + region + "'  THEN 1 ELSE 0 END"
                    , operator: search.Operator.EQUALTO
                    , values: 1
                });
        }

        if (type == 'customer') {
            var region = _getEmployeeRegion();
            if (region)
                return search.createFilter({
                    name: 'formulanumeric'
                    , formula: "CASE  WHEN {cseg_su_region} LIKE '%" + region + "%'  THEN 1 ELSE 0 END"
                    , operator: search.Operator.EQUALTO
                    , values: 1
                });
        }

        return '';

    }

    function _customerList() {

        var customerListSearch = search.create({
            type: search.Type.CUSTOMER,
            columns: [
                search.createColumn({ name: 'internalid' })
                , search.createColumn({ name: 'entityid' })
            ]
        });

        customerListSearch.filters = _getFilter('customer');

        return customerListSearch.run().getRange({ start: 0, end: 1000 });
    }

    function _getOldILineData(parentId) {

        var oldItemSearch = search.create({
            type: 'customrecord_su_itinerary_details'
            , columns: [
                search.createColumn({ name: 'internalid' })
                , search.createColumn({ name: 'custrecord_su_it_header' })
                , search.createColumn({ name: 'custrecord_su_it_cust' })
                , search.createColumn({ name: 'custrecord_su_it_phone_number' })
                , search.createColumn({ name: 'custrecord_su_it_address' })
                , search.createColumn({ name: 'custrecord_su_it_projectedtotal' })
                , search.createColumn({ name: 'custrecord_su_it_contact' })
                , search.createColumn({ name: 'custrecord_su_it_expectedclosedate' })
                , search.createColumn({ name: 'custrecord_su_itin_det_mileage' })
                , search.createColumn({ name: 'custrecord_su_itin_det_comt' })
            ]
            , filters: [
                search.createFilter({
                    name: 'custrecord_su_it_header'
                    , operator: search.Operator.IS
                    , values: parentId
                })
            ]
        }).run().getRange({ start: 0, end: 1000 });

        var lineList = [];

        for (var i = 0; i < oldItemSearch.length; i++) {
            lineList.push({
                'internalid': oldItemSearch[i].getValue({ name: 'internalid' })
                , 'parent': oldItemSearch[i].getValue({ name: 'custrecord_su_it_header' })
                , 'customer': oldItemSearch[i].getValue({ name: 'custrecord_su_it_cust' })
                , 'phone': oldItemSearch[i].getValue({ name: 'custrecord_su_it_phone_number' })
                , 'address': oldItemSearch[i].getValue({ name: 'custrecord_su_it_address' })
                , 'projectedTotal': oldItemSearch[i].getValue({ name: 'custrecord_su_it_projectedtotal' })
                , 'contact': oldItemSearch[i].getValue({ name: 'custrecord_su_it_contact' })
                , 'tranDate': oldItemSearch[i].getValue({ name: 'custrecord_su_it_expectedclosedate' })
                , 'mileage': oldItemSearch[i].getValue({ name: 'custrecord_su_itin_det_mileage' })
                , 'comment': oldItemSearch[i].getValue({ name: 'custrecord_su_itin_det_comt' })
            });
        }
        return lineList;
    }

    function _getCustomerContact(cusId) {
        var customerSearch = search.create({
            type: search.Type.CUSTOMER,
            columns: [
                search.createColumn({ name: 'phone' })
                , search.createColumn({ name: 'address' })
                , search.createColumn({ name: 'contact' })
            ],
            filters: [
                search.createFilter({
                    name: 'internalid'
                    , operator: search.Operator.IS
                    , values: cusId
                })
            ]
        }).run().getRange({
            start: 0,
            end: 1
        });

        if (customerSearch.length > 0) {
            return {
                phoneNo: customerSearch[0].getValue({ name: 'phone' })
                , address: customerSearch[0].getValue({ name: 'address' })
                , contact: customerSearch[0].getValue({ name: 'contact' })
            }
        }
        return { phoneNo: '', address: '', contact: '' };
    }

    return {
        onRequest: onRequest
    }
});