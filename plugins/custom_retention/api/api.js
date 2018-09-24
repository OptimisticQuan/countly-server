var plugin = {},
    plugins = require('../../pluginManager.js'),
    moment = require('moment-timezone'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
	common = require('../../../api/utils/common.js');
/*
custom_retention{appId}:
{
    yyyy:m:{
        1:{
            0: c,   //yyyy年m月1日 新增用户数c
            1: c,   //yyyy年m月1日 次日留存用户c
            30: c   //yyyy年m月1日 30日留存用户c
        }
    }
}
*/
(function (plugin) {
    
    plugins.register("/session/retention", function(ob){
        var params = ob.params;
        var appId = params.app_id;
        var afterAppUser = params.app_user;
        var beforeAppUser = ob.user;
        var isNewUser = ob.isNewUser;
        var afterLastSeenTimeObj = common.initTimeObj(params.appTimezone, afterAppUser[common.dbUserMap['last_seen']]);
        var firstSeenTimeObj = common.initTimeObj(params.appTimezone, afterAppUser[common.dbUserMap['first_seen']]);
        var days = null;
        if (isNewUser) {
            days = '0';
        } else {
            var beforeLastSeenTimeObj = common.initTimeObj(params.appTimezone, beforeAppUser[common.dbUserMap['last_seen']]);
            if(afterLastSeenTimeObj.now.isSame(beforeLastSeenTimeObj.now, 'day')) {
                //user today has calc retention;
                return;
            }
            var dayCount = afterLastSeenTimeObj.now.diff(firstSeenTimeObj.now, 'days');
            if (dayCount < 0 || dayCount > 30) {
                //invalid or useless data;
                return;
            }
            days = '' + dayCount;
        }
        var keyYearMonth = firstSeenTimeObj.yearly + ":" + firstSeenTimeObj.month;
        var keyDateDay = firstSeenTimeObj.day;
        var updateKey = keyDateDay + "." + days;
        var updateObj = {'$inc':{}};
        updateObj["$inc"][updateKey]=1;
        common.db.collection('custom_retention' + appId).update({_id: keyYearMonth}, updateObj, {'upsert': true}, function(err, res) {});
    });
    
    plugins.register("/o", function(ob){
		var params = ob.params;
		var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
		if (params.qstring.method == "custom_retention") {
			validateUserForDataReadAPI(params, function(){
                var periodObj = countlyCommon.getPeriodObj(params);
                var appId = params.app_id;
                
                common.db.collection('custom_retention' + appId).find({'_id': {$in: periodObj.reqMonthDbDateIds}}).toArray(function(err, monthAry) {
                    var monthObj = {};
                    for (var i=0; i<monthAry.length; i++) {
                        monthObj[monthAry[i]._id] = monthAry[i];
                    }
                    var now = params.time.now.clone();
                    var baseMaxDayCount = moment.duration(now.add(now.utcOffset(), "minutes").valueOf() - periodObj.start, 'ms').asDays();
                    var retData = [];
                    for (var i=0; i<periodObj.currentPeriodArr.length; i++) {
                        var dayStr = periodObj.currentPeriodArr[i];
                        var daySS = dayStr.split('.');
                        var monthId = daySS[0]+":"+daySS[1];
                        var dateDay = daySS[2];
                        var maxDayCount = baseMaxDayCount - i;
                        var monthData = monthObj[monthId] || null;
                        var dayData = monthData == null? null : (monthData[dateDay] || null);
                        var newCount = dayData == null ? 0 : (dayData['0'] || 0);
                        var retDayData = {
                            date:dayStr,
                            new:newCount,
                            retention: []
                        };
                        for(var j=1; j<31; j++) {
                            if(j>maxDayCount) {
                                break;
                            }
                            var retentionUserCount = dayData == null ? 0:(dayData[j] || 0);
                            var retention = 0;
                            if(newCount != 0) {
                                retention = retentionUserCount/newCount;
                            }
                            retDayData.retention.push(retention);
                        }
                        retData.push(retDayData);
                    }
                    common.returnOutput(params, retData);
                });
            });
			return true;
		}
		return false;
	});
    
	
	plugins.register("/i/apps/delete", function(ob){
		var appId = ob.appId;
		common.db.collection('custom_retention' + appId).drop(function() {});
	});
    
    plugins.register("/i/apps/clear_all", function(ob){
		var appId = ob.appId;
		common.db.collection('custom_retention' + appId).drop(function() {});
	});
    
	
	plugins.register("/i/apps/reset", function(ob){
		var appId = ob.appId;
		common.db.collection('custom_retention' + appId).drop(function() {});
    });
    
    plugins.register("/i/app_users/delete", function(ob){
		var appId = ob.app_id;
		var uids = ob.uids;
        if(uids && uids.length){
            common.db.collection("custom_retention" +  appId).remove({uid:{$in:uids}}, function(err) {});
        }
    });
}(plugin));

module.exports = plugin;