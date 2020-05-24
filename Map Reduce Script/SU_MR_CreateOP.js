/**
 *@NApiVersion 2.0
 *@NScriptType MapReduceScript
 *@NAuthor Sujee
 */
define([
    'N/search',
    'N/record',
    'N/runtime',
    'N/config',
    'N/format'
], function (search, record, runtime, config, format) {

    var defaultValues = {
        taskType: 2, //Sales Visit
        approvedStatus: 2
    };

    function getInputData() {
        var scriptObj = runtime.getCurrentScript();
        var jsonParams = {
            parentId: scriptObj.getParameter({ name: 'custscript_su_mr2_cot_itineraryid' })
        };
        log.debug('jsonParams', jsonParams);

        var filters = [
            search.createFilter({ name: 'custrecord_su_itinerary_status', join: 'custrecord_su_header', operator: search.Operator.IS, values: defaultValues.approvedStatus }),
            search.createFilter({
                name: 'formulanumeric'
                , operator: search.Operator.GREATERTHAN, values: 0
                , formula: 'NVL2({custrecord_su_oppor_no},0,1) + NVL2({custrecord_su_task_no},0,1)'
            })
        ];
        if (jsonParams.parentId) {
            filters.push({ name: 'custrecord_su_header', operator: search.Operator.IS, values: jsonParams.parentId });
        }
        log.debug('filters', filters);

        return search.create({
            type: 'customrecord_su_itinerary_details',
            columns: [
                search.createColumn({ name: 'custrecord_su_employee', join: 'custrecord_su_header' })
                , search.createColumn({ name: 'internalid' })
                , search.createColumn({ name: 'name' })
                , search.createColumn({ name: 'custrecord_su_expectedclosedate' })
                , search.createColumn({ name: 'custrecord_su_cust' })
                , search.createColumn({ name: 'custrecord_su_contact' })
                , search.createColumn({ name: 'custrecord_su_phone_number' })
                , search.createColumn({ name: 'custrecord_su_address' })
                , search.createColumn({ name: 'custrecord_su_oppor_no' })
                , search.createColumn({ name: 'custrecord_su_task_no' })
                , search.createColumn({ name: 'custrecord_su_projectedtotal' })
                , search.createColumn({ name: 'custrecord_su_det_mileage' })
                , search.createColumn({ name: 'custrecord_su_det_comt' })
            ],
            filters: filters
        });
    }

    function map(mapContext) {
        try {
            log.debug('mapContext', JSON.stringify(mapContext));
            var searchRow = JSON.parse(mapContext.value);
            mapContext.write({
                key: searchRow.id,
                value: {
                    id: searchRow.id
                    , recordType: searchRow.recordType
                    , assignedTo: searchRow.values['custrecord_su_employee.custrecord_su_header'].value
                    , name: searchRow.values['name']
                    , date: searchRow.values['custrecord_su_expectedclosedate']
                    , customer: searchRow.values['custrecord_su_cust'].value
                    , contact: searchRow.values['custrecord_su_contact']
                    , phone: searchRow.values['custrecord_su_phone_number']
                    , address: searchRow.values['custrecord_su_address']
                    , opportunity: searchRow.values['custrecord_su_oppor_no'].value
                    , task: searchRow.values['custrecord_su_task_no'].value
                    , projectedTotal: searchRow.values['custrecord_su_projectedtotal']
                    , mileage: searchRow.values['custrecord_su_det_mileage'] || 0
                    , comment: searchRow.values['custrecord_su_det_comt'] || ' '
                }
            });
        } catch (e) {
            log.error('Map unexpected error:', 'value:' + mapContext.value + ' e:' + e.toString());
        }
    }

    function reduce(reduceContext) {
        log.debug('reduceContext', JSON.stringify(reduceContext));
        log.debug('reduceContext.values.length', reduceContext.values.length);
        log.debug('reduceContext.values[0]', JSON.parse(reduceContext.values[0]));

        var refDetails = JSON.parse(reduceContext.values[0])
            , oppId = refDetails.opportunity
            , taskId = refDetails.task
            , recOpp, recTask, taskLookup;

        var pref = config.load({ type: config.Type.USER_PREFERENCES })
            , tzFormat = pref.getValue({ fieldId: 'TIMEZONE' });
        refDetails.date = format.parse({ value: refDetails.date, type: format.Type.DATE, timezone: tzFormat });

        //Create Opportunity
        if (!oppId) {
            recOpp = record.create({ type: record.Type.OPPORTUNITY, isDynamic: true });

            recOpp.setValue({ fieldId: 'entity', value: refDetails.customer, ignoreFieldChange: true });
            recOpp.setValue({ fieldId: 'expectedclosedate', value: refDetails.date });
            recOpp.setValue({ fieldId: 'projectedtotal', value: refDetails.projectedTotal });
            recOpp.setValue({ fieldId: 'custbody_su_det', value: refDetails.id });

            //New Opportunity Record's Sales Team
            recOpp.selectNewLine({ sublistId: 'salesteam' });
            recOpp.setCurrentSublistValue({ sublistId: 'salesteam', fieldId: 'employee', value: refDetails.assignedTo });
            recOpp.setCurrentSublistText({ sublistId: 'salesteam', fieldId: 'salesrole', text: 'Sales Rep' });
            recOpp.setCurrentSublistValue({ sublistId: 'salesteam', fieldId: 'isprimary', value: true });
            recOpp.setCurrentSublistValue({ sublistId: 'salesteam', fieldId: 'contribution', value: 100 });
            recOpp.commitLine({ sublistId: 'salesteam' });

            oppId = recOpp.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.debug('Opportunity: ', oppId);
        }

        //Create Task
        if (!taskId) {
            recTask = record.create({ type: record.Type.TASK, isDynamic: true });

            recTask.setValue({ fieldId: 'title', value: oppId + ' | ' + refDetails.customer });
            recTask.setValue({ fieldId: 'custevent1', value: defaultValues.taskType });
            recTask.setValue({ fieldId: 'assigned', value: refDetails.assignedTo });
            recTask.setValue({ fieldId: 'company', value: refDetails.customer });
            recTask.setValue({ fieldId: 'transaction', value: oppId });
            recTask.setValue({ fieldId: 'startdate', value: refDetails.date });
            recTask.setValue({ fieldId: 'custevent_su_task_milge', value: refDetails.mileage || 0 });
            recTask.setValue({ fieldId: 'message', value: refDetails.comment });

            taskId = recTask.save({ enableSourcing: true, ignoreMandatoryFields: true });
            log.debug('Task: ', taskId);

            taskLookup = search.lookupFields({
                type: record.Type.TASK
                , id: taskId
                , columns: ['custevent_su_crm_action']
            });
        }

        // Update Itinerary Detail Values
        if (taskId && oppId && taskLookup && taskLookup.custevent_su_crm_action[0].value) {
            record.submitFields({
                type: refDetails.recordType
                , id: refDetails.id
                , values: {
                    'custrecord_su_oppor_no': oppId,
                    'custrecord_su_task_no': taskId,
                    'custrecord_su_crm_no': taskLookup.custevent_su_crm_action[0].value
                }
                , options: { enableSourcing: false, ignoreMandatoryFields: true }
            });
        } else {
            if (taskId)
                record.delete({ type: record.Type.TASK, id: taskId });

            if (oppId)
                record.delete({ type: record.Type.OPPORTUNITY, id: oppId });

        }
    }

    function summarize(summary) {

        var type = summary.toString();
        log.audit(type + ' Usage Consumed', summary.usage);
        log.audit(type + ' Concurrency Number ', summary.concurrency);
        log.audit(type + ' Number of Yields', summary.yields);

        summary.mapSummary.errors.iterator().each(function (key, error) {
            log.error('Map Error: ' + key, error);
            return true;
        });

        summary.reduceSummary.errors.iterator().each(function (key, error) {
            log.error('Reduce Error: ' + key, error);
            return true;
        });
    }

    function getItinerarySearch(headerId) {
        return search.create({
            type: 'customrecord_su_itinerary_details',
            columns: [
                search.createColumn({ name: 'custrecord_su_employee', join: 'custrecord_su_header' })
                , search.createColumn({ name: 'internalid' })
                , search.createColumn({ name: 'name' })
                , search.createColumn({ name: 'custrecord_su_expectedclosedate' })
                , search.createColumn({ name: 'custrecord_su_cust' })
                , search.createColumn({ name: 'custrecord_su_contact' })
                , search.createColumn({ name: 'custrecord_su_phone_number' })
                , search.createColumn({ name: 'custrecord_su_address' })
                , search.createColumn({ name: 'custrecord_su_oppor_no' })
                , search.createColumn({ name: 'custrecord_su_task_no' })
                , search.createColumn({ name: 'custrecord_su_projectedtotal' })
                , search.createColumn({ name: 'custrecord_su_det_mileage' })
                , search.createColumn({ name: 'custrecord_su_det_night_out' })
            ],
            filters: [
                search.createFilter({
                    name: 'custrecord_su_header'
                    , operator: search.Operator.IS
                    , values: headerId
                }),
                search.createFilter({
                    name: 'formulanumeric'
                    , formula: 'CASE WHEN {custrecord_su_oppor_no} IS NULL OR {custrecord_su_task_no} IS NULL THEN 1 ELSE 0 END'
                    , operator: search.Operator.GREATERTHAN
                    , values: 0
                })
            ]
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});