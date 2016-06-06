// Copyright 2016, EMC, Inc.

'use strict';

module.exports = {
    friendlyName: 'Download AMI tools to node',
    injectableName: 'Task.Linux.DownloadAmiTools',
    implementsTask: 'Task.Base.Linux.Commands',
    options: {
        commands: [
            {
                downloadUrl: '/quanta/afulnx_64',
                command: 'sudo mkdir /opt/ami; sudo mv afulnx_64 /opt/ami;' +
                         'sudo chmod 777 /opt/ami/afulnx_64'
            },
            {
                downloadUrl: '/quanta/socflash_x64',
                command: 'sudo mkdir /opt/socflash; sudo mv socflash_x64 /opt/socflash;' +
                         'sudo chmod 777 /opt/socflash/socflash_x64'
            },
            {
                downloadUrl: '/quanta/SCELNX_64',
                command: 'sudo mkdir /opt/ami; sudo mv SCELNX_64 /opt/ami;' +
                         'sudo chmod 777 /opt/ami/SCELNX_64'
            }
        ]
    },
    properties: {}
};
