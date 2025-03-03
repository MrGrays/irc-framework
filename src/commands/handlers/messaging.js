'use strict';

var _ = {
    each: require('lodash/each'),
    find: require('lodash/find'),
};
var util = require('util');

var handlers = {
    NOTICE: function(command) {
        var time = command.getServerTime();
        var message = command.params[command.params.length - 1];
        var target = command.params[0];
        var target_group;
        var notice_from_server = false;

        if ((message.charAt(0) === '\x01') && (message.charAt(message.length - 1) === '\x01')) {
            // It's a CTCP response
            this.emit('ctcp response', {
                nick: command.nick,
                ident: command.ident,
                hostname: command.hostname,
                target: target,
                type: (message.substring(1, message.length - 1).split(' ') || [null])[0],
                message: message.substring(1, message.length - 1),
                time: time
            });
        } else {
            var parsed_target = this.network.extractTargetGroup(target);
            if (parsed_target) {
                target = parsed_target.target;
                target_group = parsed_target.target_group;
            }

            notice_from_server = (
                command.prefix === this.network.server ||
                !this.connection.registered
            );

            this.emit('notice', {
                from_server: notice_from_server,
                nick: command.nick || undefined,
                ident: command.ident,
                hostname: command.hostname,
                target: target,
                group: target_group,
                message: message,
                tags: command.tags,
                time: time,
                account: command.getTag('account')
            });
        }
    },


    PRIVMSG: function(command) {
        var time = command.getServerTime();
        var message = command.params[command.params.length - 1];
        var target = command.params[0];
        var target_group;

        var parsed_target = this.network.extractTargetGroup(target);
        if (parsed_target) {
            target = parsed_target.target;
            target_group = parsed_target.target_group;
        }

        if ((message.charAt(0) === '\x01') && (message.charAt(message.length - 1) === '\x01')) {
            // CTCP request
            var ctcp_command = message.slice(1, -1).split(' ')[0].toUpperCase();
            if (ctcp_command === 'ACTION') {
                this.emit('action', {
                    nick: command.nick,
                    ident: command.ident,
                    hostname: command.hostname,
                    target: target,
                    group: target_group,
                    message: message.substring(8, message.length - 1),
                    tags: command.tags,
                    time: time,
                    account: command.getTag('account')
                });

            } else if (ctcp_command === 'VERSION' && this.connection.options.version) {
                this.connection.write(util.format(
                    'NOTICE %s :\x01VERSION %s\x01',
                    command.nick,
                    this.connection.options.version
                ));

            } else if (ctcp_command === 'CLIENTINFO') {
                this.connection.write(util.format(
                    'NOTICE %s :\x01CLIENTINFO VERSION\x01',
                    command.nick
                ));

            } else {
                this.emit('ctcp request', {
                    nick: command.nick,
                    ident: command.ident,
                    hostname: command.hostname,
                    target: target,
                    group: target_group,
                    type: ctcp_command || null,
                    message: message.substring(1, message.length - 1),
                    time: time,
                    account: command.getTag('account')
                });
            }
        } else {
            this.emit('privmsg', {
                nick: command.nick,
                ident: command.ident,
                hostname: command.hostname,
                target: target,
                group: target_group,
                message: message,
                tags: command.tags,
                time: time,
                account: command.getTag('account')
            });
        }
    },
    TAGMSG: function(command) {
        let time = command.getServerTime();
        let target = command.params[0];
        this.emit('tagmsg', {
            nick: command.nick,
            ident: command.ident,
            hostname: command.hostname,
            target: target,
            tags: command.tags,
            time: time
        });
    },

    RPL_WALLOPS: function(command) {
        this.emit('wallops', {
            from_server: false,
            nick: command.nick,
            ident: command.ident,
            hostname: command.hostname,
            message: command.params[command.params.length - 1],
            account: command.getTag('account')
        });
    }
};

module.exports = function AddCommandHandlers(command_controller) {
    _.each(handlers, function(handler, handler_command) {
        command_controller.addHandler(handler_command, handler);
    });
};
