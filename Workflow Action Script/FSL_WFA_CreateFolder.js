/**
 *@NApiVersion 2.1
 *@NScriptType WorkflowActionScript
 *@NAuthor Sujee
 */
define([
    'N/record'
    , '/SuiteScripts/Util/SU_SL_Preference.js'
], function (record, SU_SL_Preference) {

    let webPref = {}
        , recordId;

    const onAction = (scriptContext) => {
        recordId = scriptContext.newRecord.id;
        webPref = SU_SL_Preference.onRequest(scriptContext)

        let folderName = scriptContext.newRecord.getValue('custentity_su_brn').replace(/[^\w\s]/gi, '').trim() + '_' + recordId
            , folderId = _createFolder(folderName);

        if (folderId) {
            record.submitFields({
                type: record.Type.CUSTOMER,
                id: recordId,
                values: {
                    'custentity_su_sup_folder': folderId
                    , 'custentity_su_sup_folder_path': webPref.entity_folder_path + folderName + '/'
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }
    }

    const _createFolder = (folderName) => {
        let newSupFolder = record.create({ type: record.Type.FOLDER, isDynamic: true });
        newSupFolder.setValue({ fieldId: 'parent', value: webPref.entity_folder_id });
        newSupFolder.setValue({ fieldId: 'name', value: folderName });
        let fId = newSupFolder.save({ enableSourcing: true, ignoreMandatoryFields: true });

        log.debug('fId', fId);

        return fId;
    }

    return {
        onAction: onAction
    }
});
