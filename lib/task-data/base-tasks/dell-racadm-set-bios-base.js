// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Dell Racadm Set BIOS base',
    injectableName: 'Task.Base.Dell.Racadm.SetBIOS',
    runJob: 'Job.Dell.RacadmTool',
    requiredOptions: [
        "action"
    ],
    requiredProperties: {},
    properties:{}
};
