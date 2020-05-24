/**
 *@NApiVersion 2.0
 *@NScriptType ScheduledScript
 *@NAuthor Sujee
 */
define([
    'N/task',
    'N/record',
    'N/file',
    'N/runtime'
], function (task, record, file, runtime) {

    function execute(context) {

        var scriptObj = runtime.getCurrentScript();

        var jsonParams = {
            fileId: scriptObj.getParameter({ name: 'custscript_file_id' })
            , mappingId: scriptObj.getParameter({ name: 'custscript_mapping_id' })
            , csvRecordId: scriptObj.getParameter({ name: 'custscript_item_upload_id' })
        };

        var defaultValues = {
            stage: 2 //In Progress
            , scheduleTaskScriptId: 'customscript_su_ss_bulk_status'
            , scheduleTaskdeployId: 'customdeploy_su_ss_bulk_status'
        }

        try {
            //Schedule CSV Import Task
            var scriptTask = task.create({ taskType: task.TaskType.CSV_IMPORT });
            scriptTask.mappingId = jsonParams.mappingId;
            scriptTask.importFile = file.load({ id: jsonParams.fileId });
            scriptTask.name = scriptTask.importFile.name;
            var csvImportTaskId = scriptTask.submit();

            log.debug('csvImportTaskId', csvImportTaskId);

            //Check Status
            var taskStatus = task.checkStatus({ taskId: csvImportTaskId });
            log.debug('taskStatus', taskStatus);
            taskStatus = JSON.parse(JSON.stringify(taskStatus));

            //Update Item Upload Record
            record.submitFields({
                type: 'customrecord_su_itm_upld',
                id: jsonParams.csvRecordId,
                values: {
                    'custrecord_su_itm_upld_csv_job': JSON.stringify(taskStatus)
                    , 'custrecord_su_itm_upld_job_id': csvImportTaskId
                    , 'custrecord_su_itm_upld_job_status': taskStatus.status
                    , 'custrecord_su_itm_upld_stg': defaultValues.stage
                }
            });

        } catch (error) {
            log.error('error', error);
        }
    }

    return {
        execute: execute
    }
});
