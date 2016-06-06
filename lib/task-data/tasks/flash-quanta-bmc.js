// Copyright 2015, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Flash Quanta BMC',
    injectableName: 'Task.Linux.Flash.Quanta.Bmc',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        file: null,
        downloadDir: '/opt/downloads',
        filePath: '{{ api.files }}',
        nodeId: '{{ task.nodeId }}',
        commands: [
            {
                downloadUrl: '/api/1.1/templates/flash_quanta_bmc.sh',
                command: 'sudo ./flash_quanta_bmc.sh'
            }
        ]
    },
    properties: {
        flash: {
            type: 'bmc',
            vendor: {
                quanta: { }
            }
        }
    }
};
