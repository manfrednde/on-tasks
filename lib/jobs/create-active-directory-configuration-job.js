// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di');

module.exports = enableActiveDirectoryConfigJobFactory;
di.annotate(enableActiveDirectoryConfigJobFactory, new di.Provide('Job.Active.Directory.Configuration'));
di.annotate(enableActiveDirectoryConfigJobFactory, new di.Inject(
    'Logger',
    'Job.Base',
    'Services.Waterline',
    'Assert',
    'Promise',
    'ChildProcess'
));

function enableActiveDirectoryConfigJobFactory(
    Logger,
    BaseJob,
    waterline,
    assert,
    ChildProcess
){


    var logger = Logger.initialize(enableActiveDirectoryConfigJobFactory);

	/**
	 *
	 * @param {Object} [options]
	 * @constructor
	 */
	function EnableActiveDirectoryConfigJob(options, context, taskId) {
	    EnableActiveDirectoryConfigJob.super_.call(this, logger, options, context, taskId);
		 
		this.nodeId = context.target || options.nodeId;
		this.options = options;
		this.childProcess = undefined;
	 }
	 util.inherits(EnableActiveDirectoryConfigJob, BaseJob);
	 
	/**
     * @memberOf EnableActiveDirectoryConfigJob
     */
	EnableActiveDirectoryConfigJob.prototype.enableActiveDirectory = function(){
        return Promise.map(nodes, function(nodeId) {
            assert.isMongoId(nodeId, 'nodeId');
            return waterline.obms.findByNode(nodeId, 'ipmi-obm-service', true)
            .then(function(obmSetting) {
                if (obmSetting) {
                    return obmSetting.config;
                } else {
                    throw new Error(
                        'Required ipmi-obm-service settings are missing.'
                    );
                }
            })
            .then(function(){
				const exec = require('child_process').exec;
				exec('../on-tasks/lib/task-data/scripts/Config_Active_Directory.sh 172.18.2.236 admin admin -config-AD enable bmc.com 60 192.168.0.120 192.168.0.121 192.168.0.122');
			
			})
            .catch(function(err) {
                logger.error("Error running script");
            });			
        }
   }; 
	
	return EnableActiveDirectoryConfigJob;
 }
