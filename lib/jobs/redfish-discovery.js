// Copyright 2016, EMC, Inc.

'use strict';

var di = require('di'),
    urlParse = require('url-parse');

module.exports = RedfishDiscoveryJobFactory;
di.annotate(RedfishDiscoveryJobFactory, new di.Provide('Job.Redfish.Discovery'));
di.annotate(RedfishDiscoveryJobFactory, new di.Inject(
    'Job.Base',
    'Logger',
    'Promise',
    'Assert',
    'Util',
    'Services.Waterline',
    'Services.Encryption',
    '_',
    'JobUtils.RedfishTool'
));

function RedfishDiscoveryJobFactory(
    BaseJob,
    Logger,
    Promise,
    assert,
    util,
    waterline,
    encryption,
    _,
    RedfishTool
) {
    var logger = Logger.initialize(RedfishDiscoveryJobFactory);

    /**
     * @param {Object} options task options object
     * @param {Object} context graph context object
     * @param {String} taskId running task identifier
     * @constructor
     */
    function RedfishDiscoveryJob(options, context, taskId) {
        RedfishDiscoveryJob.super_.call(this,
                                   logger,
                                   options,
                                   context,
                                   taskId);

        assert.object(this.options);
        assert.string(this.options.uri);
        var parse = urlParse(this.options.uri);
        var protocol = parse.protocol.replace(':','').trim();
        this.settings = {
            uri: parse.href,
            host: parse.host.split(':')[0],
            root: parse.pathname + '/',
            port: parse.port,
            protocol: protocol,
            username: this.options.username,
            password: this.options.password,
            verifySSL: this.options.verifySSL || false
        };
        this.redfish = new RedfishTool();
        this.redfish.settings = this.settings;
    }
    
    util.inherits(RedfishDiscoveryJob, BaseJob);
        
    /**
     * @memberOf RedfishDiscoveryJob
     */
    RedfishDiscoveryJob.prototype._run = function() {
        var self = this;
        
        return self.getRoot()
        .then(function(root) {
            return [ root, self.createChassis(root) ];
        })
        .spread(function(root, chassis) {
            return [ chassis, self.createSystems(root) ];
        })
        .spread(function(chassis, systems) {
            self.mapPathToIdRelation(chassis, systems, 'encloses');
            return [ chassis, systems ];
        })
        .spread(function(chassis, systems) {
            return self.mapPathToIdRelation(systems, chassis, 'enclosedBy');
        })
        .then(function() {
            self._done();
        })
        .catch(function(err) {
            self._done(err);
        });
    };
    
    RedfishDiscoveryJob.prototype.upsertRelations = function(node, relations) {
        // Update existing node with new relations or create one
        return waterline.nodes.needOne(node)
        .then(function(node) {
            return waterline.nodes.updateOne(
                { id: node.id }, 
                { relations: relations }
            );
        })
        .catch(function(error) {
            if (error.name === 'NotFoundError') {
                node.relations = relations;
                return waterline.nodes.create(node);
            }
            throw error;
        });
    };
    
    /**
     * @function getRoot
     */
    RedfishDiscoveryJob.prototype.getRoot = function () {
        var rootPath = this.settings.root;
        return this.redfish.clientRequest(rootPath)
        .then(function(response) {
            return response.body;
        });
    };
    
    /**
     * @function createChassis
     * @description initiate redfish chassis discovery
     */
    RedfishDiscoveryJob.prototype.createChassis = function (root) {
        var self = this;
        
        if (!_.has(root, 'Chassis')) {
            throw new Error('No Chassis Members Found');
        }
        
        return self.redfish.clientRequest(root.Chassis['@odata.id'])
        .then(function(res) {
            assert.object(res);
            return res.body.Members;
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(chassis) {
            chassis = chassis.body;
            var systems = _.get(chassis, 'Links.ComputerSystems') ||
                          _.get(chassis, 'links.ComputerSystems');
            
            if (_.isUndefined(systems)) {
                // Log a warning and skip System to Chassis relation if no links are provided.
                logger.warning('No System members for Chassis were available');
            }
                          
            return {
                chassis: chassis || [],
                systems: systems || []
            };
        })
        .map(function(data) {
            assert.object(data);
            var targetList = [];
            
            _.forEach(data.systems, function(sys) {
                var target = _.get(sys, '@odata.id') ||
                             _.get(sys, 'href');
                targetList.push(target);
            });
            
            var config = Object.assign({}, self.settings);
            config.root = data.chassis['@odata.id'];
            var node = {
                type: 'enclosure',
                name: data.chassis.Name,
                identifiers: [ data.chassis.Id ],
                obmSettings: [{
                    config: config,
                    service: 'redfish-obm-service'
                }]
            };
            
            var relations = [{
                relationType: 'encloses',
                targets: targetList
            }];
            
            return self.upsertRelations(node, relations);
        })
        .then(function(nodes) {
            return nodes;
        });
    };
    
    /**
     * @function createSystems
     * @description initiate redfish system discovery
     */
    RedfishDiscoveryJob.prototype.createSystems = function (root) {
        var self = this;  
        
        if (!_.has(root, 'Systems')) {
            logger.warning('No System Members Found');
            return Promise.resolve();
        }
        
        return self.redfish.clientRequest(root.Systems['@odata.id'])
        .then(function(res) {
            assert.object(res);
            return res.body.Members;
        })
        .map(function(member) {
            return self.redfish.clientRequest(member['@odata.id']);
        })
        .map(function(system) {
            system = system.body;
            var chassis = _.get(system, 'Links.Chassis') || 
                          _.get(system, 'links.Chassis');
            
            if (_.isUndefined(chassis)) {
                // Log a warning and skip Chassis to System relation if no links are provided.
                logger.warning('No Chassis members for Systems were available');
            }
            
            return {
                system: system || [], 
                chassis: chassis || []
            };
        })
        .map(function(data) {
            assert.object(data);
            var targetList = [];
            
            _.forEach(data.chassis, function(chassis) { 
                var target = _.get(chassis, '@odata.id') ||
                             _.get(chassis, 'href');
                targetList.push(target);
            });
            
            var config = Object.assign({}, self.settings);
            config.root = data.system['@odata.id'];
            var node = {
                type: 'compute',
                name: data.system.Name,
                identifiers: [ data.system.Id ],
                obmSettings: [{
                    config: config,
                    service: 'redfish-obm-service'
                }]
            };
            
            var relations = [{
                relationType: 'enclosedBy',
                targets: targetList
            }];
            
            return self.upsertRelations(node, relations);
            
        }).then(function(nodes) {
            return nodes;
        });
    };
    
    /**
     * @function mapPathToIdRelation
     * @description map source node relation types to a target
     */
    RedfishDiscoveryJob.prototype.mapPathToIdRelation = function (src, target, type) {
        var self = this;
        return Promise.resolve(src)
        .map(function(node) {
            var ids = [];
            var relations = _(node.relations).find({ 
                relationType: type
            });
            
            _.forEach(target, function(t) {
                var settings = _(t.obmSettings).find({ 
                    service: 'redfish-obm-service'
                });               
                _.forEach(relations.targets, function(relation) {
                    if (relation === settings.config.root) {
                        ids.push(t.id);
                    }
                });
            });
            relations.targets = ids;
            relations = [ relations ];
            return self.upsertRelations({id: node.id}, relations);
        }); 
    };
    
    return RedfishDiscoveryJob;
}
